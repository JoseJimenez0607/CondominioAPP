const express = require('express');
const { supabase } = require('../db/pool');
const requireRol = require('../middleware/requireRol'); // Tu middleware de seguridad
const router = express.Router();



// GET /api/solicitudes/unidades/:condominio_id - PÚBLICO (Para el Dropdown de registro)
router.get('/unidades/:condominio_id', async (req, res, next) => {
  const { condominio_id } = req.params;
  try {
    const { data, error } = await supabase
      .from('unidades')
      .select('id, numero')
      .eq('condominio_id', condominio_id)
      .order('numero', { ascending: true }); // Los ordena del 101 hacia arriba

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/solicitudes - El administrador ve las solicitudes pendientes
router.get('/', requireRol('admin'), async (req, res, next) => {
  const { condominio_id } = req.user;
  try {
    const { data, error } = await supabase
      .from('solicitudes_registro')
      .select('*, unidades(numero)')
      .eq('condominio_id', condominio_id)
      .eq('estado', 'pendiente')
      .order('creado_at', { ascending: false });

    if (error) throw error;
    res.json({ solicitudes: data });
  } catch (err) { next(err); }
});

// POST /api/solicitudes - El residente envía el formulario público (SIN unidad)
router.post('/', async (req, res, next) => {
  const { condominio_id, nombre, email, telefono } = req.body;
  try {
    const { data, error } = await supabase
      .from('solicitudes_registro')
      .insert({ condominio_id, nombre, email, telefono }) // Quitamos unidad_id de aquí
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, mensaje: 'Solicitud enviada al administrador.' });
  } catch (err) { next(err); }
});

// POST /api/solicitudes/:id/aprobar - El admin aprueba y ASIGNA el departamento
router.post('/:id/aprobar', requireRol('admin'), async (req, res, next) => {
  const { id } = req.params;
  const { unidad_id } = req.body; // <--- ¡Ahora el Admin lo envía desde su panel!
  
  try {
    if (!unidad_id) return res.status(400).json({ error: 'Debes asignar un departamento para aprobar la solicitud' });

    const { data: solicitud, error: fetchError } = await supabase
      .from('solicitudes_registro')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (solicitud.estado !== 'pendiente') return res.status(400).json({ error: 'La solicitud ya fue procesada' });

    // Magia de Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(solicitud.email);
    if (authError) throw authError;

    // Crear el perfil del usuario conectándolo con la unidad que eligió el Admin
    const { error: insertError } = await supabase.from('usuarios').insert({
      id: authData.user.id,
      condominio_id: solicitud.condominio_id,
      unidad_id: unidad_id, // Usamos la unidad que manda el admin
      nombre: solicitud.nombre,
      email: solicitud.email,
      telefono: solicitud.telefono,
      rol: 'residente',
      activo: true
    });
    if (insertError) throw insertError;

    // Actualizar la solicitud a aprobada y guardarle la unidad final
    await supabase.from('solicitudes_registro')
      .update({ estado: 'aprobada', unidad_id: unidad_id })
      .eq('id', id);

    res.json({ success: true, mensaje: 'Usuario aprobado. Se ha enviado un correo de activación.' });
  } catch (error) { next(error); }
});

module.exports = router;