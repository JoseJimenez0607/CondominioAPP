/**
 * Seed runner — llama al seed principal en database/seeds/
 * Uso: npm run seed (desde backend/)
 */
require('dotenv').config();
const path = require('path');

// Reuse el seed ubicado en database/seeds/
const seedPath = path.resolve(__dirname, '../../../database/seeds/001_datos_prueba.js');
require(seedPath);
