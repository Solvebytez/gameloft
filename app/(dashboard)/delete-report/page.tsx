'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import DatePicker from '@/app/components/ui/DatePicker';
import { useMatches } from '@/app/hooks/useMatches';
import { useEntries, Entry, useDeleteEntry } from '@/app/hooks/useEntries';
import { useUsers } from '@/app/hooks/useUsers';
import { useGroups } from '@/app/hooks/useGroups';
import { useQueries } from '@tanstack/react-query';

export default function DeleteReportPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
  const [isCalendarOpenFrom, setIsCalendarOpenFrom] = useState(false);
  const [isCalendarOpenTo, setIsCalendarOpenTo] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  
  const fromDateInputRef = useRef<HTMLInputElement>(null);
  const toDateInputRef = useRef<HTMLInputElement>(null);

  // Fetch all matches
  const { data: allMatches = [], isLoading: isLoadingMatches } = useMatches();
  
  // Fetch users
  const { data: users = [] } = useUsers();
  
  // Fetch groups
  const { data: groups = [] } = useGroups();

  // Delete entry mutation
  const deleteEntryMutation = useDeleteEntry();

  // Date validation function
  const validateDate = (dateValue: string): boolean => {
    if (!dateValue || dateValue.trim() === '') {
      return false;
    }
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dateRegex.test(dateValue)) {
      return false;
    }
    const [day, month, year] = dateValue.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return (
      dateObj.getDate() === day &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getFullYear() === year
    );
  };

  // Filter matches by date range and selected match
  const filteredMatches = useMemo(() => {
    let matches = allMatches;

    // Filter by selected match if provided
    if (selectedMatch && selectedMatch !== 'all') {
      matches = matches.filter((m) => String(m.id) === selectedMatch);
    }

    // Filter by date range if provided
    if (fromDate && validateDate(fromDate)) {
      const [fromDay, fromMonth, fromYear] = fromDate.split('-').map(Number);
      const fromDateObj = new Date(fromYear, fromMonth - 1, fromDay);
      
      matches = matches.filter((match) => {
        const matchDate = new Date(match.match_date);
        return matchDate >= fromDateObj;
      });
    }

    if (toDate && validateDate(toDate)) {
      const [toDay, toMonth, toYear] = toDate.split('-').map(Number);
      const toDateObj = new Date(toYear, toMonth - 1, toDay);
      // Set to end of day for inclusive comparison
      toDateObj.setHours(23, 59, 59, 999);
      
      matches = matches.filter((match) => {
        const matchDate = new Date(match.match_date);
        return matchDate <= toDateObj;
      });
    }

    return matches;
  }, [allMatches, selectedMatch, fromDate, toDate]);

  // Fetch entries for all filtered matches using useQueries
  const entryQueries = useQueries({
    queries: filteredMatches.map((match) => ({
      queryKey: ['entries', String(match.id), 'all'],
      queryFn: async () => {
        const { api } = await import('@/app/lib/api');
        const response = await api.get(`/v1/admin/matches/${match.id}/entries`);
        if (response.data.success) {
          return {
            matchId: match.id,
            matchName: match.match_between || `${match.team1.name} vs ${match.team2.name}`,
            entries: (response.data.data || []).map((entry: any) => ({
              ...entry,
              match_id: match.id,
              match_name: match.match_between || `${match.team1.name} vs ${match.team2.name}`,
            })),
          };
        }
        return { matchId: match.id, matchName: '', entries: [] };
      },
      enabled: filteredMatches.length > 0,
    })),
  });

  // Combine all entries from all matches
  const allEntries: Entry[] = useMemo(() => {
    const entries: Entry[] = [];
    entryQueries.forEach((query) => {
      if (query.data?.entries) {
        entries.push(...query.data.entries);
      }
    });
    return entries;
  }, [entryQueries]);

  // Filter entries by date range (on created_at) and group
  const filteredEntries = useMemo(() => {
    let entries = allEntries;

    // Filter by group if selected
    if (selectedGroup && selectedGroup !== 'all') {
      const selectedGroupObj = groups.find((g) => String(g.id) === selectedGroup);
      if (selectedGroupObj && selectedGroupObj.users) {
        const groupUserIds = selectedGroupObj.users.map((u) => u.id);
        entries = entries.filter((entry) => {
          if (!entry.user_id) return false;
          return groupUserIds.includes(entry.user_id);
        });
      } else {
        // If group not found or has no users, return empty array
        entries = [];
      }
    }

    // Filter by date range on entry created_at
    if (fromDate && validateDate(fromDate)) {
      const [fromDay, fromMonth, fromYear] = fromDate.split('-').map(Number);
      const fromDateObj = new Date(fromYear, fromMonth - 1, fromDay);
      
      entries = entries.filter((entry) => {
        if (!entry.created_at) return false;
        // Parse entry created_at as IST
        let dateStr = entry.created_at.trim();
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
          dateStr = dateStr.replace(' ', 'T') + '+05:30';
        }
        const entryDate = new Date(dateStr);
        return entryDate >= fromDateObj;
      });
    }

    if (toDate && validateDate(toDate)) {
      const [toDay, toMonth, toYear] = toDate.split('-').map(Number);
      const toDateObj = new Date(toYear, toMonth - 1, toDay);
      toDateObj.setHours(23, 59, 59, 999);
      
      entries = entries.filter((entry) => {
        if (!entry.created_at) return false;
        // Parse entry created_at as IST
        let dateStr = entry.created_at.trim();
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
          dateStr = dateStr.replace(' ', 'T') + '+05:30';
        }
        const entryDate = new Date(dateStr);
        return entryDate <= toDateObj;
      });
    }

    return entries;
  }, [allEntries, fromDate, toDate, selectedGroup, groups]);

  // Get unique users who have entries
  const usersWithEntries = useMemo(() => {
    const userIds = new Set(filteredEntries.map((entry) => entry.user_id).filter(Boolean));
    return users.filter((user) => userIds.has(user.id));
  }, [filteredEntries, users]);

  // Format date helper
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      // Parse date string as IST (backend sends dates in IST format)
      let dateStr = dateString.trim();
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        dateStr = dateStr.replace(' ', 'T') + '+05:30';
      }
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, day, hours, minutes] = match;
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthName = monthNames[parseInt(month) - 1];
        const shortYear = year.slice(-2);
        return `${parseInt(day)} ${monthName}, ${shortYear} ${hours}:${minutes}`;
      }
      return dateString;
    } catch (error) {
      return dateString;
    }
  };

  // Match options for dropdown
  const matchOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Matches' }];
    allMatches.forEach((match) => {
      options.push({
        value: String(match.id),
        label: match.match_between || `${match.team1.name} vs ${match.team2.name}`,
      });
    });
    return options;
  }, [allMatches]);

  // Group options for dropdown
  const groupOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Groups' }];
    groups.forEach((group) => {
      options.push({
        value: String(group.id),
        label: group.name,
      });
    });
    return options;
  }, [groups]);

  // Check if all entries are selected
  const isAllSelected = useMemo(() => {
    return filteredEntries.length > 0 && selectedEntries.size === filteredEntries.length;
  }, [filteredEntries.length, selectedEntries.size]);

  // Handle select all
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map((entry) => entry.id)));
    }
  };

  // Handle individual checkbox
  const handleToggleEntry = (entryId: number) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  // Handle delete selected entries
  const handleDeleteSelected = async () => {
    if (selectedEntries.size === 0) {
      toast.error('Please select at least one entry to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedEntries.size} entry/entries?`)) {
      return;
    }

    try {
      // Delete entries one by one
      const entryIds = Array.from(selectedEntries);
      for (const entryId of entryIds) {
        await deleteEntryMutation.mutateAsync(entryId);
      }
      setSelectedEntries(new Set());
      toast.success(`Successfully deleted ${entryIds.length} entry/entries`);
    } catch (error) {
      console.error('Error deleting entries:', error);
      toast.error('Failed to delete some entries');
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return filteredEntries.slice(startIndex, startIndex + entriesPerPage);
  }, [filteredEntries, currentPage, entriesPerPage]);

  // Reset to page 1 when entries per page changes
  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, selectedMatch, selectedGroup]);

  // Check if any query is loading
  const isLoadingEntries = entryQueries.some((query) => query.isLoading);

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          {/* Date Range, Match and Group Filter */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* From Date */}
            <div className="space-y-2">
              <label htmlFor="from-date" className="block text-sm font-bold text-retro-dark">
                From Date*
              </label>
              <div className="relative">
                <input
                  ref={fromDateInputRef}
                  type="text"
                  id="from-date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  onFocus={() => setIsCalendarOpenFrom(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsCalendarOpenFrom(false);
                    }
                  }}
                  placeholder="dd-mm-yyyy"
                  className="w-full px-3 py-1.5 bg-white border-2 border-retro-dark text-retro-dark font-bold text-xs rounded focus:outline-none focus:ring-2 focus:ring-retro-accent"
                  style={{ paddingRight: '2.5rem' }}
                />
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-retro-dark pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {isCalendarOpenFrom && (
                  <DatePicker
                    value={fromDate}
                    onChange={(date) => {
                      setFromDate(date);
                      setIsCalendarOpenFrom(false);
                    }}
                    onClose={() => setIsCalendarOpenFrom(false)}
                    isOpen={isCalendarOpenFrom}
                    inputId="from-date"
                  />
                )}
              </div>
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label htmlFor="to-date" className="block text-sm font-bold text-retro-dark">
                To Date*
              </label>
              <div className="relative">
                <input
                  ref={toDateInputRef}
                  type="text"
                  id="to-date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  onFocus={() => setIsCalendarOpenTo(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsCalendarOpenTo(false);
                    }
                  }}
                  placeholder="dd-mm-yyyy"
                  className="w-full px-3 py-1.5 bg-white border-2 border-retro-dark text-retro-dark font-bold text-xs rounded focus:outline-none focus:ring-2 focus:ring-retro-accent"
                  style={{ paddingRight: '2.5rem' }}
                />
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-retro-dark pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {isCalendarOpenTo && (
                  <DatePicker
                    value={toDate}
                    onChange={(date) => {
                      setToDate(date);
                      setIsCalendarOpenTo(false);
                    }}
                    onClose={() => setIsCalendarOpenTo(false)}
                    isOpen={isCalendarOpenTo}
                    inputId="to-date"
                  />
                )}
              </div>
            </div>

            {/* Match Filter */}
            <div className="space-y-2">
              <label htmlFor="select-match" className="block text-sm font-bold text-retro-dark">
                Select Match
              </label>
              <select
                id="select-match"
                value={selectedMatch}
                onChange={(e) => setSelectedMatch(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border-[3px] border-retro-dark text-retro-dark font-bold text-xs rounded focus:outline-none focus:ring-2 focus:ring-retro-accent"
                disabled={isLoadingMatches}
              >
                {matchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Group Filter */}
            <div className="space-y-2">
              <label htmlFor="select-group" className="block text-sm font-bold text-retro-dark">
                Select Group
              </label>
              <select
                id="select-group"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border-[3px] border-retro-dark text-retro-dark font-bold text-xs rounded focus:outline-none focus:ring-2 focus:ring-retro-accent"
              >
                {groupOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select All Button */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-4 py-1.5 bg-blue-500 text-white font-bold text-sm rounded hover:bg-blue-600 transition-colors"
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Entries Table */}
          {isLoadingEntries || isLoadingMatches ? (
            <div className="py-8 text-center">
              <p className="text-lg text-retro-dark">Loading entries...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-lg text-retro-dark">No entries found for the selected filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-transparent text-sm">
                  <thead>
                    <tr className="border-b-2 border-retro-dark bg-[var(--header)]">
                      <th className="px-3 py-2 text-left font-bold text-[var(--header-foreground)] w-12">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-retro-accent border-2 border-retro-dark rounded focus:ring-retro-accent"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-[var(--header-foreground)]">User Name</th>
                      <th className="px-3 py-2 text-left font-bold text-[var(--header-foreground)]">Match</th>
                      <th className="px-3 py-2 text-left font-bold text-[var(--header-foreground)]">Team1 Fav</th>
                      <th className="px-3 py-2 text-left font-bold text-[var(--header-foreground)]">Team1 NFav</th>
                      <th className="px-3 py-2 text-left font-bold text-[var(--header-foreground)]">Team2 Fav</th>
                      <th className="px-3 py-2 text-left font-bold text-[var(--header-foreground)]">Team2 NFav</th>
                      <th className="px-3 py-2 text-left font-bold text-[var(--header-foreground)]">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEntries.map((entry, index) => {
                      const user = users.find((u) => u.id === entry.user_id);
                      const isSelected = selectedEntries.has(entry.id);
                      const isEven = index % 2 === 0;
                      
                      return (
                        <tr
                          key={entry.id}
                          className={`border-b border-gray-200 hover:bg-gray-50 ${
                            isSelected 
                              ? 'bg-blue-50' 
                              : isEven 
                                ? 'bg-gray-100' 
                                : 'bg-white'
                          }`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleEntry(entry.id)}
                              className="w-4 h-4 text-retro-accent border-2 border-retro-dark rounded focus:ring-retro-accent"
                            />
                          </td>
                          <td className="px-3 py-2 text-retro-dark font-bold">
                            {user ? user.name : entry.customer || 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-retro-dark font-bold">
                            {entry.match_name || 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-retro-dark font-bold">
                            {entry.team1Fav && entry.team1Fav !== '0' && entry.team1Fav !== '0/0' && entry.team1Fav !== '0/0000' ? (
                              <span className="inline-block px-2 py-1 bg-green-700 text-white font-semibold text-xs rounded">
                                {entry.team1Fav}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-retro-dark font-bold">
                            {entry.team1Nfav && entry.team1Nfav !== '0' && entry.team1Nfav !== '0/0' && entry.team1Nfav !== '0/0000' ? (
                              <span className="inline-block px-2 py-1 bg-red-700 text-white font-semibold text-xs rounded">
                                {entry.team1Nfav}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-retro-dark font-bold">
                            {entry.team2Fav && entry.team2Fav !== '0' && entry.team2Fav !== '0/0' && entry.team2Fav !== '0/0000' ? (
                              <span className="inline-block px-2 py-1 bg-green-700 text-white font-semibold text-xs rounded">
                                {entry.team2Fav}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-retro-dark font-bold">
                            {entry.team2Nfav && entry.team2Nfav !== '0' && entry.team2Nfav !== '0/0' && entry.team2Nfav !== '0/0000' ? (
                              <span className="inline-block px-2 py-1 bg-red-700 text-white font-semibold text-xs rounded">
                                {entry.team2Nfav}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-retro-dark font-bold">
                            {formatDate(entry.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-retro-dark">Show:</span>
                  <select
                    value={entriesPerPage}
                    onChange={(e) => handleEntriesPerPageChange(e.target.value)}
                    className="px-3 py-1.5 border-2 border-retro-dark rounded text-sm font-semibold bg-white text-retro-dark focus:outline-none focus:ring-2 focus:ring-retro-accent"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-retro-dark">entries</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-retro-dark">
                    Showing {Math.min((currentPage - 1) * entriesPerPage + 1, filteredEntries.length)} to{' '}
                    {Math.min(currentPage * entriesPerPage, filteredEntries.length)} of {filteredEntries.length}{' '}
                    entries
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded text-sm font-semibold transition-opacity ${
                      currentPage === 1
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-700 text-white hover:opacity-90'
                    }`}
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        );
                      })
                      .map((page, index, array) => {
                        const prevPage = array[index - 1];
                        const showEllipsisBefore = prevPage && page - prevPage > 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsisBefore && (
                              <span className="px-2 py-1.5 text-sm text-retro-dark">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1.5 rounded text-sm font-semibold transition-opacity ${
                                currentPage === page
                                  ? 'bg-green-700 text-white'
                                  : 'bg-gray-200 text-retro-dark hover:bg-gray-300'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 rounded text-sm font-semibold transition-opacity ${
                      currentPage === totalPages
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-700 text-white hover:opacity-90'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Delete Button */}
          <div className="flex justify-start pt-4">
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedEntries.size === 0 || deleteEntryMutation.isPending}
              className={`px-4 py-1.5 bg-green-700 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity ${
                selectedEntries.size === 0 || deleteEntryMutation.isPending
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {deleteEntryMutation.isPending
                ? 'Deleting...'
                : `Delete Report (${selectedEntries.size} selected)`}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
