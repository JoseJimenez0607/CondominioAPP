/**
 * Servicio de alertas de estacionamiento
 * Se ejecuta cada 10 minutos y notifica cuando una visita
 * lleva más del 80% del tiempo permitido.
 *
 * Para activar en producción, llamar startParkingAlerts(io)
 * desde server.js después de inicializar Socket.io.
 */

const { pool }            = require('../db/pool');
const { sendEmail, templates } = require('../utils/email');

async function checkParkingAlerts(io) {
  const client = await pool.connect();
  try {
    // Visitas con parking próximo a vencer (no alertadas aún)
    const { rows } = await client.query(`
      SELECT
        ev.id               AS ev_id,
        ev.condominio_id,
        ev.max_horas,
        v.nombre_visita,
        e.codigo            AS calzo,
        u.numero            AS unidad_destino,
        u.id                AS unidad_id,
        ROUND(EXTRACT(EPOCH FROM (NOW() - ev.entrada_at))/60)::int AS minutos_dentro
      FROM estacionamientos_visita ev
      JOIN visitas        v  ON v.id  = ev.visita_id
      JOIN estacionamientos e ON e.id = ev.estacionamiento_id
      JOIN unidades        u  ON u.id = v.unidad_destino_id
      WHERE ev.salida_at IS NULL
        AND ev.alerta_enviada = FALSE
        AND EXTRACT(EPOCH FROM (NOW() - ev.entrada_at))/60
              >= (ev.max_horas * 60 - 30)
    `);

    for (const row of rows) {
      // 1. Notificar al panel del conserje vía WebSocket
      if (io) {
        io.to(`condo:${row.condominio_id}`).emit('parking:alerta', {
          ev_id:          row.ev_id,
          nombre_visita:  row.nombre_visita,
          calzo:          row.calzo,
          unidad_destino: row.unidad_destino,
          minutos_dentro: row.minutos_dentro,
          max_minutos:    row.max_horas * 60,
        });
      }

      // 2. Notificar al residente por email
      const { rows: residentes } = await client.query(
        `SELECT email, nombre FROM usuarios
         WHERE unidad_id = $1 AND rol = 'residente' AND activo = TRUE LIMIT 3`,
        [row.unidad_id]
      );

      for (const res of residentes) {
        await sendEmail({
          to:      res.email,
          subject: `⏰ Tu visita está por superar el tiempo de estacionamiento`,
          html: `
            <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#f08c00">Alerta de estacionamiento</h2>
              <p><strong>${row.nombre_visita}</strong> lleva ${row.minutos_dentro} minutos
              en el calzo <strong>${row.calzo}</strong> de tu visita.
              El límite es de <strong>${row.max_horas} horas</strong>.</p>
              <p style="color:#888;font-size:13px">Por favor coordina con tu visita para liberar el espacio.</p>
            </div>`,
        });
      }

      // 3. Marcar alerta como enviada
      await client.query(
        `UPDATE estacionamientos_visita SET alerta_enviada = TRUE WHERE id = $1`,
        [row.ev_id]
      );

      console.log(`🅿️  Alerta enviada: ${row.nombre_visita} en calzo ${row.calzo}`);
    }
  } catch (err) {
    console.error('Error en checkParkingAlerts:', err.message);
  } finally {
    client.release();
  }
}

/**
 * Inicia el job de alertas (cada 10 minutos)
 * @param {import('socket.io').Server} io
 */
function startParkingAlerts(io) {
  const INTERVAL_MS = 10 * 60 * 1000; // 10 min
  console.log('⏰ Servicio de alertas de parking iniciado (cada 10 min)');
  setInterval(() => checkParkingAlerts(io), INTERVAL_MS);
  // Ejecutar también al arrancar
  checkParkingAlerts(io);
}

module.exports = { startParkingAlerts, checkParkingAlerts };
