const express    = require('express');
const { supabase } = require('../db/pool');
const requireRol = require('../middleware/requireRol');
const router     = express.Router();

// GET /api/reservas/areas
router.get('/areas', async (req, res, next) => {
  const { condominio_id } = req.user;
  try {
    const { data, error } = await supabase
      .from('areas_comunes')
      .select('id, nombre, aforo_max, costo_reserva, duracion_bloque, reglas_horario')
      .eq('condominio_id', condominio_id)
      .eq('activa', true)
      .order('nombre');
    if (error) { return next(error); }
    res.json({ areas: data || [] });
  } catch (err) { next(err); }
});

// GET /api/reservas — listar reservas
router.get('/', async (req, res, next) => {
  const { condominio_id, unidad_id, rol } = req.user;
  const { estado } = req.query;
  try {
    let query = supabase
      .from('reservas')
      .select(`
        id, inicio_at, fin_at, estado, num_personas, costo_cobrado, notas, created_at,
        areas_comunes(nombre),
        unidades(numero),
        usuarios!reservada_por_id(nombre, email)
      `)
      .eq('condominio_id', condominio_id)
      .order('created_at', { ascending: false });

    if (estado) { query = query.eq('estado', estado); }
    // Residentes solo ven sus propias reservas
    if (rol === 'residente') { query = query.eq('unidad_id', unidad_id); }

    const { data, error } = await query;
    if (error) { return next(error); }

    res.json({
      reservas: (data || []).map(r => ({
        ...r,
        area_nombre:    r.areas_comunes?.nombre,
        unidad_numero:  r.unidades?.numero,
        reservada_por:  r.usuarios?.nombre,
        email_residente: r.usuarios?.email
      }))
    });
  } catch (err) { next(err); }
});

// GET /api/reservas/pendientes — solo admin/conserje
router.get('/pendientes', requireRol('admin','conserje'), async (req, res, next) => {
  const { condominio_id } = req.user;
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select(`
        id, inicio_at, fin_at, estado, num_personas, costo_cobrado, notas, created_at,
        areas_comunes(nombre, aforo_max),
        unidades(numero),
        usuarios!reservada_por_id(nombre, email)
      `)
      .eq('condominio_id', condominio_id)
      .eq('estado', 'pendiente_aprobacion')
      .order('created_at', { ascending: true });
    if (error) { return next(error); }
    res.json({
      reservas: (data || []).map(r => ({
        ...r,
        area_nombre:    r.areas_comunes?.nombre,
        aforo_max:      r.areas_comunes?.aforo_max,
        unidad_numero:  r.unidades?.numero,
        reservada_por:  r.usuarios?.nombre,
        email_residente: r.usuarios?.email
      }))
    });
  } catch (err) { next(err); }
});

// POST /api/reservas — crear reserva (queda pendiente de aprobación)
router.post('/', async (req, res, next) => {
  const { condominio_id, unidad_id, id: usuario_id } = req.user;
  const { area_comun_id, inicio_at, fin_at, num_personas, notas } = req.body;

  if (!area_comun_id || !inicio_at || !fin_at) {
    return res.status(400).json({ error: 'area_comun_id, inicio_at y fin_at son obligatorios' });
  }

  try {
    // Verificar que no haya conflicto de horario con reservas confirmadas
    const { data: conflict } = await supabase
      .from('reservas')
      .select('id')
      .eq('area_comun_id', area_comun_id)
      .in('estado', ['confirmada', 'pendiente_aprobacion'])
      .lt('inicio_at', fin_at)
      .gt('fin_at', inicio_at);

    if (conflict && conflict.length > 0) {
      return res.status(409).json({ error: 'Ese horario ya está reservado o tiene una solicitud pendiente' });
    }

    const { data: area } = await supabase
      .from('areas_comunes')
      .select('costo_reserva')
      .eq('id', area_comun_id)
      .single();

    const { data, error } = await supabase
      .from('reservas')
      .insert({
        condominio_id,
        unidad_id,
        area_comun_id,
        reservada_por_id: usuario_id,
        inicio_at,
        fin_at,
        num_personas:  num_personas || 1,
        notas:         notas || null,
        costo_cobrado: area?.costo_reserva || 0,
        estado:        'pendiente_aprobacion'   // ← siempre queda pendiente
      })
      .select('id')
      .single();

    if (error) { return next(error); }

    res.status(201).json({
      reserva: data,
      mensaje: 'Solicitud enviada. La administración aprobará tu reserva en breve.'
    });
  } catch (err) { next(err); }
});

// PUT /api/reservas/:id/aprobar — admin/conserje aprueba
router.put('/:id/aprobar', requireRol('admin','conserje'), async (req, res, next) => {
  const { id } = req.params;
  const { condominio_id } = req.user;
  try {
    const { data, error } = await supabase
      .from('reservas')
      .update({ estado: 'confirmada' })
      .eq('id', id)
      .eq('condominio_id', condominio_id)
      .select('id, inicio_at, fin_at, areas_comunes(nombre), unidades(numero), usuarios!reservada_por_id(nombre, email)')
      .single();
    if (error) { return next(error); }
    res.json({ reserva: data, mensaje: 'Reserva aprobada' });
  } catch (err) { next(err); }
});

// PUT /api/reservas/:id/rechazar — admin/conserje rechaza
router.put('/:id/rechazar', requireRol('admin','conserje'), async (req, res, next) => {
  const { id } = req.params;
  const { condominio_id } = req.user;
  const { motivo } = req.body;
  try {
    const { data, error } = await supabase
      .from('reservas')
      .update({ estado: 'cancelada', notas: motivo || 'Rechazada por administración' })
      .eq('id', id)
      .eq('condominio_id', condominio_id)
      .select('id')
      .single();
    if (error) { return next(error); }
    res.json({ reserva: data, mensaje: 'Reserva rechazada' });
  } catch (err) { next(err); }
});

// PUT /api/reservas/:id/cancelar — residente cancela la suya
router.put('/:id/cancelar', async (req, res, next) => {
  const { id } = req.params;
  const { condominio_id, unidad_id, rol } = req.user;
  try {
    let query = supabase.from('reservas').update({ estado: 'cancelada' }).eq('id', id).eq('condominio_id', condominio_id);
    if (rol === 'residente') { query = query.eq('unidad_id', unidad_id); }
    const { data, error } = await query.select('id').single();
    if (error) { return next(error); }
    res.json({ reserva: data, mensaje: 'Reserva cancelada' });
  } catch (err) { next(err); }
});

module.exports = router;
