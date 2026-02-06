'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import { useMatch, Match } from '@/app/hooks/useMatches';
import { useUsers } from '@/app/hooks/useUsers';
import { useEntries, useCreateEntry, useUpdateEntry, useEntry, Entry } from '@/app/hooks/useEntries';
import toast from 'react-hot-toast';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;

  // Fetch match data from API
  const { data: matchData, isLoading, error } = useMatch(matchId);
  
  // Fetch users list (already filtered by current admin in backend)
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();


  // Fetch entries for this match
  const { data: entriesData, isLoading: isLoadingEntries } = useEntries(matchId || undefined);
  const allEntries: Entry[] = entriesData?.data || [];

  // Create entry mutation
  const createEntryMutation = useCreateEntry();
  const updateEntryMutation = useUpdateEntry();

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  // Fetch entry data when editing
  const { data: editingEntry, isLoading: isLoadingEntry } = useEntry(editingEntryId || undefined);

  // Filter state (for table filtering)
  const [filterType, setFilterType] = useState<'all' | 'customer'>('all');
  const [filterCustomer, setFilterCustomer] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(50);

  // Form state
  const [favouriteTeam, setFavouriteTeam] = useState<'team1' | 'team2'>('team1'); // Default to team1
  const [assignedUser, setAssignedUser] = useState<number | ''>(''); // Single-select for "Assign to"
  const [team1Rate, setTeam1Rate] = useState('');
  const [team1Amount, setTeam1Amount] = useState('');
  const [team2Rate, setTeam2Rate] = useState('');
  const [team2Amount, setTeam2Amount] = useState('');

  // Refs for keyboard navigation
  const team1RateRef = useRef<HTMLInputElement>(null);
  const team1AmountRef = useRef<HTMLInputElement>(null);
  const team2RateRef = useRef<HTMLInputElement>(null);
  const team2AmountRef = useRef<HTMLInputElement>(null);

  // Filter active users and create dropdown options for filter
  const customerFilterOptions = useMemo(() => {
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


  // User options for "Assign to" select
  const userOptions = useMemo(() => {
    const activeUsers = users.filter((user) => user.status === 'active');
    return activeUsers.map((user) => ({
      value: user.id,
      label: user.name,
    }));
  }, [users]);

  // Filter entries based on selected filter
  const filteredEntries = useMemo(() => {
    if (filterType === 'all') {
      return allEntries;
    } else if (filterType === 'customer' && filterCustomer) {
      const customerId = parseInt(filterCustomer);
      return allEntries.filter((entry) => entry.user_id === customerId);
    }
    return allEntries;
  }, [allEntries, filterType, filterCustomer]);

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const entries = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return filteredEntries.slice(startIndex, startIndex + entriesPerPage);
  }, [filteredEntries, currentPage, entriesPerPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterCustomer]);



  // Populate form when editing entry data is loaded
  useEffect(() => {
    if (editingEntry && isEditMode) {
      setFavouriteTeam(editingEntry.favourite_team);
      setTeam1Rate(editingEntry.team1_rate ? String(editingEntry.team1_rate) : '');
      setTeam1Amount(editingEntry.team1_amount ? String(editingEntry.team1_amount) : '');
      setTeam2Rate(editingEntry.team2_rate ? String(editingEntry.team2_rate) : '');
      setTeam2Amount(editingEntry.team2_amount ? String(editingEntry.team2_amount) : '');
      // Set assigned user - if user_id exists, set it
      if (editingEntry.user_id) {
        setAssignedUser(editingEntry.user_id);
      } else {
        setAssignedUser('');
      }
    }
  }, [editingEntry, isEditMode]);

  const handleBack = () => {
    router.back();
  };

  const handleTeamSelect = (team: 'team1' | 'team2') => {
    setFavouriteTeam(team);
  };

  const handleEditClick = (entryId: number) => {
    setEditingEntryId(entryId);
    setIsEditMode(true);
    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingEntryId(null);
    // Reset form
    setFavouriteTeam('team1');
    setTeam1Rate('');
    setTeam1Amount('');
    setTeam2Rate('');
    setTeam2Amount('');
    setAssignedUser('');
  };

  // Handle Enter key to move focus to next field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      // team1Rate → team1Amount (same team)
      if (currentField === 'team1Rate') {
        requestAnimationFrame(() => {
          team1AmountRef.current?.focus();
          team1AmountRef.current?.select();
        });
        return;
      }
      
      // team1Amount → check if both team1 fields are empty, if yes go to team2Rate, else submit
      if (currentField === 'team1Amount') {
        const isTeam1Empty = team1Rate.trim() === '' && team1Amount.trim() === '';
        if (isTeam1Empty) {
          // Both empty, move to team2Rate
          requestAnimationFrame(() => {
            team2RateRef.current?.focus();
            team2RateRef.current?.select();
          });
        } else {
          // Has value, submit form
          const form = e.currentTarget.closest('form');
          if (form) {
            form.requestSubmit();
          }
        }
        return;
      }
      
      // team2Rate → team2Amount (same team)
      if (currentField === 'team2Rate') {
        requestAnimationFrame(() => {
          team2AmountRef.current?.focus();
          team2AmountRef.current?.select();
        });
        return;
      }
      
      // team2Amount → always submit
      if (currentField === 'team2Amount') {
        const form = e.currentTarget.closest('form');
        if (form) {
          form.requestSubmit();
        }
        return;
      }
    }
  };


  // Format date to "10 JAN, 26 14:30" format
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear().toString().slice(-2);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day} ${month}, ${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: A user must be selected
    if (!assignedUser || (typeof assignedUser === 'string' && assignedUser === '') || (typeof assignedUser === 'number' && assignedUser === 0)) {
      toast.error('Please select a user to assign entry to');
      return;
    }

    // Validation: At least one team must have both rate and amount
    const hasTeam1Bet = team1Rate.trim() !== '' && team1Amount.trim() !== '';
    const hasTeam2Bet = team2Rate.trim() !== '' && team2Amount.trim() !== '';

    if (!hasTeam1Bet && !hasTeam2Bet) {
      toast.error('At least one team must have both rate and amount');
      return;
    }

    // Validate numeric values
    const team1RateNum = team1Rate.trim() ? parseFloat(team1Rate) : null;
    const team1AmountNum = team1Amount.trim() ? parseFloat(team1Amount) : null;
    const team2RateNum = team2Rate.trim() ? parseFloat(team2Rate) : null;
    const team2AmountNum = team2Amount.trim() ? parseFloat(team2Amount) : null;

    if (hasTeam1Bet && (isNaN(team1RateNum!) || isNaN(team1AmountNum!) || team1RateNum! < 0 || team1AmountNum! < 0)) {
      toast.error('Team 1 rate and amount must be valid positive numbers');
      return;
    }

    if (hasTeam2Bet && (isNaN(team2RateNum!) || isNaN(team2AmountNum!) || team2RateNum! < 0 || team2AmountNum! < 0)) {
      toast.error('Team 2 rate and amount must be valid positive numbers');
      return;
    }

    if (!matchId) {
      toast.error('Match ID is missing');
      return;
    }

    try {
      if (isEditMode && editingEntryId) {
        // Update existing entry
        const updatePayload = {
          user_id: assignedUser as number,
          favourite_team: favouriteTeam,
          team1_rate: team1RateNum,
          team1_amount: team1AmountNum,
          team2_rate: team2RateNum,
          team2_amount: team2AmountNum,
        };

        await updateEntryMutation.mutateAsync({
          id: editingEntryId,
          payload: updatePayload,
        });
        
        // Reset form and exit edit mode
        handleCancelEdit();
      } else {
        // Create entry for selected user
        const payload = {
          match_id: parseInt(matchId),
          user_scope: 'customer' as const,
          user_id: assignedUser as number,
          favourite_team: favouriteTeam,
          team1_rate: team1RateNum,
          team1_amount: team1AmountNum,
          team2_rate: team2RateNum,
          team2_amount: team2AmountNum,
        };

        await createEntryMutation.mutateAsync(payload);

        // Reset form after successful submission
        setTeam1Rate('');
        setTeam1Amount('');
        setTeam2Rate('');
        setTeam2Amount('');
        setAssignedUser('');
        setFavouriteTeam('team1');
      }
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Failed to save entry:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-retro-dark">Loading match...</p>
      </div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-lg text-red-600 font-bold">Match not found</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-retro-dark text-white font-bold rounded hover:opacity-90 transition-opacity"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Teams stay in fixed positions, only colors switch based on which is favourite

  return (
    <div className="space-y-6">
      {/* Top Row: Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-retro-dark text-white font-bold rounded hover:opacity-90 transition-opacity flex items-center gap-2"
          aria-label="Go back"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      </div>

      {/* Two Cards Side by Side - 30% Form, 70% Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
        {/* Entry Window Card - Left Side */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {isEditMode ? 'Edit Entry' : 'Entry Window'}
            </h1>
            {isLoadingEntry && (
              <span className="text-sm text-retro-dark">Loading entry data...</span>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-6" style={{ opacity: isLoadingEntry ? 0.6 : 1 }}>
          {/* Team Selection Cards - Teams stay in fixed positions, only colors switch */}
          <div className="grid grid-cols-2 gap-3">
            {/* Team 1 Card - Green if favourite, Red if not */}
            <button
              type="button"
              onClick={() => handleTeamSelect('team1')}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                favouriteTeam === 'team1'
                  ? 'bg-green-500/70 border-green-700 hover:bg-green-600/70'
                  : 'bg-red-500/70 border-red-700 hover:bg-red-600/70'
              }`}
            >
              <div className="flex flex-col items-center space-y-1.5">
                <div className="text-white font-bold text-xs mb-1">
                  {favouriteTeam === 'team1' ? 'Fav.' : 'NFav.'}
                </div>
                <div className="relative w-16 h-16 border-2 border-white rounded overflow-hidden bg-white">
                  {matchData.team1.logo ? (
                    <Image
                      src={matchData.team1.logo}
                      alt={matchData.team1.name}
                      width={64}
                      height={64}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-retro-dark text-xs font-bold">
                      {matchData.team1.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-sm">{matchData.team1.name.toUpperCase()}</div>
                  <div className="text-white font-semibold text-xs">{matchData.team1.name}</div>
                </div>
              </div>
            </button>

            {/* Team 2 Card - Green if favourite, Red if not */}
            <button
              type="button"
              onClick={() => handleTeamSelect('team2')}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                favouriteTeam === 'team2'
                  ? 'bg-green-500/70 border-green-700 hover:bg-green-600/70'
                  : 'bg-red-500/70 border-red-700 hover:bg-red-600/70'
              }`}
            >
              <div className="flex flex-col items-center space-y-1.5">
                <div className="text-white font-bold text-xs mb-1">
                  {favouriteTeam === 'team2' ? 'Fav.' : 'NFav.'}
                </div>
                <div className="relative w-16 h-16 border-2 border-white rounded overflow-hidden bg-white">
                  {matchData.team2.logo ? (
                    <Image
                      src={matchData.team2.logo}
                      alt={matchData.team2.name}
                      width={64}
                      height={64}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-retro-dark text-xs font-bold">
                      {matchData.team2.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-sm">{matchData.team2.name.toUpperCase()}</div>
                  <div className="text-white font-semibold text-xs">{matchData.team2.name}</div>
                </div>
              </div>
            </button>
          </div>

          {/* Filter Section */}
          <div className="bg-[var(--muted)] px-4 py-2 rounded-lg border border-[var(--retro-dark)]">
            {/* Radio Buttons Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-shrink-0">
                <label className="text-sm font-semibold text-retro-dark whitespace-nowrap">Filter:</label>
                
                {/* All User Filter */}
                <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                  <input
                    type="radio"
                    name="filterType"
                    value="all"
                    checked={filterType === 'all'}
                    onChange={(e) => {
                      setFilterType('all');
                      setFilterCustomer('');
                    }}
                    className="w-4 h-4 text-blue-600 border-2 border-retro-dark focus:ring-2 focus:ring-retro-accent"
                  />
                  <span className="text-retro-dark font-semibold text-sm">All User</span>
                </label>
              </div>

              {/* Customer Wise Filter - Right Side */}
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input
                  type="radio"
                  name="filterType"
                  value="customer"
                  checked={filterType === 'customer'}
                  onChange={(e) => {
                    setFilterType('customer');
                  }}
                  className="w-4 h-4 text-blue-600 border-2 border-retro-dark focus:ring-2 focus:ring-retro-accent"
                />
                <span className="text-retro-dark font-semibold text-sm">Customer Wise</span>
              </label>
            </div>
            
            {/* Dropdown Row - Shows below when Customer Wise is selected */}
            {filterType === 'customer' && (
              <div className="mt-2">
                <Select
                  options={customerFilterOptions}
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  className="w-48 !py-2 !text-xs !font-normal"
                  disabled={isLoadingUsers}
                />
              </div>
            )}
          </div>

          {/* Assign to Section */}
          <div>
            <Select
              label="Assign to"
              options={[{ value: '', label: '--SELECT--' }, ...userOptions.map(u => ({ value: String(u.value), label: u.label }))]}
              value={assignedUser ? String(assignedUser) : ''}
              onChange={(e) => setAssignedUser(e.target.value ? parseInt(e.target.value) : '')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Move to first rate input
                  setTimeout(() => {
                    team1RateRef.current?.focus();
                    team1RateRef.current?.select();
                  }, 100);
                }
              }}
              disabled={isLoadingUsers}
            />
            {isLoadingUsers && (
              <p className="text-sm text-retro-dark mt-1">Loading users...</p>
            )}
            {!isLoadingUsers && userOptions.length === 0 && (
              <p className="text-sm text-red-600 mt-1">No active users found</p>
            )}
          </div>

          {/* Rate and Amount Inputs - Two Columns (One per Team) */}
          <div className="space-y-4">
            {/* Section Headers */}
            <div className="grid grid-cols-2 gap-6">
              {/* Team 1 Column Header */}
              <div>
                <h3 className={`text-base font-bold mb-1 whitespace-nowrap ${
                  favouriteTeam === 'team1' ? 'text-green-700' : 'text-red-700'
                }`} style={{ fontSize: '16px' }}>
                  {favouriteTeam === 'team1' ? 'Favourite - Lagai' : 'Non-Favourite - Khai'}
                </h3>
                <p className="text-xs text-retro-dark truncate">{matchData.team1.name}</p>
              </div>
              {/* Team 2 Column Header */}
              <div>
                <h3 className={`text-base font-bold mb-1 whitespace-nowrap ${
                  favouriteTeam === 'team2' ? 'text-green-700' : 'text-red-700'
                }`} style={{ fontSize: '16px' }}>
                  {favouriteTeam === 'team2' ? 'Favourite - Lagai' : 'Non-Favourite - Khai'}
                </h3>
                <p className="text-xs text-retro-dark truncate">{matchData.team2.name}</p>
              </div>
            </div>
            
            {/* Input Fields - Two Columns: Each column has Rate and Amount */}
            <div className="grid grid-cols-2 gap-6">
              {/* Team 1 Column */}
              <div className="space-y-4">
                <Input
                  ref={team1RateRef}
                  label="Rate"
                  type="text"
                  placeholder={favouriteTeam === 'team1' ? 'Fav Rate' : 'NFav Rate'}
                  value={team1Rate}
                  onChange={(e) => setTeam1Rate(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'team1Rate')}
                  className={
                    favouriteTeam === 'team1'
                      ? '!bg-green-100 !border-green-600 !border-[3px] focus:!ring-green-500 focus:!border-green-600'
                      : '!bg-red-100 !border-red-600 !border-[3px] focus:!ring-red-500 focus:!border-red-600'
                  }
                />
                <Input
                  ref={team1AmountRef}
                  label="Amount"
                  type="text"
                  placeholder={favouriteTeam === 'team1' ? 'Fav. Amt.' : 'NFav. Am'}
                  value={team1Amount}
                  onChange={(e) => setTeam1Amount(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'team1Amount')}
                  className={
                    favouriteTeam === 'team1'
                      ? '!bg-green-100 !border-green-600 !border-[3px] focus:!ring-green-500 focus:!border-green-600'
                      : '!bg-red-100 !border-red-600 !border-[3px] focus:!ring-red-500 focus:!border-red-600'
                  }
                />
              </div>
              {/* Team 2 Column */}
              <div className="space-y-4">
                <Input
                  ref={team2RateRef}
                  label="Rate"
                  type="text"
                  placeholder={favouriteTeam === 'team2' ? 'Fav Rate' : 'NFav Rate'}
                  value={team2Rate}
                  onChange={(e) => setTeam2Rate(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'team2Rate')}
                  className={
                    favouriteTeam === 'team2'
                      ? '!bg-green-100 !border-green-600 !border-[3px] focus:!ring-green-500 focus:!border-green-600'
                      : '!bg-red-100 !border-red-600 !border-[3px] focus:!ring-red-500 focus:!border-red-600'
                  }
                />
                <Input
                  ref={team2AmountRef}
                  label="Amount"
                  type="text"
                  placeholder={favouriteTeam === 'team2' ? 'Fav. Amt.' : 'NFav. Am'}
                  value={team2Amount}
                  onChange={(e) => setTeam2Amount(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'team2Amount')}
                  className={
                    favouriteTeam === 'team2'
                      ? '!bg-green-100 !border-green-600 !border-[3px] focus:!ring-green-500 focus:!border-green-600'
                      : '!bg-red-100 !border-red-600 !border-[3px] focus:!ring-red-500 focus:!border-red-600'
                  }
                />
              </div>
            </div>
          </div>

          {/* Submit and Cancel Buttons */}
          <div className="flex justify-center gap-4 pt-4">
            {isEditMode && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-8 py-3 bg-gray-500 text-white font-bold text-lg rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={createEntryMutation.isPending || updateEntryMutation.isPending || isLoadingEntry}
              className="px-8 py-3 bg-blue-500 text-white font-bold text-lg rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingEntry 
                ? 'Loading...' 
                : createEntryMutation.isPending || updateEntryMutation.isPending
                ? (isEditMode ? 'Updating...' : 'Submitting...')
                : (isEditMode ? 'Update Entry' : 'Submit')
              }
            </button>
          </div>
          </form>
        </Card>

        {/* Recent Entries Card - Right Side */}
        <Card>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Recent Entries</h2>
          </div>
          {isLoadingEntries ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-retro-dark">Loading entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-retro-dark">No entries found. Create your first entry above.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-t-2 border-b-2 border-retro-dark">
                      <th className="px-1 py-1.5 text-left font-bold text-retro-dark text-xs">Customer</th>
                      <th className="px-1 py-1.5 text-center font-bold text-retro-dark text-xs border-l-2 border-retro-dark" colSpan={2}>
                        {matchData.team1.name}
                      </th>
                      <th className="px-1 py-1.5 text-center font-bold text-retro-dark text-xs border-l-2 border-retro-dark" colSpan={2}>
                        {matchData.team2.name}
                      </th>
                      <th className="px-1 py-1.5 text-center font-bold text-retro-dark text-xs border-l-2 border-retro-dark">Action</th>
                      <th className="px-1 py-1.5 text-center font-bold text-retro-dark text-xs border-l-2 border-retro-dark">Created at</th>
                      <th className="px-1 py-1.5 text-center font-bold text-retro-dark text-xs border-l-2 border-retro-dark">Updated at</th>
                    </tr>
                    <tr className="border-b-2 border-retro-dark">
                      <th></th>
                      <th className="px-1 py-1 text-center font-semibold text-retro-dark text-xs border-l-2 border-retro-dark">Fav.</th>
                      <th className="px-1 py-1 text-center font-semibold text-retro-dark text-xs">NFav.</th>
                      <th className="px-1 py-1 text-center font-semibold text-retro-dark text-xs border-l-2 border-retro-dark">Fav.</th>
                      <th className="px-1 py-1 text-center font-semibold text-retro-dark text-xs">NFav.</th>
                      <th className="px-1 py-1 text-center font-semibold text-retro-dark text-xs border-l-2 border-retro-dark"></th>
                      <th className="px-1 py-1 text-center font-semibold text-retro-dark text-xs border-l-2 border-retro-dark"></th>
                      <th className="px-1 py-1 text-center font-semibold text-retro-dark text-xs border-l-2 border-retro-dark"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-retro-dark/20 hover:bg-retro-cream/50">
                        <td className="px-1 py-1.5">
                          <span className="inline-block px-1.5 py-0.5 bg-blue-500 text-white font-semibold text-xs rounded">
                            {entry.customer ? entry.customer.split(' ')[0] : 'N/A'}
                          </span>
                        </td>
                        <td className="px-1 py-1.5 text-center border-l-2 border-retro-dark">
                          {entry.team1Fav && entry.team1Fav !== '0' && entry.team1Fav !== '0/0000' ? (
                            <span className="inline-block px-1.5 py-0.5 bg-green-500 text-white font-semibold text-xs rounded">
                              {entry.team1Fav}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-semibold text-xs">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          {entry.team1Nfav && entry.team1Nfav !== '0' && entry.team1Nfav !== '0/0000' ? (
                            <span className="inline-block px-1.5 py-0.5 bg-red-500 text-white font-semibold text-xs rounded">
                              {entry.team1Nfav}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-semibold text-xs">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-1.5 text-center border-l-2 border-retro-dark">
                          {entry.team2Fav && entry.team2Fav !== '0' && entry.team2Fav !== '0/0000' ? (
                            <span className="inline-block px-1.5 py-0.5 bg-green-500 text-white font-semibold text-xs rounded">
                              {entry.team2Fav}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-semibold text-xs">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          {entry.team2Nfav && entry.team2Nfav !== '0' && entry.team2Nfav !== '0/0000' ? (
                            <span className="inline-block px-1.5 py-0.5 bg-red-500 text-white font-semibold text-xs rounded">
                              {entry.team2Nfav}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-semibold text-xs">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-1.5 text-center border-l-2 border-retro-dark">
                          <button 
                            onClick={() => handleEditClick(entry.id)}
                            className="px-1.5 py-0.5 bg-blue-500 text-white font-semibold text-xs rounded hover:bg-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                        <td className="px-1 py-1.5 text-center border-l-2 border-retro-dark">
                          <span className="inline-block px-1.5 py-0.5 bg-gray-400 text-white font-semibold text-xs rounded">
                            {formatDate(entry.created_at)}
                          </span>
                        </td>
                        <td className="px-1 py-1.5 text-center border-l-2 border-retro-dark">
                          <span className="inline-block px-1.5 py-0.5 bg-gray-400 text-white font-semibold text-xs rounded">
                            {formatDate(entry.updated_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {filteredEntries.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-retro-dark">Show</label>
                    <select
                      value={entriesPerPage}
                      onChange={(e) => {
                        setEntriesPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-xs focus:outline-none focus:ring-2 focus:ring-retro-accent"
                    >
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={500}>500</option>
                    </select>
                    <label className="text-xs text-retro-dark">entries</label>
                  </div>
                  
                  <div className="text-xs text-retro-dark">
                    Showing {Math.min((currentPage - 1) * entriesPerPage + 1, filteredEntries.length)} to{' '}
                    {Math.min(currentPage * entriesPerPage, filteredEntries.length)} of {filteredEntries.length}{' '}
                    entries
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-xs hover:bg-retro-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                <span key={page} className="px-2 py-1 text-retro-dark font-bold text-xs">
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
                              className={`px-3 py-1 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-xs transition-colors ${
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
                        className="px-3 py-1 border-[3px] border-retro-dark rounded text-retro-dark font-bold text-xs hover:bg-retro-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

