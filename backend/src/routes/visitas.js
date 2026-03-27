const express    = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../db/pool');
const requireRol = require('../middleware/requireRol');
const QRCode     = require('qrcode');
const crypto     = require('crypto');
const router     = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }
  next();
};

// GET /api/visitas
router.get('/', async (req, res, next) => {
  const { condominio_id } = req.user;
  const { estado, unidad_id, fecha } = req.query;
  const fechaFiltro = fecha || new Date().toISOString().split('T')[0];
  try {
    let query = supabase
      .from('visitas')
      .select('id, nombre_visita, rut_dni, patente, estado, entrada_at, salida_at, notas_conserje, codigo_qr, unidades!unidad_destino_id(numero)')
      .eq('condominio_id', condominio_id)
      .gte('created_at', fechaFiltro + 'T00:00:00')
      .lte('created_at', fechaFiltro + 'T23:59:59')
      .order('created_at', { ascending: false });
    if (estado) { query = query.eq('estado', estado); }
    if (unidad_id) { query = query.eq('unidad_destino_id', unidad_id); }
    const { data, error } = await query;
    if (error) { return next(error); }
    const visitas = (data || []).map(v => ({ ...v, unidad_destino: v.unidades?.numero }));
    res.json({ visitas, total: visitas.length });
  } catch (err) { next(err); }
});

// GET /api/visitas/dashboard
router.get('/dashboard', async (req, res, next) => {
  const { condominio_id } = req.user;
  const hoy = new Date().toISOString().split('T')[0];
  try {
    const [{ count: dentro }, { count: hoyCount }, { count: paquetes }, { count: tickets }] = await Promise.all([
      supabase.from('visitas').select('*', { count: 'exact', head: true }).eq('condominio_id', condominio_id).eq('estado', 'dentro'),
      supabase.from('visitas').select('*', { count: 'exact', head: true }).eq('condominio_id', condominio_id).gte('created_at', hoy + 'T00:00:00'),
      supabase.from('encomiendas').select('*', { count: 'exact', head: true }).eq('condominio_id', condominio_id).eq('estado', 'en_conserjeria'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('condominio_id', condominio_id).eq('estado', 'pendiente'),
    ]);

    // Alertas parking
    const { data: alertas } = await supabase
      .from('estacionamientos_visita')
      .select('id, max_horas, entrada_at, visitas(nombre_visita), estacionamientos(codigo), visitas!inner(unidades!unidad_destino_id(numero))')
      .eq('condominio_id', condominio_id)
      .is('salida_at', null)
      .eq('alerta_enviada', false);

    const alertasFiltradas = (alertas || []).filter(ev => {
      const mins = (Date.now() - new Date(ev.entrada_at)) / 60000;
      return mins >= (ev.max_horas * 60 - 30);
    }).map(ev => ({
      id: ev.id,
      nombre_visita: ev.visitas?.nombre_visita,
      calzo: ev.estacionamientos?.codigo,
      minutos: Math.round((Date.now() - new Date(ev.entrada_at)) / 60000),
      max_minutos: ev.max_horas * 60,
      unidad: ev.visitas?.unidades?.numero
    }));

    res.json({
      stats: { visitas_dentro: dentro || 0, visitas_hoy: hoyCount || 0, paquetes_pendientes: paquetes || 0, tickets_pendientes: tickets || 0 },
      alertas_parking: alertasFiltradas
    });
  } catch (err) { next(err); }
});

// GET /api/visitas/activas
router.get('/activas', async (req, res, next) => {
  const { condominio_id } = req.user;
  try {
    const { data, error } = await supabase
      .from('visitas')
      .select('id, nombre_visita, rut_dni, patente, entrada_at, unidades!unidad_destino_id(numero)')
      .eq('condominio_id', condominio_id)
      .eq('estado', 'dentro')
      .order('entrada_at', { ascending: false });
    if (error) { return next(error); }
    res.json({ visitas: (data || []).map(v => ({ ...v, unidad_destino: v.unidades?.numero })) });
  } catch (err) { next(err); }
});

// POST /api/visitas/entrada
router.post('/entrada', requireRol('conserje','guardia','admin'), [
  body('unidad_destino_id').isUUID(),
  body('nombre_visita').trim().notEmpty(),
  body('rut_dni').trim().notEmpty(),
], validate, async (req, res, next) => {
  const { condominio_id, id: usuario_id } = req.user;
  const { unidad_destino_id, nombre_visita, rut_dni, patente, codigo_qr, calzo_id } = req.body;
  try {
    let visita_id = null;

    // Validar QR si viene
    if (codigo_qr) {
      const { data: qrVisita } = await supabase
        .from('visitas')
        .select('id')
        .eq('codigo_qr', codigo_qr)
        .eq('condominio_id', condominio_id)
        .eq('estado', 'esperando')
        .gt('qr_expira_at', new Date().toISOString())
        .limit(1);
      if (qrVisita && qrVisita.length > 0) {
        visita_id = qrVisita[0].id;
        await supabase.from('visitas').update({ estado: 'dentro', entrada_at: new Date().toISOString(), rut_dni, patente, registrada_por_id: usuario_id }).eq('id', visita_id);
      }
    }

    // Nueva visita si no hay QR
    if (!visita_id) {
      const { data: nueva, error } = await supabase.from('visitas').insert({
        condominio_id, unidad_destino_id, nombre_visita, rut_dni,
        patente: patente || null, estado: 'dentro',
        entrada_at: new Date().toISOString(), registrada_por_id: usuario_id
      }).select('id').single();
      if (error) { return next(error); }
      visita_id = nueva.id;
    }

    // Asignar calzo
    if (calzo_id) {
      const { data: calzo } = await supabase.from('estacionamientos').select('id').eq('id', calzo_id).eq('estado', 'libre').limit(1);
      if (calzo && calzo.length > 0) {
        await supabase.from('estacionamientos_visita').insert({ condominio_id, estacionamiento_id: calzo_id, visita_id, asignado_por_id: usuario_id });
        await supabase.from('estacionamientos').update({ estado: 'ocupado' }).eq('id', calzo_id);
      }
    }

    // Audit log
    await supabase.from('audit_log').insert({ condominio_id, usuario_id, accion: 'REGISTRO_ENTRADA', tabla: 'visitas', registro_id: visita_id });

    if (req.io) { req.io.to(`condo:${condominio_id}`).emit('visita:entrada', { visita_id, nombre_visita, unidad_destino_id }); }
    res.status(201).json({ success: true, visita_id, entrada_at: new Date().toISOString() });
  } catch (err) { next(err); }
});

// PUT /api/visitas/:id/salida
router.put('/:id/salida', requireRol('conserje','guardia','admin'), async (req, res, next) => {
  const { id } = req.params;
  const { condominio_id, id: usuario_id } = req.user;
  try {
    const { data: visita } = await supabase.from('visitas').select('id, condominio_id, entrada_at').eq('id', id).eq('estado', 'dentro').limit(1);
    if (!visita || visita.length === 0) { return res.status(404).json({ error: 'Visita no encontrada o ya salió' }); }

    await supabase.from('visitas').update({ estado: 'salio', salida_at: new Date().toISOString() }).eq('id', id);

    // Liberar calzo
    const { data: ev } = await supabase.from('estacionamientos_visita').select('id, estacionamiento_id').eq('visita_id', id).is('salida_at', null).limit(1);
    if (ev && ev.length > 0) {
      await supabase.from('estacionamientos_visita').update({ salida_at: new Date().toISOString() }).eq('id', ev[0].id);
      await supabase.from('estacionamientos').update({ estado: 'libre' }).eq('id', ev[0].estacionamiento_id);
    }

    await supabase.from('audit_log').insert({ condominio_id, usuario_id, accion: 'REGISTRO_SALIDA', tabla: 'visitas', registro_id: id });
    if (req.io) { req.io.to(`condo:${condominio_id}`).emit('visita:salida', { visita_id: id }); }

    const duracion = Math.round((Date.now() - new Date(visita[0].entrada_at)) / 60000);
    res.json({ success: true, visita_id: id, salida_at: new Date().toISOString(), duracion_minutos: duracion, calzo_liberado: ev && ev.length > 0 });
  } catch (err) { next(err); }
});

// POST /api/visitas/qr
router.post('/qr', requireRol('residente'), [
  body('nombre_visita').trim().notEmpty(),
  body('rut_dni').trim().notEmpty(),
], validate, async (req, res, next) => {
  const { condominio_id, unidad_id, id: usuario_id } = req.user;
  const { nombre_visita, rut_dni, horas_valido = 24 } = req.body;
  try {
    const token = crypto.randomBytes(16).toString('hex');
    const expira = new Date(Date.now() + horas_valido * 3600000).toISOString();
    const { data: nueva, error } = await supabase.from('visitas').insert({
      condominio_id, unidad_destino_id: unidad_id, aprobada_por_id: usuario_id,
      nombre_visita, rut_dni, estado: 'esperando', codigo_qr: token, qr_expira_at: expira
    }).select('id').single();
    if (error) { return next(error); }
    const qr_url = `https://condominioapp.cl/qr/${token}`;
    const qrImage = await QRCode.toDataURL(qr_url, { width: 300, margin: 2 });
    res.status(201).json({ visita_id: nueva.id, qr_token: token, expira_at: expira, qr_url, qr_image: qrImage });
  } catch (err) { next(err); }
});

module.exports = router;
