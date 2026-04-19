const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  }
});

async function sendEmail({ to, subject, html, text }) {
  if (process.env.NODE_ENV === 'test') return;

  try {
    const info = await transporter.sendMail({
      // Usamos el EMAIL_USER para que Gmail no rechace el envío
      from: `"${process.env.EMAIL_FROM_NAME || 'Condominio App'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email enviado a ${to} — ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`⚠️ Error enviando email a ${to}:`, err.message);
    // No lanzamos el error para que la app no se caiga si el mail falla
  }
}

module.exports = { sendEmail };