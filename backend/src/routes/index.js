const express = require('express');
const router  = express.Router();

const auth                   = require('../middleware/auth');
const authRouter             = require('./auth');
const visitasRouter          = require('./visitas');
const unidadesRouter         = require('./unidades');
const estacionamientosRouter = require('./estacionamientos');
const encomiendas            = require('./encomiendas');
const reservasRouter         = require('./reservas');
const ticketsRouter          = require('./tickets');
const finanzasRouter         = require('./finanzas');
const reportesRouter         = require('./reportes');
const configuracionRouter    = require('./configuracion');

router.use('/auth',           authRouter);
router.use('/visitas',          auth, visitasRouter);
router.use('/unidades',         auth, unidadesRouter);
router.use('/estacionamientos', auth, estacionamientosRouter);
router.use('/encomiendas',      auth, encomiendas);
router.use('/reservas',         auth, reservasRouter);
router.use('/tickets',          auth, ticketsRouter);
router.use('/finanzas',         auth, finanzasRouter);
router.use('/reportes',         auth, reportesRouter);
router.use('/configuracion',    auth, configuracionRouter);

module.exports = router;


