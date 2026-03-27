const express    = require('express');
const { supabase } = require('../db/pool');
const requireRol = require('../middleware/requireRol');
const router     = express.Router();

router.get('/', async (req, res, next) => {
  const { condominio_id, rol, unidad_id } = req.user;
  const { estado } = req.query;
  try {
    let query = supabase
      .from('tickets')
      .select('id, titulo, descripcion, categoria, estado, prioridad, respuesta_admin, created_at, updated_at, unidades(numero), usuarios!usuario_id(nombre)')
      .eq('condominio_id', condominio_id)
      .order('prioridad').order('created_at', { ascending: false });
    if (estado) { query = query.eq('estado', estado); }
    if (rol === 'residente' && unidad_id) { query = query.eq('unidad_id', unidad_id); }
    const { data, error } = await query;
    if (error) { return next(error); }
    res.json({ tickets: (data || []).map(t => ({ ...t, unidad_numero: t.unidades?.numero, reportado_por: t.usuarios?.nombre })) });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const { condominio_id, id: usuario_id, unidad_id } = req.user;
  const { titulo, descripcion, categoria, prioridad } = req.body;
  try {
    const { data, error } = await supabase.from('tickets').insert({
      condominio_id, usuario_id, unidad_id, titulo, descripcion,
      categoria: categoria || 'otro', prioridad: prioridad || 2
    }).select('id').single();
    if (error) { return next(error); }
    res.status(201).json({ ticket: data });
  } catch (err) { next(err); }
});

router.put('/:id', requireRol('admin','conserje'), async (req, res, next) => {
  const { id } = req.params;
  const { estado, respuesta_admin } = req.body;
  try {
    const update = { updated_at: new Date().toISOString() };
    if (estado) { update.estado = estado; }
    if (respuesta_admin) { update.respuesta_admin = respuesta_admin; }
    if (estado === 'resuelto') { update.resuelto_at = new Date().toISOString(); }
    const { data, error } = await supabase.from('tickets').update(update).eq('id', id).select('id, estado').single();
    if (error) { return next(error); }
    res.json({ ticket: data });
  } catch (err) { next(err); }
});

module.exports = router;
