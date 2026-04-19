import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, Mail, User, Phone, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegistroResidente() {
  const { condominioId } = useParams(); 
  
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
  });
  
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('loading');

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/solicitudes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' // 🌟 ¡El pase VIP para saltar el bloqueo!
        },
        body: JSON.stringify({
          condominio_id: condominioId,
          nombre: form.nombre,
          email: form.email,
          telefono: form.telefono
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ocurrió un error al enviar tu solicitud.');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl shadow-lg mb-4">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido al Condominio</h1>
          <p className="text-gray-500 text-sm mt-1">Completa tus datos para solicitar acceso</p>
        </div>

        <div className="card p-8 bg-white rounded-xl shadow-sm border border-gray-100">
          {status === 'success' ? (
            <div className="text-center py-6 animate-fade-in">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">¡Solicitud Enviada!</h2>
              <p className="text-gray-500 text-sm mb-6">
                El administrador asignará tu departamento y revisará tus datos. Recibirás un correo electrónico para activar tu cuenta una vez seas aprobado.
              </p>
              <Link to="/login" className="text-primary-600 font-medium hover:underline">
                Volver al inicio
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Solicitud de Registro</h2>
              {status === 'error' && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label text-sm font-medium text-gray-700 block mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" className="input pl-9 w-full border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Ej: José Jiménez" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
                  </div>
                </div>
                <div>
                  <label className="label text-sm font-medium text-gray-700 block mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" className="input pl-9 w-full border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="nombre@correo.cl" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                </div>
                <div>
                  <label className="label text-sm font-medium text-gray-700 block mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" className="input pl-9 w-full border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="+56 9..." value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} required />
                  </div>
                </div>
                <button type="submit" disabled={status === 'loading'} className="btn-primary w-full flex justify-center py-2.5 mt-6 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors">
                  {status === 'loading' ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}