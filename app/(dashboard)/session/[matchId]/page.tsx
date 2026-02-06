'use client';

import React, { useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import { useInningsOvers } from '@/app/hooks/useInningsOvers';
import { useUsers } from '@/app/hooks/useUsers';
import { useGroups } from '@/app/hooks/useGroups';
import { useMatch } from '@/app/hooks/useMatches';
import { useSessions, useCreateSession, useUpdateSession, useDeleteSession, useUpdateResultByInningsOver, Session } from '@/app/hooks/useSessions';

export default function SessionMatchPage() {
  const params = useParams();
  const matchId = params.matchId ? (Array.isArray(params.matchId) ? params.matchId[0] : params.matchId) : null;
  const matchIdNumber = matchId ? parseInt(matchId) : null;

  // Fetch match data
  const { data: matchData, isLoading: isLoadingMatch } = useMatch(matchIdNumber);

  // Form state
  const [formData, setFormData] = useState({
    match_id: matchIdNumber ? String(matchIdNumber) : '',
    user_id: '',
    inningOver: '',
    entryRun: '',
    amount: '',
    isYes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Session | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [isAddResultFormOpen, setIsAddResultFormOpen] = useState(false);
  const [addResultFormData, setAddResultFormData] = useState({
    inningOver: '',
    result: '',
  });
  const [addResultErrors, setAddResultErrors] = useState<Record<string, string>>({});
  // Filter state
  const [filters, setFilters] = useState({
    user_id: '',
    group_id: '',
    inningOver: '',
    isYes: '',
    groupBy: '',
  });

  // match_id is already initialized in useState above with matchIdNumber

  // Helper to update filters and reset pagination
  const updateFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // API hooks - filter sessions by match_id
  const { data: sessions = [] as Session[], isLoading: isLoadingSessions } = useSessions(matchIdNumber);
  const createSessionMutation = useCreateSession();
  const updateSessionMutation = useUpdateSession();
  const deleteSessionMutation = useDeleteSession();
  const updateResultByInningsOverMutation = useUpdateResultByInningsOver();

  // Refs for keyboard navigation
  const userSelectRef = useRef<HTMLSelectElement>(null);
  const inningOverSelectRef = useRef<HTMLSelectElement>(null);
  const entryRunInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const isYesSelectRef = useRef<HTMLSelectElement>(null);
  // Refs for Add result form
  const addResultInningOverSelectRef = useRef<HTMLSelectElement>(null);
  const addResultResultInputRef = useRef<HTMLInputElement>(null);

  // Fetch users, groups, and innings/overs for dropdowns
  const { data: users = [] } = useUsers();
  const { data: groups = [] } = useGroups();
  const { data: inningsOvers = [] } = useInningsOvers();

  // Filter active users and create dropdown options
  const userOptions = useMemo(() => {
    const activeUsers = users.filter((user) => user.status === 'active');
    const options = [{ value: '', label: '--SELECT--' }];
    activeUsers.forEach((user) => {
      options.push({
        value: String(user.id),
        label: user.name,
      });
    });
    return options;
  }, [users]);

  // Create innings/over options
  const inningOverOptions = useMemo(() => {
    const options = [{ value: '', label: '--SELECT--' }];
    inningsOvers.forEach((io) => {
      options.push({
        value: `${io.inning}/${io.over}`,
        label: `${io.inning}/${io.over} Over`,
      });
    });
    return options;
  }, [inningsOvers]);

  // Create group options from all groups created by this admin
  const groupOptions = useMemo(() => {
    const options = [{ value: '', label: '--SELECT--' }];
    groups.forEach((group) => {
      options.push({
        value: String(group.id),
        label: group.name,
      });
    });
    return options;
  }, [groups]);

  // Transform sessions data to match table format and apply filters
  const sessionData = useMemo(() => {
    let filteredSessions: Session[] = (sessions as Session[]) || [];
    
    // Apply filters
    if (filters.user_id && filters.user_id !== '') {
      filteredSessions = filteredSessions.filter((session) => session.user_id === parseInt(filters.user_id));
    }
    if (filters.group_id && filters.group_id !== '') {
      // Find group name from group_id
      const selectedGroup = groups.find((g) => g.id === parseInt(filters.group_id));
      if (selectedGroup) {
        filteredSessions = filteredSessions.filter((session) => session.group_name === selectedGroup.name);
      }
    }
    if (filters.inningOver && filters.inningOver !== '') {
      filteredSessions = filteredSessions.filter((session) => session.inning_over === filters.inningOver);
    }
    if (filters.isYes && filters.isYes !== '') {
      const isYes = filters.isYes === 'yes';
      filteredSessions = filteredSessions.filter((session) => session.is_yes === isYes);
    }
    
    let mappedSessions = filteredSessions.map((session) => ({
      id: session.id,
      match_id: session.match_id,
      match_name: session.match_name,
      user_id: session.user_id,
      user_name: session.user_name,
      group_name: session.group_name || null,
      inningOver: session.inning_over,
      entryRun: session.entry_run,
      amount: session.amount,
      isYes: session.is_yes,
      result: session.result,
      netProfitLoss: session.net_profit_loss,
    }));

    // Apply grouping if selected
    if (filters.groupBy && filters.groupBy !== '') {
      const grouped = new Map();
      
      mappedSessions.forEach((session) => {
        let groupKey = '';
        if (filters.groupBy === 'user') {
          groupKey = session.user_name || `User ${session.user_id}`;
        } else if (filters.groupBy === 'inningOver') {
          groupKey = session.inningOver;
        } else if (filters.groupBy === 'isYes') {
          groupKey = session.isYes ? 'Yes' : 'No';
        } else if (filters.groupBy === 'group') {
          groupKey = session.group_name || 'No Group';
        }
        
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, []);
        }
        grouped.get(groupKey).push(session);
      });
      
      // Sort by group key and flatten
      const sortedGroups = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      mappedSessions = sortedGroups.flatMap(([_, sessions]) => sessions);
    }
    
    return mappedSessions;
  }, [sessions, filters, groups]);

  // Pagination logic
  const totalPages = Math.ceil(sessionData.length / entriesPerPage);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return sessionData.slice(startIndex, startIndex + entriesPerPage);
  }, [sessionData, currentPage, entriesPerPage]);

  // Reset to page 1 when entries per page changes
  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Calculate summary totals
  const summary = useMemo(() => {
    const totalSale = sessionData.reduce((sum, entry) => sum + entry.amount, 0);
    const totalProfitLoss = sessionData.reduce((sum, entry) => sum + entry.netProfitLoss, 0);
    const commission = totalSale * 0.05; // 5% commission
    const profitLossAfterCommission = totalProfitLoss - commission;

    return {
      totalSale,
      profitLoss: totalProfitLoss,
      commission,
      profitLossAfterCommission,
    };
  }, [sessionData]);

  // Calculate net profit/loss based on entry run, result, amount, and yes/no
  // Note: Result is not in form, calculation happens on backend
  const calculateNetProfitLoss = useMemo(() => {
    // This calculation is handled on the backend when result is provided
    return 0;
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    // Validation
    if (!formData.match_id) {
      newErrors.match_id = 'Match is required';
    }
    if (!formData.user_id) {
      newErrors.user_id = 'User is required';
    }
    if (!formData.inningOver) {
      newErrors.inningOver = 'Inning/Over is required';
    }
    if (!formData.entryRun.trim()) {
      newErrors.entryRun = 'Entry Run is required';
    } else {
      const entryRun = parseFloat(formData.entryRun);
      if (isNaN(entryRun) || entryRun < 0) {
        newErrors.entryRun = 'Entry Run must be a valid number';
      }
    }
    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      }
    }

    // Set errors and show toast if validation fails
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError, { duration: 3000 });
      return;
    }

    // Clear all errors
    setErrors({});

    try {
      if (isEditMode && editingEntry) {
        // Update existing entry
        const updatePayload: {
          match_id?: number;
          user_id?: number;
          inning_over?: string;
          entry_run?: number;
          amount?: number;
          is_yes?: boolean;
          result?: number | null;
        } = {};

        if (formData.match_id !== editingEntry.match_id.toString()) {
          updatePayload.match_id = parseInt(formData.match_id);
        }
        if (formData.user_id !== editingEntry.user_id.toString()) {
          updatePayload.user_id = parseInt(formData.user_id);
        }
        if (formData.inningOver !== editingEntry.inning_over) {
          updatePayload.inning_over = formData.inningOver;
        }
        if (formData.entryRun !== editingEntry.entry_run.toString()) {
          updatePayload.entry_run = parseFloat(formData.entryRun);
        }
        if (formData.amount !== editingEntry.amount.toString()) {
          updatePayload.amount = parseFloat(formData.amount);
        }
        if ((formData.isYes === 'yes') !== editingEntry.is_yes) {
          updatePayload.is_yes = formData.isYes === 'yes';
        }

        if (Object.keys(updatePayload).length > 0) {
          await updateSessionMutation.mutateAsync({
            id: editingEntry.id,
            payload: updatePayload,
          });
        } else {
          toast('No changes to save', { duration: 2000 });
        }

        setIsEditMode(false);
        setEditingEntry(null);
        // Don't reset form - keep the data
      } else {
        // Create new entry
        await createSessionMutation.mutateAsync({
          match_id: parseInt(formData.match_id),
          user_id: parseInt(formData.user_id),
          inning_over: formData.inningOver,
          entry_run: parseFloat(formData.entryRun),
          amount: parseFloat(formData.amount),
          is_yes: formData.isYes === 'yes',
        });
        // Don't reset form - keep the data for next entry
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry');
    }
  };

  const handleReset = () => {
    setFormData({
      match_id: matchIdNumber ? String(matchIdNumber) : '',
      user_id: '',
      inningOver: '',
      entryRun: '',
      amount: '',
      isYes: '',
    });
    setErrors({});
    setIsEditMode(false);
    setEditingEntry(null);
    toast.success('Form reset', { duration: 2000 });
  };

  const handleEdit = (entry: typeof sessionData[0]) => {
    const session = (sessions as Session[]).find((s) => s.id === entry.id);
    if (!session) {
      toast.error('Session not found', { duration: 2000 });
      return;
    }

    setIsEditMode(true);
    setEditingEntry(session);
    setFormData({
      match_id: session.match_id.toString(),
      user_id: session.user_id.toString(),
      inningOver: session.inning_over,
      entryRun: session.entry_run.toString(),
      amount: session.amount.toString(),
      isYes: session.is_yes ? 'yes' : 'no',
    });
    setErrors({});
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingEntry(null);
    setFormData({
      match_id: matchIdNumber ? String(matchIdNumber) : '',
      user_id: '',
      inningOver: '',
      entryRun: '',
      amount: '',
      isYes: '',
    });
    setErrors({});
  };

  const handleDelete = (entry: typeof sessionData[0]) => {
    if (confirm(`Are you sure you want to delete this entry?`)) {
      deleteSessionMutation.mutate(entry.id);
    }
  };

  // Handle Enter key to navigate between fields
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      // Navigation flow: User → Inning/Over → Entry Run → Amount → Yes/No → Submit
      if (field === 'user_id') {
        requestAnimationFrame(() => {
          inningOverSelectRef.current?.focus();
        });
      } else if (field === 'inningOver') {
        requestAnimationFrame(() => {
          entryRunInputRef.current?.focus();
          entryRunInputRef.current?.select();
        });
      } else if (field === 'entryRun') {
        requestAnimationFrame(() => {
          amountInputRef.current?.focus();
          amountInputRef.current?.select();
        });
      } else if (field === 'amount') {
        requestAnimationFrame(() => {
          isYesSelectRef.current?.focus();
        });
      } else if (field === 'isYes') {
        // Submit form when Enter is pressed on Yes/No field
        handleSave();
      }
    }
  };

  // Show loading state if match is loading
  if (isLoadingMatch || !matchData) {
    return (
      <div className="space-y-6">
        <div className="py-8 text-center">
          <p className="text-lg text-retro-dark">Loading match...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Session</h1>
        <p className="text-sm text-retro-dark/60 mt-1">
          {matchData ? `${matchData.team1.name} vs ${matchData.team2.name}` : 'Session Entry'}
        </p>
      </div>

      {/* Form and Table Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-6">
        {/* Form Card */}
        <Card>
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {/* Team Logos Display - Always show since match is selected */}
          {matchData && (
            <div className="flex justify-center">
              <div className="w-full max-w-2xl bg-[var(--retro-cream)] border-4 border-[var(--retro-dark)] rounded-lg p-4">
                <div className="flex items-center justify-center gap-6">
                  {/* Team 1 */}
                  <div className="flex flex-col items-center space-y-2 flex-1">
                    <div className="relative w-20 h-20 border-2 border-retro-dark rounded overflow-hidden flex-shrink-0 bg-white">
                      {matchData.team1.logo ? (
                        <Image
                          src={matchData.team1.logo}
                          alt={matchData.team1.name}
                          width={80}
                          height={80}
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-retro-dark text-xs font-bold">
                          {matchData.team1.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="inline-block px-3 py-1.5 bg-retro-accent/10 text-retro-accent font-bold text-sm rounded-full border-2 border-retro-accent text-center">
                      {matchData.team1.name}
                    </span>
                  </div>

                  {/* V/S Separator */}
                  <div className="flex items-center justify-center flex-shrink-0">
                    <span className="w-12 h-12 rounded-full bg-retro-dark text-white font-bold text-lg flex items-center justify-center">
                      V/S
                    </span>
                  </div>

                  {/* Team 2 */}
                  <div className="flex flex-col items-center space-y-2 flex-1">
                    <div className="relative w-20 h-20 border-2 border-retro-dark rounded overflow-hidden flex-shrink-0 bg-white">
                      {matchData.team2.logo ? (
                        <Image
                          src={matchData.team2.logo}
                          alt={matchData.team2.name}
                          width={80}
                          height={80}
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-retro-dark text-xs font-bold">
                          {matchData.team2.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="inline-block px-3 py-1.5 bg-retro-accent/10 text-retro-accent font-bold text-sm rounded-full border-2 border-retro-accent text-center">
                      {matchData.team2.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              ref={userSelectRef}
              label="User*"
              id="user_id"
              value={formData.user_id}
              onChange={(e) => handleInputChange('user_id', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'user_id')}
              options={userOptions}
              error={errors.user_id}
            />

            <Select
              ref={inningOverSelectRef}
              label="Inning/Over*"
              id="inningOver"
              value={formData.inningOver}
              onChange={(e) => handleInputChange('inningOver', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'inningOver')}
              options={inningOverOptions}
              error={errors.inningOver}
            />

            <Input
              ref={entryRunInputRef}
              type="number"
              label="Entry Run*"
              id="entryRun"
              value={formData.entryRun}
              onChange={(e) => handleInputChange('entryRun', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'entryRun')}
              error={errors.entryRun}
              placeholder="Enter entry run"
              min="0"
              className="placeholder:text-sm"
            />

            <Input
              ref={amountInputRef}
              type="number"
              label="Amount*"
              id="amount"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'amount')}
              error={errors.amount}
              placeholder="Enter amount"
              min="0"
              className="placeholder:text-sm"
            />

            <Select
              ref={isYesSelectRef}
              label="Yes/No*"
              id="isYes"
              value={formData.isYes}
              onChange={(e) => handleInputChange('isYes', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'isYes')}
              options={[
                { value: '', label: '--SELECT--' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
              error={errors.isYes}
            />
          </div>

          {/* Calculated Net Profit/Loss Display */}
          {false && (
            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-retro-dark">Calculated Net Profit/Loss:</span>
                <span
                  className={`font-bold text-lg ${
                    calculateNetProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {calculateNetProfitLoss >= 0 ? '+' : ''}
                  {calculateNetProfitLoss.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            {isEditMode && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-3 bg-gray-500 text-white font-bold text-lg rounded hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity"
            >
              {isEditMode ? 'Update' : 'Save'}
            </button>
            {!isEditMode && (
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 bg-red-500 text-white font-bold text-lg rounded hover:opacity-90 transition-opacity"
              >
                Reset
              </button>
            )}
          </div>
        </form>
        </Card>

        {/* Session Entries Table */}
        <Card>
        <div className="mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Session Entries</h2>
              <p className="text-sm text-retro-dark/60 mt-1">
                {sessionData.length} {sessionData.length === 1 ? 'entry' : 'entries'} found
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddResultFormOpen(!isAddResultFormOpen)}
                className="px-4 py-2 bg-retro-accent text-white font-bold text-sm rounded hover:opacity-90 transition-opacity flex-shrink-0"
              >
                Add result
              </button>
              <div className={`flex items-center gap-2 bg-white border-2 border-retro-dark rounded-lg p-2 transition-all duration-300 ease-in-out ${
                isAddResultFormOpen 
                  ? 'opacity-100 max-w-[800px] visible' 
                  : 'opacity-0 max-w-0 invisible overflow-hidden p-0 border-0'
              }`}>
                  <Select
                    ref={addResultInningOverSelectRef}
                    label=""
                    id="add_result_inning_over"
                    value={addResultFormData.inningOver}
                    onChange={(e) => {
                      setAddResultFormData((prev) => ({ ...prev, inningOver: e.target.value }));
                      if (addResultErrors.inningOver) {
                        setAddResultErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.inningOver;
                          return newErrors;
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        requestAnimationFrame(() => {
                          addResultResultInputRef.current?.focus();
                          addResultResultInputRef.current?.select();
                        });
                      }
                    }}
                    options={inningOverOptions}
                    error={addResultErrors.inningOver}
                    className="!mb-0"
                    containerClassName="mb-0"
                  />
                  <Input
                    ref={addResultResultInputRef}
                    type="number"
                    label=""
                    id="add_result_result"
                    value={addResultFormData.result}
                    onChange={(e) => {
                      setAddResultFormData((prev) => ({ ...prev, result: e.target.value }));
                      if (addResultErrors.result) {
                        setAddResultErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.result;
                          return newErrors;
                        });
                      }
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        // Submit form when Enter is pressed on result field
                        const newErrors: Record<string, string> = {};
                        
                        if (!addResultFormData.inningOver) {
                          newErrors.inningOver = 'Inning/Over is required';
                        }
                        if (!addResultFormData.result.trim()) {
                          newErrors.result = 'Result is required';
                        } else {
                          const result = parseFloat(addResultFormData.result);
                          if (isNaN(result) || result < 0) {
                            newErrors.result = 'Result must be a valid number';
                          }
                        }

                        if (Object.keys(newErrors).length > 0) {
                          setAddResultErrors(newErrors);
                          const firstError = Object.values(newErrors)[0];
                          toast.error(firstError, { duration: 3000 });
                          return;
                        }

                        try {
                          // Call backend to update all entries matching this innings/over
                          await updateResultByInningsOverMutation.mutateAsync({
                            inning_over: addResultFormData.inningOver,
                            result: parseFloat(addResultFormData.result),
                          });
                          
                          // Clear only the result field, keep innings/over selected and form open
                          setAddResultFormData((prev) => ({ ...prev, result: '' }));
                          setAddResultErrors({});
                          // Keep form open - don't close it
                          // Success toast is handled in the mutation's onSuccess
                        } catch (error) {
                          console.error('Error updating result:', error);
                          // Error toast is handled in the mutation's onError
                        }
                      }
                    }}
                    error={addResultErrors.result}
                    placeholder="Result"
                    min="0"
                    className="placeholder:text-sm !mb-0"
                    containerClassName="mb-0"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const newErrors: Record<string, string> = {};
                      
                      if (!addResultFormData.inningOver) {
                        newErrors.inningOver = 'Inning/Over is required';
                      }
                      if (!addResultFormData.result.trim()) {
                        newErrors.result = 'Result is required';
                      } else {
                        const result = parseFloat(addResultFormData.result);
                        if (isNaN(result) || result < 0) {
                          newErrors.result = 'Result must be a valid number';
                        }
                      }

                      if (Object.keys(newErrors).length > 0) {
                        setAddResultErrors(newErrors);
                        const firstError = Object.values(newErrors)[0];
                        toast.error(firstError, { duration: 3000 });
                        return;
                      }

                      try {
                        // Call backend to update all entries matching this innings/over
                        await updateResultByInningsOverMutation.mutateAsync({
                          inning_over: addResultFormData.inningOver,
                          result: parseFloat(addResultFormData.result),
                        });
                        
                        // Clear only the result field, keep innings/over selected and form open
                        setAddResultFormData((prev) => ({ ...prev, result: '' }));
                        setAddResultErrors({});
                        // Keep form open - don't close it
                        // Success toast is handled in the mutation's onSuccess
                      } catch (error) {
                        console.error('Error updating result:', error);
                        // Error toast is handled in the mutation's onError
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddResultFormOpen(false);
                      setAddResultFormData({ inningOver: '', result: '' });
                      setAddResultErrors({});
                    }}
                    className="px-4 py-2 bg-gray-500 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Cancel
                  </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 pr-6">
          {/* Filter Section - Card */}
          <Card className="mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-retro-dark whitespace-nowrap">Filter by:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <label htmlFor="filter_user_id" className="text-sm font-semibold text-retro-dark whitespace-nowrap">
                    User:
                  </label>
                  <Select
                    label=""
                    id="filter_user_id"
                    value={filters.user_id}
                    onChange={(e) => updateFilters({ ...filters, user_id: e.target.value })}
                    options={userOptions}
                    className="!mb-0"
                    containerClassName="mb-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="filter_group_id" className="text-sm font-semibold text-retro-dark whitespace-nowrap">
                    Group:
                  </label>
                  <Select
                    label=""
                    id="filter_group_id"
                    value={filters.group_id}
                    onChange={(e) => updateFilters({ ...filters, group_id: e.target.value })}
                    options={groupOptions}
                    className="!mb-0"
                    containerClassName="mb-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="filter_inningOver" className="text-sm font-semibold text-retro-dark whitespace-nowrap">
                    Inning/Over:
                  </label>
                  <Select
                    label=""
                    id="filter_inningOver"
                    value={filters.inningOver}
                    onChange={(e) => updateFilters({ ...filters, inningOver: e.target.value })}
                    options={inningOverOptions}
                    className="!mb-0"
                    containerClassName="mb-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="filter_isYes" className="text-sm font-semibold text-retro-dark whitespace-nowrap">
                    Yes/No:
                  </label>
                  <Select
                    label=""
                    id="filter_isYes"
                    value={filters.isYes}
                    onChange={(e) => updateFilters({ ...filters, isYes: e.target.value })}
                    options={[
                      { value: '', label: '--SELECT--' },
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                    ]}
                    className="!mb-0"
                    containerClassName="mb-0"
                  />
                </div>
                {(filters.user_id || filters.group_id || filters.inningOver || filters.isYes) && (
                  <button
                    type="button"
                    onClick={() => updateFilters({ ...filters, user_id: '', group_id: '', inningOver: '', isYes: '' })}
                    className="px-4 py-2 bg-gray-500 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Loading overlay when updating results */}
          {updateResultByInningsOverMutation.isPending && (
            <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-semibold">Updating results and calculating profits...</span>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-transparent">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-gray-300 bg-[var(--header)]">
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)]">Name</th>
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)]">Inning/Over</th>
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)]">Entry Run</th>
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)]">
                    <div>Amount</div>
                    <div className="text-xs font-normal">(Y/N)</div>
                  </th>
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)]">Result</th>
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)]">
                    <div>Net Profit</div>
                    <div className="text-xs font-normal">Loss</div>
                  </th>
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)]">Actions</th>
                </tr>
              </thead>
              {/* Table Body */}
              <tbody>
                {isLoadingSessions ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-retro-dark/60">
                      Loading sessions...
                    </td>
                  </tr>
                ) : sessionData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-retro-dark/60">
                      No entries found. Create your first entry above.
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-200 hover:bg-transparent">
                      <td className="px-3 py-1.5 text-retro-dark">{entry.user_name}</td>
                      <td className="px-3 py-1.5 text-retro-dark">{entry.inningOver}</td>
                      <td className="px-3 py-1.5 text-retro-dark">{entry.entryRun}</td>
                      <td className="px-3 py-1.5 text-retro-dark">
                        <div>{entry.amount.toLocaleString()}</div>
                        <div className={`text-xs font-bold ${entry.isYes ? 'text-green-600' : 'text-red-600'}`}>
                          ({entry.isYes ? 'Y' : 'N'})
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-retro-dark">{entry.result !== null && entry.result !== undefined ? entry.result : 'N/A'}</td>
                      <td className="px-3 py-1.5 text-retro-dark">
                        <span
                          className={`inline-block px-3 py-1 rounded font-semibold ${
                            entry.netProfitLoss >= 0
                              ? 'bg-green-200 text-green-800'
                              : 'bg-red-200 text-red-800'
                          }`}
                        >
                          {entry.netProfitLoss >= 0 ? '+' : ''}
                          {entry.netProfitLoss.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-retro-dark">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdownId(openDropdownId === entry.id ? null : entry.id)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-sm font-bold rounded hover:bg-gray-300 transition-colors"
                            aria-label="Actions"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </button>
                          {openDropdownId === entry.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenDropdownId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-32 bg-white border-2 border-retro-dark rounded-lg shadow-lg z-20">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleEdit(entry);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors first:rounded-t-lg"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDelete(entry);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors last:rounded-b-lg"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {sessionData.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-retro-dark">Show:</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => handleEntriesPerPageChange(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm font-semibold bg-white text-retro-dark focus:outline-none focus:ring-2 focus:ring-retro-accent"
                >
                  <option value="10">10</option>
                  <option value="100">100</option>
                  <option value="300">300</option>
                  <option value="500">500</option>
                </select>
                <span className="text-sm text-retro-dark">entries</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-retro-dark">
                  Showing {Math.min((currentPage - 1) * entriesPerPage + 1, sessionData.length)} to{' '}
                  {Math.min(currentPage * entriesPerPage, sessionData.length)} of {sessionData.length}{' '}
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
                      : 'bg-retro-accent text-white hover:opacity-90'
                  }`}
                >
                  Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, index, array) => {
                      // Add ellipsis between non-consecutive pages
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
                                ? 'bg-retro-accent text-white'
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
                      : 'bg-retro-accent text-white hover:opacity-90'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Summary Section */}
          <div className="mt-6 flex justify-center">
            <div className="w-full max-w-md bg-[var(--retro-cream)] border-4 border-[var(--retro-dark)] rounded-lg">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b-2 border-[var(--retro-dark)]/30">
                    <td className="px-4 py-2 text-left font-semibold text-retro-dark border-r-2 border-[var(--retro-dark)]/30">Total Sale:</td>
                    <td className="px-4 py-2 text-right font-bold text-retro-dark">{summary.totalSale.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b-2 border-[var(--retro-dark)]/30">
                    <td className="px-4 py-2 text-left font-semibold text-retro-dark border-r-2 border-[var(--retro-dark)]/30">Profit/Loss:</td>
                    <td className="px-4 py-2 text-right font-bold text-retro-dark">{summary.profitLoss.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b-2 border-[var(--retro-dark)]/30">
                    <td className="px-4 py-2 text-left font-semibold text-retro-dark border-r-2 border-[var(--retro-dark)]/30">Com (5%):</td>
                    <td className="px-4 py-2 text-right font-bold text-retro-dark">{summary.commission.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b-2 border-[var(--retro-dark)]/30">
                    <td className="px-4 py-2 text-left font-semibold text-retro-dark border-r-2 border-[var(--retro-dark)]/30">Profit/Loss (0%):</td>
                    <td className="px-4 py-2 text-right font-bold text-retro-dark">0</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-left font-semibold text-retro-dark border-r-2 border-[var(--retro-dark)]/30">Profit Loss:</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`font-bold ${
                          summary.profitLossAfterCommission >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {summary.profitLossAfterCommission >= 0 ? '+' : ''}
                        {summary.profitLossAfterCommission.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </Card>
      </div>
    </div>
  );
}

