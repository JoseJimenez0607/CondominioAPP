const express    = require('express');
const { supabase } = require('../db/pool');
const requireRol = require('../middleware/requireRol');
const router     = express.Router();

router.get('/', async (req, res, next) => {
  const { condominio_id } = req.user;
  try {
    const { data: calzos, error } = await supabase
      .from('estacionamientos')
      .select('id, codigo, estado, nivel, tipo')
      .eq('condominio_id', condominio_id)
      .eq('tipo', 'visita')
      .eq('activo', true)
      .order('codigo');
    if (error) { return next(error); }

    // Obtener ocupaciones activas
    const { data: ocupaciones } = await supabase
      .from('estacionamientos_visita')
      .select('estacionamiento_id, entrada_at, max_horas, visitas(nombre_visita, unidades!unidad_destino_id(numero))')
      .eq('condominio_id', condominio_id)
      .is('salida_at', null);

    const ocMap = {};
    (ocupaciones || []).forEach(o => { ocMap[o.estacionamiento_id] = o; });

    const result = (calzos || []).map(c => {
      const oc = ocMap[c.id];
      const mins = oc ? Math.round((Date.now() - new Date(oc.entrada_at)) / 60000) : null;
      return {
        ...c,
        nombre_visita: oc?.visitas?.nombre_visita || null,
        unidad_destino: oc?.visitas?.unidades?.numero || null,
        parking_desde: oc?.entrada_at || null,
        max_horas: oc?.max_horas || null,
        minutos_estacionado: mins,
        en_alerta: oc ? mins >= (oc.max_horas * 60 - 30) : false
      };
    });
    res.json({ calzos: result });
  } catch (err) { next(err); }
});

router.post('/:id/liberar', requireRol('conserje','guardia','admin'), async (req, res, next) => {
  const { id } = req.params;
  const { condominio_id } = req.user;
  try {
    await supabase.from('estacionamientos_visita').update({ salida_at: new Date().toISOString() }).eq('estacionamiento_id', id).is('salida_at', null);
    await supabase.from('estacionamientos').update({ estado: 'libre' }).eq('id', id).eq('condominio_id', condominio_id);
    if (req.io) { req.io.to(`condo:${condominio_id}`).emit('parking:liberado', { id }); }
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
