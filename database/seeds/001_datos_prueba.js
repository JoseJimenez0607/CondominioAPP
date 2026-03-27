process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  const client = await pool.connect();
  console.log('🌱 Iniciando seed de datos de prueba...\n');

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('123456', 10);

    // 1. Condominio
    const { rows: [condo] } = await client.query(`
      INSERT INTO condominios (nombre, direccion, plan_saas, email_admin)
      VALUES ('Edificio Aurora', 'Av. Providencia 1234, Santiago', 'pro', 'admin@edificioaurora.cl')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

    if (!condo) {
      console.log('ℹ️  El condominio ya existe, saltando seed.');
      await client.query('ROLLBACK');
      return;
    }

    const condoId = condo.id;
    console.log(`✅ Condominio creado: ${condoId}`);

    // 2. Unidades
    const unidadesData = [
      { numero: '101', piso: 1 }, { numero: '102', piso: 1 },
      { numero: '201', piso: 2 }, { numero: '202', piso: 2 },
      { numero: '301', piso: 3 }, { numero: '302', piso: 3 },
    ];
    const unidades = {};
    for (const u of unidadesData) {
      const { rows: [row] } = await client.query(
        `INSERT INTO unidades (condominio_id, numero, tipo, piso)
         VALUES ($1, $2, 'departamento', $3) RETURNING id`,
        [condoId, u.numero, u.piso]
      );
      unidades[u.numero] = row.id;
    }
    console.log(`✅ ${unidadesData.length} unidades creadas`);

    // 3. Usuarios
    const usuariosData = [
      { nombre: 'Administrador Aurora', email: 'admin@edificioaurora.cl',    rol: 'admin',     unidad: null  },
      { nombre: 'Carlos García',        email: 'conserje@edificioaurora.cl', rol: 'conserje',  unidad: null  },
      { nombre: 'Ana Rodríguez',        email: 'ana.rodriguez@gmail.com',    rol: 'residente', unidad: '101' },
      { nombre: 'Pedro Soto',           email: 'pedro.soto@gmail.com',       rol: 'residente', unidad: '102' },
      { nombre: 'Carmen Jiménez',       email: 'carmen.jimenez@gmail.com',   rol: 'residente', unidad: '201' },
      { nombre: 'Luis Vargas',          email: 'luis.vargas@gmail.com',      rol: 'residente', unidad: '301' },
      { nombre: 'Felipe Morales',       email: 'felipe.morales@gmail.com',   rol: 'residente', unidad: '302' },
    ];
    const usuarios = {};
    for (const u of usuariosData) {
      const { rows: [row] } = await client.query(
        `INSERT INTO usuarios (condominio_id, unidad_id, nombre, email, rol, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [condoId, u.unidad ? unidades[u.unidad] : null, u.nombre, u.email, u.rol, passwordHash]
      );
      usuarios[u.email] = row.id;
    }
    console.log(`✅ ${usuariosData.length} usuarios creados (password: 123456)`);

    // 4. Estacionamientos de visita
    for (let i = 1; i <= 5; i++) {
      await client.query(
        `INSERT INTO estacionamientos (condominio_id, codigo, tipo, estado)
         VALUES ($1, $2, 'visita', 'libre')`,
        [condoId, `V${i}`]
      );
    }
    // Estacionamientos de residentes
    for (const [num, uid] of Object.entries(unidades)) {
      await client.query(
        `INSERT INTO estacionamientos (condominio_id, codigo, tipo, unidad_id, estado)
         VALUES ($1, $2, 'residente', $3, 'ocupado')`,
        [condoId, `R${num}`, uid]
      );
    }
    console.log(`✅ Estacionamientos creados (5 visitas + 6 residentes)`);

    // 5. Áreas comunes
    const areas = [
      { nombre: 'Piscina',         aforo_max: 30, costo_reserva: 0,     duracion_bloque: 120 },
      { nombre: 'Quincho 1',       aforo_max: 40, costo_reserva: 15000, duracion_bloque: 240 },
      { nombre: 'Sala de eventos', aforo_max: 80, costo_reserva: 30000, duracion_bloque: 480 },
      { nombre: 'Cancha de tenis', aforo_max: 4,  costo_reserva: 5000,  duracion_bloque: 60  },
    ];
    const areaIds = {};
    for (const a of areas) {
      const { rows: [row] } = await client.query(
        `INSERT INTO areas_comunes (condominio_id, nombre, aforo_max, costo_reserva, duracion_bloque)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [condoId, a.nombre, a.aforo_max, a.costo_reserva, a.duracion_bloque]
      );
      areaIds[a.nombre] = row.id;
    }
    console.log(`✅ ${areas.length} áreas comunes creadas`);

    // 6. Visitas de ejemplo (hoy)
    const consId = usuarios['conserje@edificioaurora.cl'];
    const visitas = [
      { nombre: 'María González', rut: '12.345.678-9', unidad: '101', entrada: '08:32', estado: 'dentro'   },
      { nombre: 'Pedro Herrera',  rut: '9.876.543-2',  unidad: '201', entrada: '09:15', estado: 'salio', salida: '10:40' },
      { nombre: 'Juan Méndez',    rut: '15.432.100-8', unidad: '302', entrada: '11:00', estado: 'dentro'   },
      { nombre: 'Lucía Torres',   rut: '18.900.222-1', unidad: '102', entrada: '12:22', estado: 'salio', salida: '13:15' },
    ];
    for (const v of visitas) {
      const hoy = new Date().toISOString().split('T')[0];
      await client.query(
        `INSERT INTO visitas (condominio_id, unidad_destino_id, registrada_por_id, nombre_visita, rut_dni, estado, entrada_at, salida_at)
         VALUES ($1, $2, $3, $4, $5, $6,
           $7::date + $8::time,
           CASE WHEN $9 IS NOT NULL THEN $7::date + $9::time ELSE NULL END)`,
        [condoId, unidades[v.unidad], consId, v.nombre, v.rut, v.estado,
         hoy, v.entrada, v.salida || null]
      );
    }
    console.log(`✅ ${visitas.length} visitas de ejemplo creadas`);

    // 7. Encomiendas de ejemplo
    const encomiendas = [
      { unidad: '101', remitente: 'Amazon',        codigo: 'AMZ-123456' },
      { unidad: '201', remitente: 'Falabella',     codigo: 'FAL-789012' },
      { unidad: '302', remitente: 'Mercado Libre', codigo: 'ML-345678'  },
    ];
    for (const e of encomiendas) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      await client.query(
        `INSERT INTO encomiendas (condominio_id, unidad_id, recibida_por_id, remitente, codigo_barras, pin_retiro, estado)
         VALUES ($1, $2, $3, $4, $5, $6, 'en_conserjeria')`,
        [condoId, unidades[e.unidad], consId, e.remitente, e.codigo, pin]
      );
    }
    console.log(`✅ ${encomiendas.length} encomiendas de ejemplo creadas`);

    // 8. Tickets de ejemplo
    const ticketData = [
      { titulo: 'Luminaria quemada pasillo piso 2', cat: 'luminaria', prioridad: 2, unidad: '201', usuario: 'carmen.jimenez@gmail.com' },
      { titulo: 'Fuga de agua en baño común',       cat: 'agua',      prioridad: 1, unidad: '101', usuario: 'ana.rodriguez@gmail.com' },
      { titulo: 'Ascensor hace ruido extraño',      cat: 'ascensor',  prioridad: 2, unidad: '301', usuario: 'luis.vargas@gmail.com' },
    ];
    for (const t of ticketData) {
      await client.query(
        `INSERT INTO tickets (condominio_id, usuario_id, unidad_id, titulo, categoria, prioridad, estado)
         VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')`,
        [condoId, usuarios[t.usuario], unidades[t.unidad], t.titulo, t.cat, t.prioridad]
      );
    }
    console.log(`✅ ${ticketData.length} tickets de ejemplo creados`);

    // 9. Gastos comunes del mes actual
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();
    const mesAnterior = mesActual === 1 ? 12 : mesActual - 1;
    const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual;

    for (const [numero, unidadId] of Object.entries(unidades)) {
      // Mes actual — variado
      const estados = ['pendiente', 'pagado', 'pendiente', 'moroso', 'pagado', 'pendiente'];
      const estado  = estados[Object.keys(unidades).indexOf(numero) % estados.length];
      await client.query(
        `INSERT INTO gastos_comunes (condominio_id, unidad_id, mes, anio, monto_base, estado_pago, fecha_vencimiento)
         VALUES ($1, $2, $3, $4, 85000, $5, $6)
         ON CONFLICT (unidad_id, mes, anio) DO NOTHING`,
        [condoId, unidadId, mesActual, anioActual, estado,
         `${anioActual}-${String(mesActual).padStart(2,'0')}-10`]
      );
      // Mes anterior — todos pagados
      await client.query(
        `INSERT INTO gastos_comunes (condominio_id, unidad_id, mes, anio, monto_base, estado_pago, pagado_at)
         VALUES ($1, $2, $3, $4, 85000, 'pagado', NOW() - interval '15 days')
         ON CONFLICT (unidad_id, mes, anio) DO NOTHING`,
        [condoId, unidadId, mesAnterior, anioAnterior]
      );
    }
    console.log(`✅ Gastos comunes de ${mesActual}/${anioActual} y ${mesAnterior}/${anioAnterior} creados`);

    await client.query('COMMIT');
    console.log('\n🎉 Seed completado exitosamente.\n');
    console.log('📧 Usuarios de acceso:');
    console.log('   Admin:    admin@edificioaurora.cl     / 123456');
    console.log('   Conserje: conserje@edificioaurora.cl  / 123456');
    console.log('   Residente: ana.rodriguez@gmail.com    / 123456\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
