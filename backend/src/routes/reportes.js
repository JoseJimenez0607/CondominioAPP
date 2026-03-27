const express    = require('express');
const { supabase } = require('../db/pool');
const requireRol = require('../middleware/requireRol');
const router     = express.Router();

router.get('/visitas', requireRol('admin'), async (req, res, next) => {
  const { condominio_id } = req.user;
  const mes  = Number(req.query.mes  || new Date().getMonth() + 1);
  const anio = Number(req.query.anio || new Date().getFullYear());
  const desde = `${anio}-${String(mes).padStart(2,'0')}-01`;
  const hasta = `${anio}-${String(mes).padStart(2,'0')}-31`;
  try {
    const { data, error } = await supabase.from('visitas').select('id, estado, codigo_qr, patente, entrada_at, salida_at').eq('condominio_id', condominio_id).gte('created_at', desde).lte('created_at', hasta);
    if (error) { return next(error); }
    const total = data?.length || 0;
    const completadas = data?.filter(v => v.estado === 'salio').length || 0;
    const con_qr = data?.filter(v => v.codigo_qr).length || 0;
    const con_vehiculo = data?.filter(v => v.patente).length || 0;
    const duraciones = data?.filter(v => v.entrada_at && v.salida_at).map(v => (new Date(v.salida_at) - new Date(v.entrada_at)) / 60000) || [];
    const duracion_promedio_min = duraciones.length > 0 ? Math.round(duraciones.reduce((a,b) => a+b, 0) / duraciones.length) : null;
    const visitas_manana = data?.filter(v => { const h = new Date(v.entrada_at).getHours(); return h >= 8 && h < 12; }).length || 0;
    const visitas_tarde  = data?.filter(v => { const h = new Date(v.entrada_at).getHours(); return h >= 12 && h < 18; }).length || 0;
    const visitas_noche  = data?.filter(v => { const h = new Date(v.entrada_at).getHours(); return h >= 18; }).length || 0;
    res.json({ reporte: { total, completadas, con_qr, con_vehiculo, duracion_promedio_min, visitas_manana, visitas_tarde, visitas_noche } });
  } catch (err) { next(err); }
});

module.exports = router;
