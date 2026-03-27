const express    = require('express');
const { supabase } = require('../db/pool');
const requireRol = require('../middleware/requireRol');
const router     = express.Router();

router.get('/gastos', async (req, res, next) => {
  const { condominio_id, rol, unidad_id } = req.user;
  const { mes, anio, estado } = req.query;
  try {
    let query = supabase.from('gastos_comunes').select('id, mes, anio, monto_base, monto_extra, monto_total, estado_pago, fecha_vencimiento, pagado_at, unidades(numero)').eq('condominio_id', condominio_id).order('anio', { ascending: false }).order('mes', { ascending: false });
    if (mes)    { query = query.eq('mes', Number(mes)); }
    if (anio)   { query = query.eq('anio', Number(anio)); }
    if (estado) { query = query.eq('estado_pago', estado); }
    if (rol === 'residente') { query = query.eq('unidad_id', unidad_id); }
    const { data, error } = await query;
    if (error) { return next(error); }
    res.json({ gastos: (data || []).map(g => ({ ...g, unidad_numero: g.unidades?.numero })) });
  } catch (err) { next(err); }
});

router.put('/gastos/:id/pagar', requireRol('admin'), async (req, res, next) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('gastos_comunes').update({ estado_pago: 'pagado', pagado_at: new Date().toISOString() }).eq('id', id).select('id').single();
    if (error) { return next(error); }
    res.json({ gasto: data });
  } catch (err) { next(err); }
});

router.get('/morosidad', requireRol('admin'), async (req, res, next) => {
  const { condominio_id } = req.user;
  try {
    const { data, error } = await supabase.from('gastos_comunes').select('monto_total, mes, anio, unidades(numero)').eq('condominio_id', condominio_id).eq('estado_pago', 'moroso');
    if (error) { return next(error); }
    const morMap = {};
    (data || []).forEach(g => {
      const k = g.unidades?.numero;
      if (!morMap[k]) { morMap[k] = { unidad: k, deuda_total: 0, meses_morosos: 0, ultimo_mes_moroso: 0 }; }
      morMap[k].deuda_total += g.monto_total;
      morMap[k].meses_morosos++;
      const ref = g.anio * 100 + g.mes;
      if (ref > morMap[k].ultimo_mes_moroso) { morMap[k].ultimo_mes_moroso = ref; }
    });
    res.json({ morosidad: Object.values(morMap).sort((a,b) => b.deuda_total - a.deuda_total) });
  } catch (err) { next(err); }
});

module.exports = router;
