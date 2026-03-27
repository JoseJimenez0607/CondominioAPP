import { Table } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

/**
 * Tabla de datos reutilizable con loading y empty state integrados.
 *
 * columns: [{ key, header, render?, className? }]
 * rows:    array de objetos
 *
 * Ejemplo:
 *   <DataTable
 *     columns={[
 *       { key: 'nombre', header: 'Nombre' },
 *       { key: 'estado', header: 'Estado', render: (v) => <StatusBadge status={v} /> },
 *     ]}
 *     rows={visitas}
 *     loading={isLoading}
 *     emptyTitle="Sin visitas hoy"
 *   />
 */
export default function DataTable({
  columns       = [],
  rows          = [],
  loading       = false,
  emptyTitle    = 'Sin datos',
  emptyDescription,
  keyField      = 'id',
  onRowClick,
}) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <div className="flex justify-center">
                  <LoadingSpinner />
                </div>
              </td>
            </tr>
          )}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState
                  icon={Table}
                  title={emptyTitle}
                  description={emptyDescription}
                />
              </td>
            </tr>
          )}

          {!loading && rows.map((row, i) => (
            <tr
              key={row[keyField] ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.tdClassName}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
