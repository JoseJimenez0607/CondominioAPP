import clsx from 'clsx';

/**
 * Spinner de carga reutilizable
 * @param {'sm'|'md'|'lg'} size
 * @param {string} className
 */
export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-[3px]',
  };

  return (
    <div
      className={clsx(
        'rounded-full border-gray-200 border-t-primary-500 animate-spin',
        sizes[size],
        className
      )}
      role="status"
      aria-label="Cargando..."
    />
  );
}

/** Pantalla completa de carga */
export function PageLoader({ text = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-gray-400">
      <LoadingSpinner size="lg" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
