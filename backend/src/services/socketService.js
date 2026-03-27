const jwt = require('jsonwebtoken');

function setupSocketIO(io) {
  // Autenticar conexiones WebSocket con JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token requerido'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { condominio_id, id: userId, rol } = socket.user;

    // Unirse a la sala del condominio
    socket.join(`condo:${condominio_id}`);

    // Sala específica por usuario (para notificaciones privadas)
    socket.join(`user:${userId}`);

    console.log(`🔌 Usuario ${userId} (${rol}) conectado — condo ${condominio_id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Usuario ${userId} desconectado`);
    });

    // Ping/pong para mantener conexión viva
    socket.on('ping', () => socket.emit('pong'));
  });
}

module.exports = { setupSocketIO };
