'use client';

import { useCallback, useMemo } from 'react';
import { CaretUp, CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  getRowId: (item: T) => string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onRowClick?: (item: T) => void;
  /** Enable pagination — pass total count to calculate pages */
  pageSize?: number;
  page?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  /** Number of skeleton rows to show during loading (default 5) */
  skeletonRows?: number;
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function SkeletonRow({
  columnCount,
  selectable,
}: {
  columnCount: number;
  selectable: boolean;
}) {
  return (
    <tr className="border-b border-subtle bg-surface">
      {selectable && (
        <td className="w-10 px-4 py-2.5">
          <Skeleton className="h-4 w-4 rounded-sm" />
        </td>
      )}
      {Array.from({ length: columnCount }).map((_, i) => (
        <td key={i} className="px-4 py-2.5">
          <Skeleton className="h-4 w-full rounded" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data',
  emptyAction,
  selectable = false,
  selectedIds,
  onSelectionChange,
  getRowId,
  onSort,
  sortKey,
  sortDirection,
  onRowClick,
  pageSize,
  page,
  totalCount,
  onPageChange,
  skeletonRows = 5,
}: DataTableProps<T>) {
  // -----------------------------------------------------------------------
  // Selection helpers
  // -----------------------------------------------------------------------
  const selected = useMemo(() => selectedIds ?? new Set<string>(), [selectedIds]);

  const handleSelect = useCallback(
    (id: string) => {
      const next = new Set(selected);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange?.(next);
    },
    [selected, onSelectionChange],
  );

  const handleSelectAll = useCallback(() => {
    if (selected.size === data.length && data.length > 0) {
      onSelectionChange?.(new Set());
    } else {
      const allIds = new Set(data.map((row) => getRowId(row)));
      onSelectionChange?.(allIds);
    }
  }, [data, selected.size, onSelectionChange, getRowId]);

  // -----------------------------------------------------------------------
  // Sort helpers
  // -----------------------------------------------------------------------
  const handleSort = useCallback(
    (key: string) => {
      if (!onSort) return;
      const newDir =
        sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(key, newDir);
    },
    [sortKey, sortDirection, onSort],
  );

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------
  const paginationEnabled =
    pageSize != null &&
    page != null &&
    totalCount != null &&
    onPageChange != null;

  const totalPages = paginationEnabled
    ? Math.max(1, Math.ceil(totalCount! / pageSize!))
    : 1;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const totalCols = columns.length + (selectable ? 1 : 0);

  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto">
        <table className="w-full">
          {/* ---- Header ---- */}
          <thead className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm">
            <tr className="border-b border-default">
              {selectable && (
                <th className="w-10 bg-subtle px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={
                      selected.size === data.length && data.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded-sm border-default"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'bg-subtle px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted',
                    col.sortable &&
                      'cursor-pointer select-none hover:text-primary',
                  )}
                  onClick={
                    col.sortable ? () => handleSort(col.key) : undefined
                  }
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable &&
                      sortKey === col.key &&
                      (sortDirection === 'asc' ? (
                        <CaretUp size={12} weight="bold" />
                      ) : (
                        <CaretDown size={12} weight="bold" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* ---- Body ---- */}
          <tbody>
            {/* Loading skeleton */}
            {isLoading &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow
                  key={`skeleton-${i}`}
                  columnCount={columns.length}
                  selectable={selectable}
                />
              ))}

            {/* Empty state */}
            {!isLoading && data.length === 0 && (
              <tr>
                <td
                  colSpan={totalCols}
                  className="px-4 py-12 text-center text-secondary"
                >
                  <p className="text-sm">{emptyMessage}</p>
                  {emptyAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={emptyAction.onClick}
                    >
                      {emptyAction.label}
                    </Button>
                  )}
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!isLoading &&
              data.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selected.has(rowId);

                return (
                  <tr
                    key={rowId}
                    className={cn(
                      'border-b border-subtle transition-colors duration-[80ms] ease-linear hover:bg-subtle',
                      isSelected ? 'bg-subtle' : 'bg-surface',
                      onRowClick && 'cursor-pointer',
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="w-10 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelect(rowId);
                          }}
                          className="rounded-sm border-default"
                          aria-label={`Select row ${rowId}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-2.5 text-sm text-primary"
                      >
                        {col.render
                          ? col.render(row)
                          : String(
                              (row as Record<string, unknown>)[col.key] ?? '',
                            )}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ---- Pagination ---- */}
      {paginationEnabled && !isLoading && data.length > 0 && (
        <div className="flex items-center justify-between border-t border-subtle px-4 py-2.5">
          <span className="text-xs text-muted">
            Page {page! + 1} of {totalPages}
            {totalCount != null && (
              <span className="ml-1.5">({totalCount} total)</span>
            )}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              disabled={page === 0}
              onClick={() => onPageChange!(page! - 1)}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="xs"
              disabled={page! + 1 >= totalPages}
              onClick={() => onPageChange!(page! + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
