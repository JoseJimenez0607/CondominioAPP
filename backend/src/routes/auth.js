const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../db/pool');
const router = express.Router();

router.post('/login', [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').notEmpty()
], async (req, res, next) => {
  console.log('\n========== LOGIN ATTEMPT ==========');
  console.log('Body recibido:', JSON.stringify(req.body));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  console.log('Email procesado:', email);
  console.log('Password length:', password?.length);
  console.log('Password chars:', JSON.stringify(password));

  try {
    console.log('Buscando usuario en Supabase...');
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, telefono, password_hash, condominio_id, unidad_id, activo, condominios(nombre), unidades(numero)')
      .eq('email', email)
      .eq('activo', true)
      .limit(1);

    console.log('Supabase error:', error);
    console.log('Usuarios encontrados:', users?.length);

    if (error) { return next(error); }
    if (!users || users.length === 0) {
      console.log('FALLO: Usuario no encontrado o inactivo');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];
    console.log('Usuario:', user.email, '| rol:', user.rol, '| activo:', user.activo);
    console.log('Hash en BD (30 chars):', user.password_hash?.slice(0, 30));
    console.log('Hash length:', user.password_hash?.length);

    console.log('Ejecutando bcrypt.compare...');
    const valid = await bcrypt.compare(password, user.password_hash);
    console.log('bcrypt resultado:', valid);

    if (!valid) {
      console.log('FALLO: Password incorrecta');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = {
      id:            user.id,
      condominio_id: user.condominio_id,
      unidad_id:     user.unidad_id,
      nombre:        user.nombre,
      email:         user.email,
      rol:           user.rol
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    console.log('LOGIN EXITOSO para:', user.email);
    console.log('===================================\n');

    res.json({
      token,
      user: {
        ...payload,
        condominio_nombre: user.condominios?.nombre,
        unidad_numero:     user.unidades?.numero
      }
    });
  } catch (err) {
    console.log('ERROR CATCH:', err.message);
    next(err);
  }
});

router.get('/me', require('../middleware/auth'), async (req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, telefono, condominio_id, unidad_id, condominios(nombre), unidades(numero)')
      .eq('id', req.user.id)
      .limit(1);
    if (error) { return next(error); }
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const u = users[0];
    res.json({
      user: {
        id:                u.id,
        nombre:            u.nombre,
        email:             u.email,
        rol:               u.rol,
        telefono:          u.telefono,
        condominio_id:     u.condominio_id,
        unidad_id:         u.unidad_id,
        condominio_nombre: u.condominios?.nombre,
        unidad_numero:     u.unidades?.numero
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;