const express    = require('express');
const { supabase } = require('../db/pool');
const router     = express.Router();

router.get('/areas', async (req, res, next) => {
  const { condominio_id } = req.user;
  try {
    const { data, error } = await supabase.from('areas_comunes').select('id, nombre, aforo_max, costo_reserva, duracion_bloque').eq('condominio_id', condominio_id).eq('activa', true).order('nombre');
    if (error) { return next(error); }
    res.json({ areas: data || [] });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  const { condominio_id, unidad_id, rol } = req.user;
  try {
    let query = supabase.from('reservas').select('id, inicio_at, fin_at, estado, num_personas, costo_cobrado, areas_comunes(nombre), unidades(numero)').eq('condominio_id', condominio_id).order('inicio_at', { ascending: false });
    if (rol === 'residente') { query = query.eq('unidad_id', unidad_id); }
    const { data, error } = await query;
    if (error) { return next(error); }
    res.json({ reservas: (data || []).map(r => ({ ...r, area_nombre: r.areas_comunes?.nombre, unidad_numero: r.unidades?.numero })) });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const { condominio_id, unidad_id, id: usuario_id } = req.user;
  const { area_comun_id, inicio_at, fin_at, num_personas, notas } = req.body;
  try {
    const { data: area } = await supabase.from('areas_comunes').select('costo_reserva').eq('id', area_comun_id).single();
    const { data, error } = await supabase.from('reservas').insert({
      condominio_id, unidad_id, area_comun_id, reservada_por_id: usuario_id,
      inicio_at, fin_at, num_personas: num_personas || 1, notas,
      costo_cobrado: area?.costo_reserva || 0
    }).select('id').single();
    if (error) { return next(error); }
    res.status(201).json({ reserva: data });
  } catch (err) { next(err); }
});

module.exports = router;
