require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const { Server } = require('socket.io');

const { testConnection }       = require('./db/pool');
const routes                   = require('./routes');
const { errorHandler }         = require('./middleware/errorHandler');
const { setupSocketIO }        = require('./services/socketService');
const { startParkingAlerts }   = require('./services/parkingAlerts');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));

// ── Rate limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Demasiadas solicitudes. Intente más tarde.' }
});
app.use('/api/', limiter);

// ── Parsers y utilidades ───────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Inyectar io en cada request ────────────────────────────
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env:    process.env.NODE_ENV,
    ts:     new Date().toISOString()
  });
});

// ── Rutas API ──────────────────────────────────────────────
app.use('/api', routes);

// ── WebSocket ──────────────────────────────────────────────
setupSocketIO(io);

// ── Error handler global ───────────────────────────────────
app.use(errorHandler);

// ── Arranque ───────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await testConnection();
    server.listen(PORT, () => {
      console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📡 WebSocket activo`);
      console.log(`🌎 Entorno: ${process.env.NODE_ENV || 'development'}\n`);
      // Iniciar job de alertas de parking
      if (process.env.NODE_ENV !== 'test') {
        startParkingAlerts(io);
      }
    });
  } catch (err) {
    console.error('❌ Error al iniciar servidor:', err);
    process.exit(1);
  }
}

start();

module.exports = { app, server, io };
