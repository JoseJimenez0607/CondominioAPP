# 🏢 Condominio SaaS

Sistema de Gestión y Administración de Condominios en la Nube.  
Stack: **Node.js + Express + PostgreSQL** (backend) · **React + Vite + Tailwind** (frontend).

---

## 📁 Estructura del proyecto

```
condominio-saas/
├── condominio-saas.code-workspace   ← Abre esto en VS Code
├── .github/workflows/ci-cd.yml      ← CI/CD automático
├── railway.json                     ← Config deploy backend
├── backend/
│   ├── .env.example                 ← Copia como .env
│   └── src/
│       ├── server.js
│       ├── routes/        (visitas, auth, tickets, encomiendas...)
│       ├── middleware/    (auth, requireRol, errorHandler)
│       ├── db/            (pool, migrate, seed)
│       └── services/      (socketService)
├── frontend/
│   ├── .env.example                 ← Copia como .env.local
│   ├── vercel.json
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       │   ├── conserje/  (Visitas, Estacionamientos, Encomiendas, Tickets)
│       │   ├── residente/ (Dashboard, Reservas, Tickets, QR)
│       │   └── admin/     (Dashboard, Finanzas, Reportes)
│       ├── store/         (authStore con Zustand)
│       └── services/      (api.js con Axios, socket.js)
└── database/
    ├── migrations/        (001_schema, 002_funciones_y_vistas)
    └── seeds/             (001_datos_prueba.js)
```

---

## ⚡ Inicio rápido (desarrollo local)

### Prerrequisitos
- Node.js 20+
- PostgreSQL 14+ corriendo localmente **o** una cuenta en [Supabase](https://supabase.com) (gratis)
- Git

### 1. Clonar y abrir en VS Code

```bash
git clone https://github.com/TU_USUARIO/condominio-saas.git
cd condominio-saas
code condominio-saas.code-workspace
```

VS Code te pedirá instalar las extensiones recomendadas — acepta todas.

---

### 2. Configurar variables de entorno

**Backend:**
```bash
cd backend
cp .env.example .env
```

Edita `backend/.env` con tus valores:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/condominio_saas
JWT_SECRET=un_secreto_muy_largo_minimo_32_caracteres_aqui
PORT=3001
```

**Frontend:**
```bash
cd frontend
cp .env.example .env.local
```

El archivo por defecto ya apunta a `http://localhost:3001` — no necesitas cambiar nada para desarrollo.

---

### 3. Instalar dependencias

Desde la raíz del proyecto:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

O con el script del monorepo:
```bash
npm run install:all
```

---

### 4. Preparar la base de datos

**Opción A — PostgreSQL local:**
```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE condominio_saas;"

# Ejecutar migraciones
npm run db:migrate
```

**Opción B — Supabase (recomendado para producción):**
1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **Settings → Database → Connection string**
3. Copia el string y pégalo como `DATABASE_URL` en `backend/.env`
4. Ejecuta `npm run db:migrate`

**Cargar datos de prueba:**
```bash
npm run db:seed
```

Esto crea:
- Condominio "Edificio Aurora"
- 6 unidades (101–302)
- 7 usuarios con password `123456`
- Estacionamientos, áreas comunes, tickets y encomiendas de ejemplo

---

### 5. Iniciar en modo desarrollo

```bash
# Desde la raíz — inicia backend y frontend simultáneamente
npm run dev
```

| Servicio  | URL                       |
|-----------|---------------------------|
| Frontend  | http://localhost:5173      |
| Backend   | http://localhost:3001      |
| Health    | http://localhost:3001/health |

---

### 6. Credenciales de prueba

| Rol       | Email                          | Password |
|-----------|--------------------------------|----------|
| Admin     | admin@edificioaurora.cl        | 123456   |
| Conserje  | conserje@edificioaurora.cl     | 123456   |
| Residente | ana.rodriguez@gmail.com        | 123456   |

---

## 🐙 Subir a GitHub

### Primera vez

```bash
# En la raíz del proyecto
git init
git add .
git commit -m "feat: proyecto inicial condominio saas"

# Crear repo en GitHub (sin README, sin .gitignore — ya los tenemos)
# Luego conectar:
git remote add origin https://github.com/TU_USUARIO/condominio-saas.git
git branch -M main
git push -u origin main
```

### Flujo de trabajo diario

```bash
# Nueva funcionalidad
git checkout -b feat/nombre-feature
# ... hacer cambios ...
git add .
git commit -m "feat: descripcion del cambio"
git push origin feat/nombre-feature
# Crear Pull Request en GitHub hacia main
```

Al hacer merge a `main`, el CI/CD se activa automáticamente.

---

## 🚀 Deploy en producción

### Backend → Railway

**Railway** hospeda el servidor Node.js y PostgreSQL en la nube.

1. Crea cuenta en [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Selecciona `condominio-saas`
4. Railway detecta `railway.json` automáticamente
5. Agrega las variables de entorno en **Variables**:

```
NODE_ENV=production
DATABASE_URL=<Railway te da una PostgreSQL automáticamente>
JWT_SECRET=<genera uno largo y aleatorio>
CORS_ORIGINS=https://tu-frontend.vercel.app
PORT=3001
```

6. Railway genera una URL tipo `https://condominio-saas-backend.up.railway.app`

**Ejecutar migraciones en Railway:**
```bash
# Con Railway CLI instalado
npm install -g @railway/cli
railway login
railway run --service backend node backend/src/db/migrate.js
railway run --service backend node database/seeds/001_datos_prueba.js
```

---

### Frontend → Vercel

**Vercel** hospeda React con CDN global y deploy automático.

1. Crea cuenta en [vercel.com](https://vercel.com)
2. **New Project → Import Git Repository**
3. Selecciona `condominio-saas`
4. Configura:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
5. Agrega las variables de entorno:

```
VITE_API_URL=https://tu-backend.up.railway.app/api
VITE_SOCKET_URL=https://tu-backend.up.railway.app
```

6. Click en **Deploy** — Vercel genera `https://tu-proyecto.vercel.app`

---

### Activar CI/CD automático (GitHub Actions)

Agrega estos secrets en GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

| Secret name        | Valor                                           |
|--------------------|------------------------------------------------|
| `RAILWAY_TOKEN`    | Tu token de Railway (Account Settings → Tokens) |
| `VERCEL_TOKEN`     | Tu token de Vercel (Account Settings → Tokens)  |
| `VERCEL_ORG_ID`    | En `vercel.json` o Vercel dashboard             |
| `VERCEL_PROJECT_ID`| En Vercel dashboard del proyecto                |
| `VITE_API_URL`     | URL del backend en Railway                      |
| `VITE_SOCKET_URL`  | URL del backend en Railway                      |

A partir de aquí, **cada push a `main` despliega automáticamente** backend y frontend.

---

## 🗺️ Roadmap de módulos

| Módulo                    | Estado         |
|---------------------------|----------------|
| Auth + Roles              | ✅ Completo     |
| Control de visitas        | ✅ Completo     |
| Estacionamientos          | ✅ Completo     |
| Encomiendas               | ✅ Completo     |
| Tickets / Incidencias     | ✅ Completo     |
| Reservas de espacios      | ✅ Completo     |
| Gastos comunes            | ✅ Completo     |
| Reportes y analítica      | ✅ Completo     |
| Notificaciones push       | 🔄 En progreso  |
| App móvil (React Native)  | 📋 Planificado  |
| Multi-condominio (SaaS)   | 📋 Planificado  |
| Integración pagos (Stripe)| 📋 Planificado  |

---

## 🛠️ Comandos útiles

```bash
# Desarrollo
npm run dev              # Inicia todo (backend + frontend)

# Base de datos
npm run db:migrate       # Ejecuta migraciones nuevas
npm run db:seed          # Carga datos de prueba

# Build producción
npm run build            # Genera frontend/dist/ y verifica backend

# Lint
npm run lint             # Revisa código en backend y frontend
```

---

## 📞 Soporte

Abre un issue en GitHub si encuentras algún problema.  
Password por defecto para todos los usuarios de prueba: **`123456`**
