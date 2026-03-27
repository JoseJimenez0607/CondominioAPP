/**
 * Estado vacío reutilizable para tablas y listas
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {Icon && <Icon size={36} className="text-gray-200 mb-4" />}
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
