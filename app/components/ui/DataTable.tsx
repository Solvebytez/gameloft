'use client';

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  title?: string;
  data: T[];
  columns: Column<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onRowSelect?: (selectedRows: T[]) => void;
  renderActions?: (row: T) => React.ReactNode;
  showEntries?: boolean;
  showExport?: boolean;
  showSearch?: boolean;
  entriesPerPageOptions?: number[];
  defaultEntriesPerPage?: number;
}

export default function DataTable<T extends Record<string, any>>({
  title,
  data,
  columns,
  onEdit,
  onDelete,
  onRowSelect,
  renderActions,
  showEntries = true,
  showExport = true,
  showSearch = true,
  entriesPerPageOptions = [10, 25, 50, 100],
  defaultEntriesPerPage = 100,
}: DataTableProps<T>) {
  const [entriesPerPage, setEntriesPerPage] = useState(defaultEntriesPerPage);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Search functionality
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter((row) =>
      columns.some((col) => {
        const value = row[col.key as string];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Sort functionality
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue > bValue ? 1 : -1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / entriesPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return sortedData.slice(startIndex, startIndex + entriesPerPage);
  }, [sortedData, currentPage, entriesPerPage]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key && prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIndices = new Set(paginatedData.map((_, index) => index));
      setSelectedRows(allIndices);
      if (onRowSelect) {
        onRowSelect(paginatedData);
      }
    } else {
      setSelectedRows(new Set());
      if (onRowSelect) {
        onRowSelect([]);
      }
    }
  };

  const handleSelectRow = (index: number, row: T) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    if (onRowSelect) {
      const selected = paginatedData.filter((_, i) => newSelected.has(i));
      onRowSelect(selected);
    }
  };

  const handleExport = (format: string) => {
    toast.success(`Exporting to ${format}...`, { duration: 2000 });
    // Export logic will be implemented here
  };

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-2xl font-bold text-[var(--foreground)]">{title}</h2>
      )}

      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {showEntries && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-retro-dark">Show</label>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm focus:outline-none focus:ring-2 focus:ring-retro-accent"
            >
              {entriesPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <label className="text-sm text-retro-dark">entries</label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {showExport && (
            <>
              <button
                type="button"
                onClick={() => handleExport('Copy')}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-retro-accent hover:text-white transition-colors"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => handleExport('CSV')}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-retro-accent hover:text-white transition-colors"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => handleExport('Excel')}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-retro-accent hover:text-white transition-colors"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={() => handleExport('PDF')}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-retro-accent hover:text-white transition-colors"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => handleExport('Print')}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-retro-accent hover:text-white transition-colors"
              >
                Print
              </button>
              <button
                type="button"
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-retro-accent hover:text-white transition-colors"
              >
                Column visibility
              </button>
            </>
          )}

          {showSearch && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-retro-dark">Search:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm focus:outline-none focus:ring-2 focus:ring-retro-accent"
                placeholder="Search..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                  className="w-4 h-4 border-2 border-retro-dark rounded cursor-pointer"
                />
              </th>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`p-3 text-left font-bold text-retro-dark ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(String(column.key))}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable !== false && (
                      <div className="flex flex-col">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 12l5-5 5 5H5z" />
                        </svg>
                        <svg className="w-3 h-3 -mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M15 8l-5 5-5-5h10z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete || renderActions) && (
                <th className="p-3 text-left font-bold text-retro-dark">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1 + (onEdit || onDelete || renderActions ? 1 : 0)}
                  className="p-8 text-center text-gray-500"
                >
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(index)}
                      onChange={() => handleSelectRow(index, row)}
                      className="w-4 h-4 border-2 border-retro-dark rounded cursor-pointer"
                    />
                  </td>
                  {columns.map((column) => (
                    <td key={String(column.key)} className="p-3 text-retro-dark">
                      {column.render
                        ? column.render(row[column.key as string], row)
                        : row[column.key as string]}
                    </td>
                  ))}
                  {(onEdit || onDelete || renderActions) && (
                    <td className="p-3">
                      {renderActions ? (
                        renderActions(row)
                      ) : (
                        <div className="flex gap-2">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className="px-4 py-2 bg-blue-500 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity"
                            >
                              Edit
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              className="px-4 py-2 bg-red-500 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="text-sm text-retro-dark">
            Showing {Math.min((currentPage - 1) * entriesPerPage + 1, sortedData.length)} to{' '}
            {Math.min(currentPage * entriesPerPage, sortedData.length)} of {sortedData.length}{' '}
            entries
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-retro-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page Number Buttons */}
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const shouldShow =
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  if (!shouldShow) {
                    // Show ellipsis
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 py-2 text-retro-dark font-bold text-sm">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm transition-colors ${
                        currentPage === page
                          ? 'bg-retro-accent text-white'
                          : 'hover:bg-retro-accent hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-retro-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

