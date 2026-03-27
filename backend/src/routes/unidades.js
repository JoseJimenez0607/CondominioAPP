const express = require('express');
const { supabase } = require('../db/pool');
const router = express.Router();

router.get('/', async (req, res, next) => {
  const { condominio_id } = req.user;
  try {
    const { data, error } = await supabase
      .from('unidades')
      .select('id, numero, tipo, piso, torre, activa')
      .eq('condominio_id', condominio_id)
      .eq('activa', true)
      .order('numero');
    if (error) { return next(error); }
    res.json({ unidades: data || [] });
  } catch (err) { next(err); }
});

module.exports = router;
