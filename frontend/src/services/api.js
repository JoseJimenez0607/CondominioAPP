import axios from 'axios';
import useAuthStore from '@/store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

// ── Servicios por módulo ─────────────────────────────────────

export const visitasApi = {
  listar:     (params) => api.get('/visitas', { params }),
  activas:    ()       => api.get('/visitas/activas'),
  dashboard:  ()       => api.get('/visitas/dashboard'),
  entrada:    (data)   => api.post('/visitas/entrada', data),
  salida:     (id)     => api.put(`/visitas/${id}/salida`),
  generarQR:  (data)   => api.post('/visitas/qr', data),
  validarQR:  (token)  => api.post('/visitas/qr/validar', { token }),
};

export const estacionamientosApi = {
  listar:  ()  => api.get('/estacionamientos'),
  liberar: (id) => api.post(`/estacionamientos/${id}/liberar`),
};

export const encomiendas_api = {
  listar:    (params)     => api.get('/encomiendas', { params }),
  registrar: (data)       => api.post('/encomiendas', data),
  entregar:  (id, data)   => api.put(`/encomiendas/${id}/entregar`, data),
};

export const reservasApi = {
  listar:      (params) => api.get('/reservas', { params }),
  pendientes:  ()       => api.get('/reservas/pendientes'), // <-- ESTA ES LA QUE FALTA EN TU CELULAR
  crear:       (data)   => api.post('/reservas', data),
  areas:       ()       => api.get('/reservas/areas'),
  aprobar:     (id)     => api.put(`/reservas/${id}/aprobar`),
  rechazar:    (id, motivo) => api.put(`/reservas/${id}/rechazar`, { motivo }),
  cancelar:    (id)     => api.put(`/reservas/${id}/cancelar`),
};

export const ticketsApi = {
  listar:     (params)    => api.get('/tickets', { params }),
  crear:      (data)      => api.post('/tickets', data),
  actualizar: (id, data)  => api.put(`/tickets/${id}`, data),
};

export const finanzasApi = {
  gastos:    (params)    => api.get('/finanzas/gastos', { params }),
  pagar:     (id, data)  => api.put(`/finanzas/gastos/${id}/pagar`, data),
  morosidad: ()          => api.get('/finanzas/morosidad'),
};

export const unidadesApi = {
  listar: () => api.get('/unidades'),
};

export const reportesApi = {
  visitas: (params) => api.get('/reportes/visitas', { params }),
};

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me:    ()     => api.get('/auth/me'),
};

export default api;
