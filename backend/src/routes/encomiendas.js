const express    = require('express');
const { supabase } = require('../db/pool');
const requireRol = require('../middleware/requireRol');
const { sendEmail } = require('../utils/email');
const router     = express.Router();

// GET /api/encomiendas
router.get('/', async (req, res, next) => {
  const { condominio_id } = req.user;
  const { estado = 'en_conserjeria' } = req.query;
  try {
    const { data, error } = await supabase
      .from('encomiendas')
      .select('id, remitente, codigo_barras, estado, recibido_at, retirado_at, foto_url, descripcion, unidades(numero)')
      .eq('condominio_id', condominio_id)
      .eq('estado', estado)
      .order('recibido_at', { ascending: false });
    if (error) { return next(error); }
    res.json({ encomiendas: (data || []).map(e => ({ ...e, unidad_numero: e.unidades?.numero })) });
  } catch (err) { next(err); }
});

// POST /api/encomiendas — registrar paquete con foto + enviar email con PIN al residente
router.post('/', requireRol('conserje','guardia','admin'), async (req, res, next) => {
  const { condominio_id, id: usuario_id } = req.user;
  const { unidad_id, remitente, codigo_barras, descripcion, foto_url } = req.body;
  const pin = String(Math.floor(1000 + Math.random() * 9000));

  try {
    const { data, error } = await supabase
      .from('encomiendas')
      .insert({
        condominio_id,
        unidad_id,
        recibida_por_id: usuario_id,
        remitente,
        codigo_barras,
        descripcion,
        foto_url: foto_url || null,
        pin_retiro: pin
      })
      .select('id')
      .single();
    if (error) { return next(error); }

    // Obtener datos para el email
    const [{ data: residentes }, { data: unidad }, { data: condo }] = await Promise.all([
      supabase.from('usuarios').select('email, nombre').eq('unidad_id', unidad_id).eq('rol', 'residente').eq('activo', true),
      supabase.from('unidades').select('numero').eq('id', unidad_id).single(),
      supabase.from('condominios').select('nombre').eq('id', condominio_id).single()
    ]);

    const fecha = new Date().toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // ==========================================
    // 🌟 LÓGICA INTELIGENTE PARA LA FOTO
    // ==========================================
    let bloqueFotoHtml = '';
    if (foto_url) {
      if (foto_url.startsWith('data:image')) {
        // Si es Base64 gigante, evitamos romper el límite de 102KB de Gmail
        bloqueFotoHtml = `
          <div style="background:white;border-radius:10px;padding:15px;margin-bottom:16px;text-align:center;border:1px dashed #ccc;">
            <p style="margin:0;color:#555;font-size:13px;">📸 <i>Se ha registrado una foto del paquete.<br>Puedes verla iniciando sesión en tu panel de residente.</i></p>
          </div>`;
      } else {
        // Si es un archivo local, aplicamos tu túnel de Ngrok actual
        const srcFinal = foto_url.startsWith('http') ? foto_url : `https://602b-186-107-162-100.ngrok-free.app${foto_url}`;
        bloqueFotoHtml = `
          <div style="background:white;border-radius:10px;padding:20px;margin-bottom:16px;text-align:center">
            <p style="margin:0 0 10px;color:#888;font-size:13px;font-weight:600">Foto del paquete</p>
            <img src="${srcFinal}" alt="Foto del paquete" style="max-width:100%;border-radius:8px;border:1px solid #eee;max-height:300px;object-fit:cover" />
          </div>`;
      }
    }

    // ==========================================
    // 🌟 ENVÍO DE CORREOS PROTEGIDO
    // ==========================================
    try {
      if (residentes && residentes.length > 0) {
        for (const residente of residentes) {
          await sendEmail({
            to: residente.email,
            subject: `📦 Tienes un paquete en conserjería — ${condo?.nombre || 'Tu edificio'}`,
            html: `
              <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8f9fa;border-radius:12px">
                <div style="background:#4c6ef5;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
                  <h1 style="color:white;margin:0;font-size:22px">📦 Paquete recibido</h1>
                  <p style="color:#c5d0fa;margin:6px 0 0;font-size:13px">${condo?.nombre || 'Tu edificio'}</p>
                </div>

                <div style="background:white;border-radius:10px;padding:20px;margin-bottom:16px">
                  <p style="margin:0 0 16px;color:#333;font-size:15px">
                    Hola <strong>${residente.nombre}</strong>, tienes un paquete esperándote en conserjería.
                  </p>
                  <table style="width:100%;border-collapse:collapse;font-size:14px">
                    <tr style="border-bottom:1px solid #eee">
                      <td style="padding:8px 0;color:#888;width:130px">Departamento</td>
                      <td style="padding:8px 0;color:#333;font-weight:600">Dpto. ${unidad?.numero || ''}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #eee">
                      <td style="padding:8px 0;color:#888">Remitente</td>
                      <td style="padding:8px 0;color:#333">${remitente || 'No especificado'}</td>
                    </tr>
                    ${descripcion ? `
                    <tr style="border-bottom:1px solid #eee">
                      <td style="padding:8px 0;color:#888">Descripción</td>
                      <td style="padding:8px 0;color:#333">${descripcion}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding:8px 0;color:#888">Recibido</td>
                      <td style="padding:8px 0;color:#333">${fecha}</td>
                    </tr>
                  </table>
                </div>

                ${bloqueFotoHtml}

                <div style="background:#ebfbee;border:2px solid #2f9e44;border-radius:10px;padding:24px;text-align:center;margin-bottom:16px">
                  <p style="margin:0 0 8px;color:#2b8a3e;font-size:13px;font-weight:600">🔐 Tu PIN de retiro</p>
                  <p style="margin:0;font-size:42px;font-weight:800;color:#2f9e44;letter-spacing:10px">${pin}</p>
                  <p style="margin:10px 0 0;color:#5c940d;font-size:12px">
                    Presenta este PIN al conserje al momento de retirar tu paquete.<br/>
                    <strong>No compartas este PIN con nadie.</strong>
                  </p>
                </div>

                <p style="text-align:center;color:#aaa;font-size:12px;margin:0">
                  ${condo?.nombre || 'Condominio App'} · Notificación automática
                </p>
              </div>
            `
          });
        }
      }
    } catch (mailErr) {
      console.error("❌ Error en el proceso de envío de correos:", mailErr.message);
    }

    res.status(201).json({
      encomienda: data,
      notificaciones_enviadas: residentes?.length || 0
    });
  } catch (err) { next(err); }
});

// PUT /api/encomiendas/:id/entregar
router.put('/:id/entregar', requireRol('conserje','guardia','admin'), async (req, res, next) => {
  const { id } = req.params;
  const { pin } = req.body;
  const { condominio_id, id: usuario_id } = req.user;
  try {
    const { data } = await supabase
      .from('encomiendas')
      .select('pin_retiro')
      .eq('id', id)
      .eq('condominio_id', condominio_id)
      .eq('estado', 'en_conserjeria')
      .limit(1);
    if (!data || data.length === 0) { return res.status(404).json({ error: 'Encomienda no encontrada' }); }
    if (data[0].pin_retiro !== pin) { return res.status(400).json({ error: 'PIN incorrecto' }); }
    await supabase.from('encomiendas').update({
      estado: 'retirado',
      retirado_at: new Date().toISOString(),
      entregada_por_id: usuario_id
    }).eq('id', id);
    res.json({ success: true, mensaje: 'Encomienda entregada correctamente' });
  } catch (err) { next(err); }
});

module.exports = router;