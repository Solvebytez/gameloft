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
import { useGroups } from '@/app/hooks/useGroups';
import MultiSelect from '@/app/components/ui/MultiSelect';
import toast from 'react-hot-toast';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;

  // Fetch match data from API
  const { data: matchData, isLoading, error } = useMatch(matchId);
  
  // Fetch users list (already filtered by current admin in backend)
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();

  // Fetch groups list
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups();

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
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'group'>('all');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  // Form state
  const [favouriteTeam, setFavouriteTeam] = useState<'team1' | 'team2'>('team1'); // Default to team1
  const [assignedUsers, setAssignedUsers] = useState<number[]>([]); // Multi-select for "Assign to"
  const [team1Rate, setTeam1Rate] = useState('');
  const [team1Amount, setTeam1Amount] = useState('');
  const [team2Rate, setTeam2Rate] = useState('');
  const [team2Amount, setTeam2Amount] = useState('');

  // Refs for keyboard navigation
  const team1RateRef = useRef<HTMLInputElement>(null);
  const team1AmountRef = useRef<HTMLInputElement>(null);
  const team2RateRef = useRef<HTMLInputElement>(null);
  const team2AmountRef = useRef<HTMLInputElement>(null);
  const multiSelectInputRef = useRef<HTMLInputElement>(null);

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

  // Group options for filter
  const groupFilterOptions = useMemo(() => {
    const options = [{ value: '', label: '--SELECT--' }];
    groups.forEach((group) => {
      options.push({
        value: String(group.id),
        label: group.name,
      });
    });
    return options;
  }, [groups]);

  // User options for "Assign to" multi-select
  const userOptions = useMemo(() => {
    const activeUsers = users.filter((user) => user.status === 'active');
    return activeUsers.map((user) => ({
      value: user.id,
      label: user.name,
    }));
  }, [users]);

  // Filter entries based on selected filter
  const entries = useMemo(() => {
    if (filterType === 'all') {
      return allEntries;
    } else if (filterType === 'customer' && filterCustomer) {
      const customerId = parseInt(filterCustomer);
      return allEntries.filter((entry) => entry.user_id === customerId);
    } else if (filterType === 'group' && filterGroup) {
      const groupId = parseInt(filterGroup);
      const selectedGroup = groups.find((g) => g.id === groupId);
      if (!selectedGroup) return [];
      const groupUserIds = selectedGroup.users.map((u) => u.id);
      return allEntries.filter((entry) => entry.user_id && groupUserIds.includes(entry.user_id));
    }
    return allEntries;
  }, [allEntries, filterType, filterCustomer, filterGroup, groups]);



  // Populate form when editing entry data is loaded
  useEffect(() => {
    if (editingEntry && isEditMode) {
      setFavouriteTeam(editingEntry.favourite_team);
      setTeam1Rate(editingEntry.team1_rate ? String(editingEntry.team1_rate) : '');
      setTeam1Amount(editingEntry.team1_amount ? String(editingEntry.team1_amount) : '');
      setTeam2Rate(editingEntry.team2_rate ? String(editingEntry.team2_rate) : '');
      setTeam2Amount(editingEntry.team2_amount ? String(editingEntry.team2_amount) : '');
      // Set assigned users - if user_id exists, add it to array
      if (editingEntry.user_id) {
        setAssignedUsers([editingEntry.user_id]);
      } else {
        setAssignedUsers([]);
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
    setAssignedUsers([]);
  };

  // Handle Enter key to move focus to next field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      // Define the order of fields
      const fieldOrder = ['team1Rate', 'team1Amount', 'team2Rate', 'team2Amount'];
      const currentIndex = fieldOrder.indexOf(currentField);
      
      if (currentIndex < fieldOrder.length - 1) {
        // Move to next field
        const nextField = fieldOrder[currentIndex + 1];
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          switch (nextField) {
            case 'team1Rate':
              team1RateRef.current?.focus();
              team1RateRef.current?.select();
              break;
            case 'team1Amount':
              team1AmountRef.current?.focus();
              team1AmountRef.current?.select();
              break;
            case 'team2Rate':
              team2RateRef.current?.focus();
              team2RateRef.current?.select();
              break;
            case 'team2Amount':
              team2AmountRef.current?.focus();
              team2AmountRef.current?.select();
              break;
          }
        });
      } else {
        // Last field - submit the form
        const form = e.currentTarget.closest('form');
        if (form) {
          form.requestSubmit();
        }
      }
    }
  };

  // Handle Enter key in MultiSelect to open dropdown or move to first rate input
  const handleMultiSelectEnter = () => {
    // If dropdown is not open, open it first
    if (multiSelectInputRef.current) {
      // Trigger focus and click to open dropdown
      multiSelectInputRef.current.focus();
      // Dispatch a click event to open the dropdown
      const clickEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      multiSelectInputRef.current.dispatchEvent(clickEvent);
    }
  };

  // Focus MultiSelect input when page loads or form is ready
  useEffect(() => {
    if (!isEditMode && !isLoadingEntry && matchData) {
      const timer = setTimeout(() => {
        multiSelectInputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isEditMode, isLoadingEntry, matchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: At least one user must be selected
    if (assignedUsers.length === 0) {
      toast.error('Please select at least one user to assign entries to');
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
        if (assignedUsers.length !== 1) {
          toast.error('Please select exactly one user when editing an entry');
          return;
        }

        const updatePayload = {
          user_id: assignedUsers[0],
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
        // Create entry for each selected user
        let successCount = 0;
        let errorCount = 0;

        for (const userId of assignedUsers) {
          try {
            const payload = {
              match_id: parseInt(matchId),
              user_scope: 'customer' as const,
              user_id: userId,
              favourite_team: favouriteTeam,
              team1_rate: team1RateNum,
              team1_amount: team1AmountNum,
              team2_rate: team2RateNum,
              team2_amount: team2AmountNum,
            };

            await createEntryMutation.mutateAsync(payload);
            successCount++;
          } catch (error) {
            errorCount++;
            const user = users.find((u) => u.id === userId);
            console.error(`Failed to create entry for user ${user?.name || userId}:`, error);
          }
        }

        // Show summary message
        if (successCount > 0 && errorCount === 0) {
          toast.success(`Entries created successfully for ${successCount} user(s)`);
        } else if (successCount > 0 && errorCount > 0) {
          toast.success(`Entries created for ${successCount} user(s), ${errorCount} failed`);
        } else {
          toast.error(`Failed to create entries for all selected users`);
        }

        // Reset form after successful submission
        setTeam1Rate('');
        setTeam1Amount('');
        setTeam2Rate('');
        setTeam2Amount('');
        setAssignedUsers([]);
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
          <div className="grid grid-cols-2 gap-4">
            {/* Team 1 Card - Green if favourite, Red if not */}
            <button
              type="button"
              onClick={() => handleTeamSelect('team1')}
              className={`relative p-6 rounded-lg border-4 transition-all ${
                favouriteTeam === 'team1'
                  ? 'bg-green-500 border-green-700 hover:bg-green-600'
                  : 'bg-red-500 border-red-700 hover:bg-red-600'
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="text-white font-bold text-sm mb-2">
                  {favouriteTeam === 'team1' ? 'Fav.' : 'NFav.'}
                </div>
                <div className="relative w-24 h-24 border-2 border-white rounded overflow-hidden bg-white">
                  {matchData.team1.logo ? (
                    <Image
                      src={matchData.team1.logo}
                      alt={matchData.team1.name}
                      width={96}
                      height={96}
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
                  <div className="text-white font-bold text-lg">{matchData.team1.name.toUpperCase()}</div>
                  <div className="text-white font-semibold text-sm">{matchData.team1.name}</div>
                </div>
              </div>
            </button>

            {/* Team 2 Card - Green if favourite, Red if not */}
            <button
              type="button"
              onClick={() => handleTeamSelect('team2')}
              className={`relative p-6 rounded-lg border-4 transition-all ${
                favouriteTeam === 'team2'
                  ? 'bg-green-500 border-green-700 hover:bg-green-600'
                  : 'bg-red-500 border-red-700 hover:bg-red-600'
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="text-white font-bold text-sm mb-2">
                  {favouriteTeam === 'team2' ? 'Fav.' : 'NFav.'}
                </div>
                <div className="relative w-24 h-24 border-2 border-white rounded overflow-hidden bg-white">
                  {matchData.team2.logo ? (
                    <Image
                      src={matchData.team2.logo}
                      alt={matchData.team2.name}
                      width={96}
                      height={96}
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
                  <div className="text-white font-bold text-lg">{matchData.team2.name.toUpperCase()}</div>
                  <div className="text-white font-semibold text-sm">{matchData.team2.name}</div>
                </div>
              </div>
            </button>
          </div>

          {/* Assign to Section */}
          <div>
            <MultiSelect
              label="Assign to"
              options={userOptions}
              selectedValues={assignedUsers}
              onChange={(values) => setAssignedUsers(values as number[])}
              placeholder="Search and select users..."
              error={assignedUsers.length === 0 ? undefined : undefined}
              inputRef={multiSelectInputRef}
              onEnterKey={() => {
                // Move to next field after selection with a delay to ensure dropdown is closed
                setTimeout(() => {
                  team1RateRef.current?.focus();
                  team1RateRef.current?.select();
                }, 100);
              }}
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
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-2xl font-bold text-foreground">Recent Entries</h2>
            
            {/* Filter Section - Aligned with table */}
            <div className="flex items-center gap-4 flex-wrap bg-[var(--muted)] px-4 py-2 rounded-lg border border-[var(--retro-dark)]">
              <label className="text-sm font-semibold text-retro-dark">Filter:</label>
              
              {/* All User Filter */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filterType"
                  value="all"
                  checked={filterType === 'all'}
                  onChange={(e) => {
                    setFilterType('all');
                    setFilterCustomer('');
                    setFilterGroup('');
                  }}
                  className="w-4 h-4 text-blue-600 border-2 border-retro-dark focus:ring-2 focus:ring-retro-accent"
                />
                <span className="text-retro-dark font-semibold text-sm">All User</span>
              </label>

              {/* Customer Wise Filter */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filterType"
                  value="customer"
                  checked={filterType === 'customer'}
                  onChange={(e) => {
                    setFilterType('customer');
                    setFilterGroup('');
                  }}
                  className="w-4 h-4 text-blue-600 border-2 border-retro-dark focus:ring-2 focus:ring-retro-accent"
                />
                <span className="text-retro-dark font-semibold text-sm">Customer Wise</span>
              </label>
              {filterType === 'customer' && (
                <Select
                  options={customerFilterOptions}
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  className="w-48 !py-1 !text-xs !font-normal"
                  disabled={isLoadingUsers}
                />
              )}

              {/* Group By Filter */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filterType"
                  value="group"
                  checked={filterType === 'group'}
                  onChange={(e) => {
                    setFilterType('group');
                    setFilterCustomer('');
                  }}
                  className="w-4 h-4 text-blue-600 border-2 border-retro-dark focus:ring-2 focus:ring-retro-accent"
                />
                <span className="text-retro-dark font-semibold text-sm">Group By</span>
              </label>
              {filterType === 'group' && (
                <Select
                  options={groupFilterOptions}
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="w-48 !py-1 !text-xs !font-normal"
                  disabled={isLoadingGroups}
                />
              )}
            </div>
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-t-2 border-b-2 border-retro-dark">
                    <th className="px-4 py-3 text-left font-bold text-retro-dark">Customer</th>
                    <th className="px-4 py-3 text-center font-bold text-retro-dark border-l-2 border-retro-dark" colSpan={2}>
                      {matchData.team1.name}
                    </th>
                    <th className="px-4 py-3 text-center font-bold text-retro-dark border-l-2 border-retro-dark" colSpan={2}>
                      {matchData.team2.name}
                    </th>
                    <th className="px-4 py-3 text-center font-bold text-retro-dark border-l-2 border-retro-dark">Action</th>
                    <th className="px-4 py-3 text-center font-bold text-retro-dark border-l-2 border-retro-dark">Created at</th>
                    <th className="px-4 py-3 text-center font-bold text-retro-dark border-l-2 border-retro-dark">Updated at</th>
                  </tr>
                  <tr className="border-b-2 border-retro-dark">
                    <th></th>
                    <th className="px-4 py-2 text-center font-semibold text-retro-dark border-l-2 border-retro-dark">Fav.</th>
                    <th className="px-4 py-2 text-center font-semibold text-retro-dark">NFav.</th>
                    <th className="px-4 py-2 text-center font-semibold text-retro-dark border-l-2 border-retro-dark">Fav.</th>
                    <th className="px-4 py-2 text-center font-semibold text-retro-dark">NFav.</th>
                    <th className="px-4 py-2 text-center font-semibold text-retro-dark border-l-2 border-retro-dark"></th>
                    <th className="px-4 py-2 text-center font-semibold text-retro-dark border-l-2 border-retro-dark"></th>
                    <th className="px-4 py-2 text-center font-semibold text-retro-dark border-l-2 border-retro-dark"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-retro-dark/20 hover:bg-retro-cream/50">
                      <td className="px-4 py-3">
                        <span className="inline-block px-3 py-1 bg-blue-500 text-white font-semibold text-sm rounded">
                          {entry.customer ? entry.customer.split(' ')[0] : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-l-2 border-retro-dark">
                        {entry.team1Fav && entry.team1Fav !== '0' && entry.team1Fav !== '0/0000' ? (
                          <span className="inline-block px-3 py-1 bg-green-500 text-white font-semibold text-sm rounded">
                            {entry.team1Fav}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500 text-white font-semibold text-sm">
                            0
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.team1Nfav && entry.team1Nfav !== '0' && entry.team1Nfav !== '0/0000' ? (
                          <span className="inline-block px-3 py-1 bg-red-500 text-white font-semibold text-sm rounded">
                            {entry.team1Nfav}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500 text-white font-semibold text-sm">
                            0
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center border-l-2 border-retro-dark">
                        {entry.team2Fav && entry.team2Fav !== '0' && entry.team2Fav !== '0/0000' ? (
                          <span className="inline-block px-3 py-1 bg-green-500 text-white font-semibold text-sm rounded">
                            {entry.team2Fav}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500 text-white font-semibold text-sm">
                            0
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.team2Nfav && entry.team2Nfav !== '0' && entry.team2Nfav !== '0/0000' ? (
                          <span className="inline-block px-3 py-1 bg-red-500 text-white font-semibold text-sm rounded">
                            {entry.team2Nfav}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500 text-white font-semibold text-sm">
                            0
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center border-l-2 border-retro-dark">
                        <button 
                          onClick={() => handleEditClick(entry.id)}
                          className="px-4 py-2 bg-blue-500 text-white font-semibold text-sm rounded hover:bg-blue-600 transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center border-l-2 border-retro-dark">
                        <span className="inline-block px-3 py-1 bg-gray-400 text-white font-semibold text-sm rounded">
                          {entry.created_at}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-l-2 border-retro-dark">
                        <span className="inline-block px-3 py-1 bg-gray-400 text-white font-semibold text-sm rounded">
                          {entry.updated_at}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

