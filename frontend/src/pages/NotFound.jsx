import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-7xl font-bold text-gray-200 mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-700 mb-2">Página no encontrada</h1>
        <p className="text-gray-400 text-sm mb-6">La ruta que buscas no existe.</p>
        <button className="btn-primary gap-2" onClick={() => navigate(-1)}>
          <Home size={16} /> Volver
        </button>
      </div>
    </div>
  );
}
