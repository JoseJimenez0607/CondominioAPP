/**
 * Encabezado de página estandarizado
 *
 * <PageHeader
 *   title="Control de Visitas"
 *   subtitle="Registro en tiempo real"
 *   actions={<button className="btn-primary">Nueva visita</button>}
 * />
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
