const express    = require('express');
const { supabase } = require('../db/pool');
const requireRol = require('../middleware/requireRol');
const router     = express.Router();

router.get('/', async (req, res, next) => {
  const { condominio_id } = req.user;
  try {
    const { data, error } = await supabase.from('configuracion').select('*').eq('condominio_id', condominio_id).limit(1);
    if (error) { return next(error); }
    if (!data || data.length === 0) {
      const { data: nueva } = await supabase.from('configuracion').insert({ condominio_id }).select('*').single();
      return res.json({ config: nueva });
    }
    res.json({ config: data[0] });
  } catch (err) { next(err); }
});

router.put('/', requireRol('admin'), async (req, res, next) => {
  const { condominio_id } = req.user;
  const allowed = ['parking_max_horas','parking_alerta_mins','gasto_dia_vencimiento','gasto_monto_base','notif_visita_email','notif_visita_push','notif_encomienda_email','notif_encomienda_push','notif_gasto_reminder','gasto_reminder_dias','color_primario','horario_inicio','horario_fin'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) { update[k] = req.body[k]; } });
  update.updated_at = new Date().toISOString();
  try {
    const { data, error } = await supabase.from('configuracion').update(update).eq('condominio_id', condominio_id).select('*').single();
    if (error) { return next(error); }
    res.json({ config: data });
  } catch (err) { next(err); }
});

router.post('/generar-gastos', requireRol('admin'), async (req, res, next) => {
  const { condominio_id } = req.user;
  const mes  = Number(req.body.mes  || new Date().getMonth() + 1);
  const anio = Number(req.body.anio || new Date().getFullYear());
  try {
    const { data: config } = await supabase.from('configuracion').select('gasto_monto_base, gasto_dia_vencimiento').eq('condominio_id', condominio_id).single();
    const monto = config?.gasto_monto_base || 85000;
    const dia   = config?.gasto_dia_vencimiento || 10;
    const { data: unidades } = await supabase.from('unidades').select('id').eq('condominio_id', condominio_id).eq('activa', true);
    let count = 0;
    for (const u of (unidades || [])) {
      const { error } = await supabase.from('gastos_comunes').insert({ condominio_id, unidad_id: u.id, mes, anio, monto_base: monto, estado_pago: 'pendiente', fecha_vencimiento: `${anio}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}` });
      if (!error) { count++; }
    }
    res.json({ success: true, generados: count, mensaje: `${count} gastos generados para ${mes}/${anio}` });
  } catch (err) { next(err); }
});

module.exports = router;
