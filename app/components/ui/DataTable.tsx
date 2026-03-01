'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  onStatusChange?: (row: T) => void;
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
  onStatusChange,
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
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

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

  // Helper function to extract display value from a column (handles arrays of objects)
  const getDisplayValue = (col: Column<T>, row: T): string => {
    const rawValue = row[col.key as string];
    
    // Handle null/undefined
    if (rawValue === null || rawValue === undefined) return '';
    
    // Handle arrays of objects (like users array) - always check this first
    if (Array.isArray(rawValue)) {
      if (rawValue.length === 0) return '';
      // Check if it's an array of objects with a 'name' property (like users)
      if (typeof rawValue[0] === 'object' && rawValue[0] !== null && 'name' in rawValue[0]) {
        return rawValue.map((item: any) => item.name || String(item)).join(', ');
      }
      // Otherwise, join array items as strings
      return rawValue.map((item: any) => String(item)).join(', ');
    }
    
    // Handle objects
    if (typeof rawValue === 'object') {
      // If it has a 'name' property, use that
      if ('name' in rawValue) {
        return String((rawValue as any).name);
      }
      // Otherwise, try to stringify meaningfully
      return JSON.stringify(rawValue);
    }
    
    // For regular values, convert to string
    return String(rawValue);
  };

  // Convert data to CSV format (for file downloads)
  const convertToCSV = (data: T[]): string => {
    if (data.length === 0) return '';
    
    // Get headers from columns
    const headers = columns.map(col => capitalizeFirst(col.label));
    const csvRows = [headers.join(',')];
    
    // Get data rows
    data.forEach(row => {
      const values = columns.map(col => {
        const displayValue = getDisplayValue(col, row);
        // Handle values that might contain commas or quotes
        if (!displayValue) return '';
        const stringValue = displayValue.replace(/"/g, '""');
        return `"${stringValue}"`;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };

  // Convert data to TSV format (tab-separated, better for Excel paste)
  const convertToTSV = (data: T[]): string => {
    if (data.length === 0) return '';
    
    // Get headers from columns
    const headers = columns.map(col => capitalizeFirst(col.label));
    const tsvRows = [headers.join('\t')];
    
    // Get data rows
    data.forEach(row => {
      const values = columns.map(col => {
        const displayValue = getDisplayValue(col, row);
        // For TSV, we don't need quotes, but we should clean the value
        if (!displayValue) return '';
        // Remove any tabs from the value and replace with space
        return displayValue.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
      });
      tsvRows.push(values.join('\t'));
    });
    
    return tsvRows.join('\n');
  };

  // Copy to clipboard (using TSV for better Excel compatibility)
  const handleCopy = async () => {
    try {
      const tsvData = convertToTSV(sortedData);
      await navigator.clipboard.writeText(tsvData);
      toast.success('Data copied to clipboard! Paste into Excel to see columns.', { duration: 3000 });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy data to clipboard', { duration: 2000 });
    }
  };

  // Download CSV
  const handleCSV = () => {
    const csvData = convertToCSV(sortedData);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title || 'data'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV file downloaded!', { duration: 2000 });
  };

  // Download Excel (as CSV with .xlsx extension, or use CSV that Excel can open)
  const handleExcel = () => {
    const csvData = convertToCSV(sortedData);
    // Excel can open CSV files, but we'll add BOM for UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title || 'data'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Excel file downloaded!', { duration: 2000 });
  };

  // Download PDF
  const handlePDF = () => {
    // Create a new window with table content for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to generate PDF', { duration: 3000 });
      return;
    }

    // Build HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'Data Export'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>${title || 'Data Export'}</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${capitalizeFirst(col.label)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${sortedData.map(row => `
                <tr>
                  ${columns.map(col => {
                    const displayValue = getDisplayValue(col, row);
                    return `<td>${displayValue ? displayValue.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
      toast.success('PDF generation initiated!', { duration: 2000 });
    }, 250);
  };

  // Print table
  const handlePrint = () => {
    // Create a new window with table content for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print', { duration: 3000 });
      return;
    }

    // Build HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'Data Print'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>${title || 'Data Print'}</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${capitalizeFirst(col.label)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${sortedData.map(row => `
                <tr>
                  ${columns.map(col => {
                    const displayValue = getDisplayValue(col, row);
                    return `<td>${displayValue ? displayValue.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
      toast.success('Print dialog opened!', { duration: 2000 });
    }, 250);
  };

  const handleExport = (format: string) => {
    switch (format) {
      case 'Copy':
        handleCopy();
        break;
      case 'CSV':
        handleCSV();
        break;
      case 'Excel':
        handleExcel();
        break;
      case 'PDF':
        handlePDF();
        break;
      case 'Print':
        handlePrint();
        break;
      default:
        toast.error(`Export format "${format}" not supported`, { duration: 2000 });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown !== null) {
        const target = event.target as HTMLElement;
        // Check if click is outside the dropdown and the button
        const dropdownElement = document.querySelector('[data-dropdown-menu]');
        const buttonElement = dropdownRefs.current[openDropdown];
        
        if (
          dropdownElement && 
          !dropdownElement.contains(target) &&
          buttonElement &&
          !buttonElement.contains(target)
        ) {
          setOpenDropdown(null);
          setDropdownPosition(null);
        }
      }
    };

    if (openDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const toggleDropdown = (index: number, event?: React.MouseEvent) => {
    if (openDropdown === index) {
      setOpenDropdown(null);
      setDropdownPosition(null);
    } else {
      setOpenDropdown(index);
      // Calculate position for dropdown
      if (event) {
        const button = event.currentTarget as HTMLElement;
        const rect = button.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.right - 192, // 192px = w-48 (12rem)
        });
      }
    }
  };

  return (
    <div className="space-y-4" style={{ overflow: 'visible' }}>
      {title && (
        <h2 className="text-2xl font-bold text-[var(--foreground)]">{title}</h2>
      )}

      {/* Top Controls */}
      {/* <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {showExport && (
            <>
              <button
                type="button"
                onClick={() => handleExport('Copy')}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-green-700 hover:text-white transition-colors"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => handleExport('CSV')}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-green-700 hover:text-white transition-colors"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => handleExport('Excel')}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-green-700 hover:text-white transition-colors"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={() => handleExport('PDF')}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-green-700 hover:text-white transition-colors"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => handleExport('Print')}
                className="px-3 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-green-700 hover:text-white transition-colors"
              >
                Print
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
      </div> */}

      {/* Data Table */}
      <div className="overflow-x-auto" style={{ overflowY: 'visible', position: 'relative' }}>
        <table className="w-full border-collapse bg-transparent">
          <thead>
            <tr className="border-b border-gray-300">
              {onRowSelect && (
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    className="w-4 h-4 border-2 border-retro-dark rounded cursor-pointer"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`p-3 text-left font-bold text-retro-dark ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-transparent' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(String(column.key))}
                >
                  <div className="flex items-center gap-2">
                    {column.label.charAt(0).toUpperCase() + column.label.slice(1)}
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
              {(onEdit || onDelete || onStatusChange || renderActions) && (
                <th className="p-3 text-left font-bold text-retro-dark">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onRowSelect ? 1 : 0) + (onEdit || onDelete || onStatusChange || renderActions ? 1 : 0)}
                  className="p-8 text-center text-gray-500"
                >
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const isEven = index % 2 === 0;
                return (
                <tr key={index} className={`border-b border-gray-200 hover:bg-gray-200 transition-colors ${
                  isEven ? 'bg-gray-100' : 'bg-white'
                }`}>
                  {onRowSelect && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => handleSelectRow(index, row)}
                        className="w-4 h-4 border-2 border-retro-dark rounded cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={String(column.key)} className="p-3 text-retro-dark">
                      {column.render
                        ? column.render(row[column.key as string], row)
                        : row[column.key as string]}
                    </td>
                  ))}
                  {(onEdit || onDelete || onStatusChange || renderActions) && (
                    <td className="p-3">
                      {renderActions ? (
                        renderActions(row)
                      ) : (
                        <div className="relative z-50" ref={(el) => { dropdownRefs.current[index] = el; }}>
                          <button
                            type="button"
                            onClick={(e) => toggleDropdown(index, e)}
                            className="p-2 hover:bg-transparent rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-retro-accent"
                            aria-label="Actions"
                          >
                            <svg
                              className="w-5 h-5 text-retro-dark"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {openDropdown === index && dropdownPosition && typeof window !== 'undefined' && createPortal(
                            <div 
                              className="fixed w-48 bg-white border-2 border-retro-dark rounded-lg shadow-xl z-[9999]"
                              data-dropdown-menu
                              style={{ 
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`,
                              }}
                            >
                              <div className="py-1">
                                {onEdit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onEdit(row);
                                      setOpenDropdown(null);
                                      setDropdownPosition(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-retro-dark hover:bg-green-700 hover:text-white transition-colors font-bold"
                                  >
                                    Edit
                                  </button>
                                )}
                                {onStatusChange && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onStatusChange(row);
                                      setOpenDropdown(null);
                                      setDropdownPosition(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-bold"
                                  >
                                    Change Status
                                  </button>
                                )}
                                {onDelete && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDelete(row);
                                      setOpenDropdown(null);
                                      setDropdownPosition(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-bold"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>,
                            document.body
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-4">
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
            <div className="text-sm text-retro-dark">
              Showing {Math.min((currentPage - 1) * entriesPerPage + 1, sortedData.length)} to{' '}
              {Math.min(currentPage * entriesPerPage, sortedData.length)} of {sortedData.length}{' '}
              entries
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-green-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          ? 'bg-green-700 text-white'
                          : 'hover:bg-green-700 hover:text-white'
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
                className="px-4 py-2 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-sm hover:bg-green-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

