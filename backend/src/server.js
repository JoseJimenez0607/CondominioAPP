require('dotenv').config();
const express     = require('express');
const http        = require('http');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const { Server }  = require('socket.io');

const { testConnection }       = require('./db/pool');
const routes                   = require('./routes');
const { errorHandler }         = require('./middleware/errorHandler');
const { setupSocketIO }        = require('./services/socketService');
const { startParkingAlerts }   = require('./services/parkingAlerts');

const app    = express();
const server = http.createServer(app);

// 🌟 ESTA LÍNEA ES CRUCIAL PARA CLOUDFLARE TUNNELS 🌟
// Le dice a Express que confíe en el proxy de Cloudflare para leer IPs reales
app.set('trust proxy', 1);

// 1. DOMINIOS PERMITIDOS (Tu Vercel y tu Localhost)
const allowedOrigins = [
  'https://condominio-app-frontend.vercel.app',
  'http://localhost:5173'
];

// 2. CONFIGURACIÓN CORS PARA WEBSOCKETS (io)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

// ── Seguridad y CORS PARA EXPRESS ────────────────────────
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Permite peticiones sin origin (como las de Postman) o si están en la lista
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization','ngrok-skip-browser-warning'],
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
app.use('/api/solicitudes', require('./routes/solicitudes'));
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
      console.log(`\n🚀 Servidor corriendo en puerto ${PORT}`);
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