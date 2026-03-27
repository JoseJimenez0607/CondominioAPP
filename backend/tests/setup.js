// Cargar variables de entorno de prueba
process.env.NODE_ENV   = 'test';
process.env.JWT_SECRET = 'test_secret_minimo_32_caracteres_ok';
process.env.PORT       = '3002';

// DATABASE_URL se debe definir en el CI o en .env.test local
// process.env.DATABASE_URL = 'postgresql://...';
