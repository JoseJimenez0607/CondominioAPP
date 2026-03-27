const nodemailer = require('nodemailer');

// Transporter — usa SMTP genérico o SendGrid
const transporter = nodemailer.createTransport(
  process.env.SENDGRID_API_KEY
    ? {
        host:   'smtp.sendgrid.net',
        port:   587,
        auth:   { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
      }
    : {
        // Modo desarrollo: Ethereal (captura emails sin enviarlos de verdad)
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: 'test@ethereal.email', pass: 'test' },
      }
);

/**
 * Envía un email
 * @param {Object} opts - { to, subject, html, text }
 */
async function sendEmail({ to, subject, html, text }) {
  if (process.env.NODE_ENV === 'test') { return; }

  try {
    const info = await transporter.sendMail({
      from:    `"${process.env.EMAIL_FROM_NAME || 'Condominio App'}" <${process.env.EMAIL_FROM || 'noreply@condominioapp.cl'}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email enviado a ${to} — ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.warn(`⚠️ Error enviando email a ${to}:`, err.message);
    // No lanzar — las notificaciones son best-effort
  }
}

// Templates reutilizables
const templates = {
  visitaEntrada: (nombre, unidad) => ({
    subject: `🚪 Nueva visita — ${nombre}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#4c6ef5;margin-bottom:8px">Nueva visita registrada</h2>
        <p style="color:#555"><strong>${nombre}</strong> ha ingresado al edificio con destino a tu departamento <strong>${unidad}</strong>.</p>
        <p style="color:#888;font-size:13px;margin-top:16px">Hora de ingreso: ${new Date().toLocaleTimeString('es-CL')}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <p style="color:#aaa;font-size:12px">Condominio App · Notificación automática</p>
      </div>`,
  }),

  encomiendaRecibida: (remitente, unidad) => ({
    subject: `📦 Paquete recibido en conserjería`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#4c6ef5;margin-bottom:8px">Tienes un paquete</h2>
        <p style="color:#555">Se recibió un paquete de <strong>${remitente || 'remitente desconocido'}</strong> para el departamento <strong>${unidad}</strong>.</p>
        <p style="color:#555">Puedes retirarlo en conserjería presentando tu PIN de retiro.</p>
        <p style="color:#888;font-size:13px;margin-top:16px">Recibido: ${new Date().toLocaleString('es-CL')}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <p style="color:#aaa;font-size:12px">Condominio App · Notificación automática</p>
      </div>`,
  }),

  recordatorioGasto: (unidad, monto, mes) => ({
    subject: `💰 Recordatorio de gasto común — ${mes}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#f08c00;margin-bottom:8px">Gasto común pendiente</h2>
        <p style="color:#555">El departamento <strong>${unidad}</strong> tiene un gasto común pendiente de <strong>$${Number(monto).toLocaleString('es-CL')}</strong> correspondiente a <strong>${mes}</strong>.</p>
        <p style="color:#555">Por favor regulariza tu situación a la brevedad.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <p style="color:#aaa;font-size:12px">Condominio App · Notificación automática</p>
      </div>`,
  }),
};

module.exports = { sendEmail, templates };
