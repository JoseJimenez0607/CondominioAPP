const express    = require('express');
const { supabase } = require('../db/pool');
const requireRol = require('../middleware/requireRol');
const router     = express.Router();

router.get('/', async (req, res, next) => {
  const { condominio_id } = req.user;
  const { estado = 'en_conserjeria' } = req.query;
  try {
    const { data, error } = await supabase
      .from('encomiendas')
      .select('id, remitente, codigo_barras, estado, recibido_at, retirado_at, unidades(numero)')
      .eq('condominio_id', condominio_id)
      .eq('estado', estado)
      .order('recibido_at', { ascending: false });
    if (error) { return next(error); }
    res.json({ encomiendas: (data || []).map(e => ({ ...e, unidad_numero: e.unidades?.numero })) });
  } catch (err) { next(err); }
});

router.post('/', requireRol('conserje','guardia','admin'), async (req, res, next) => {
  const { condominio_id, id: usuario_id } = req.user;
  const { unidad_id, remitente, codigo_barras, descripcion } = req.body;
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  try {
    const { data, error } = await supabase.from('encomiendas').insert({
      condominio_id, unidad_id, recibida_por_id: usuario_id,
      remitente, codigo_barras, descripcion, pin_retiro: pin
    }).select('id').single();
    if (error) { return next(error); }
    res.status(201).json({ encomienda: data, pin_generado: pin });
  } catch (err) { next(err); }
});

router.put('/:id/entregar', requireRol('conserje','guardia','admin'), async (req, res, next) => {
  const { id } = req.params;
  const { pin } = req.body;
  const { condominio_id, id: usuario_id } = req.user;
  try {
    const { data } = await supabase.from('encomiendas').select('pin_retiro').eq('id', id).eq('condominio_id', condominio_id).eq('estado', 'en_conserjeria').limit(1);
    if (!data || data.length === 0) { return res.status(404).json({ error: 'Encomienda no encontrada' }); }
    if (data[0].pin_retiro !== pin) { return res.status(400).json({ error: 'PIN incorrecto' }); }
    await supabase.from('encomiendas').update({ estado: 'retirado', retirado_at: new Date().toISOString(), entregada_por_id: usuario_id }).eq('id', id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
