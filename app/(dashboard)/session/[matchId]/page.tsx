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
    yesEntryRun: '',
    yesAmount: '',
    noEntryRun: '',
    noAmount: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Session | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [isAddResultFormOpen, setIsAddResultFormOpen] = useState(true);
  const [addResultFormData, setAddResultFormData] = useState({
    inningOver: '',
    result: '',
  });
  const [addResultErrors, setAddResultErrors] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(true);
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
  const yesEntryRunInputRef = useRef<HTMLInputElement>(null);
  const yesAmountInputRef = useRef<HTMLInputElement>(null);
  const noEntryRunInputRef = useRef<HTMLInputElement>(null);
  const noAmountInputRef = useRef<HTMLInputElement>(null);
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

  // Calculate final net profit for a user based on session commission type
  const calculateFinalNetProfit = useMemo(() => {
    return (userId: number, userNetProfitLossSum: number): number => {
      const user = users.find((u) => u.id === userId);
      if (!user) {
        return Number(userNetProfitLossSum) || 0;
      }
      
      // Ensure sum is a number
      const sum = Number(userNetProfitLossSum) || 0;
      const partnership = Number(user.partnership) || 0;
      const sessionCommission = Number(user.session_commission) || 0;
      
      // For users with no session commission, deduct partnership percentage only
      if (user.session_commission_type === 'no_commission') {
        // Deduct partnership: amount after cutting the partnership commission
        return sum * (1 - partnership / 100);
      }
      
      // For users with profit_loss session commission type
      if (user.session_commission_type === 'profit_loss') {
        // If total is negative (loss), apply session commission first, then partnership
        if (sum < 0) {
          // Step 1: Apply session commission on the loss
          const afterSessionCommission = sum * (1 - sessionCommission / 100);
          // Step 2: Apply partnership on the result
          return afterSessionCommission * (1 - partnership / 100);
        } else {
          // If total is positive (profit), apply partnership only (no session commission)
          return sum * (1 - partnership / 100);
        }
      }
      
      // For other session commission types (like 'entrywise'), return the sum as-is (will be handled later)
      return sum;
    };
  }, [users]);

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

    // Always group by user first, then apply additional grouping if selected
    const userGrouped = new Map<number, typeof mappedSessions>();
    mappedSessions.forEach((session) => {
      if (!userGrouped.has(session.user_id)) {
        userGrouped.set(session.user_id, []);
      }
      userGrouped.get(session.user_id)!.push(session);
    });
    
    // Sort by user name and flatten
    const sortedByUser = Array.from(userGrouped.entries())
      .sort((a, b) => {
        const nameA = a[1][0]?.user_name || '';
        const nameB = b[1][0]?.user_name || '';
        return nameA.localeCompare(nameB);
      })
      .flatMap(([_, sessions]) => sessions);

    // Apply additional grouping if selected
    if (filters.groupBy && filters.groupBy !== '') {
      const grouped = new Map();
      
      sortedByUser.forEach((session) => {
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
      return sortedGroups.flatMap(([_, sessions]) => sessions);
    }
    
    return sortedByUser;
  }, [sessions, filters, groups]);

  // Calculate final net profit per user (using all session data, not just paginated)
  const userFinalNetProfit = useMemo(() => {
    const userGroups = new Map<number, typeof sessionData>();
    sessionData.forEach((entry) => {
      if (!userGroups.has(entry.user_id)) {
        userGroups.set(entry.user_id, []);
      }
      userGroups.get(entry.user_id)!.push(entry);
    });

    const finalNetProfitMap = new Map<number, number>();
    userGroups.forEach((entries, userId) => {
      const user = users.find((u) => u.id === userId);
      
      // For entrywise, we need to separate profit and loss
      if (user?.session_commission_type === 'entrywise') {
        let totalProfit = 0;
        let totalLoss = 0;
        
        entries.forEach((entry) => {
          const value = Number(entry.netProfitLoss) || 0;
          if (value >= 0) {
            totalProfit += value;
          } else {
            totalLoss += value; // This will be negative
          }
        });
        
        // Apply entrywise calculation
        const sessionCommission = Number(user.session_commission) || 0;
        const partnership = Number(user.partnership) || 0;
        
        // Step 1: Apply session commission ONLY on loss (add to loss)
        const lossCommission = Math.abs(totalLoss) * (sessionCommission / 100);
        
        // Step 2: Calculate net after loss commission
        const netAfterLossCommission = totalProfit + totalLoss + lossCommission;
        
        // Step 3: Apply partnership percentage
        const finalAmount = netAfterLossCommission * (1 - partnership / 100);
        
        finalNetProfitMap.set(userId, finalAmount);
      } else {
        // For other types, use the existing calculation
        const sum = entries.reduce((acc, entry) => {
          const value = Number(entry.netProfitLoss) || 0;
          return acc + value;
        }, 0);
        finalNetProfitMap.set(userId, calculateFinalNetProfit(userId, sum));
      }
    });

    return finalNetProfitMap;
  }, [sessionData, calculateFinalNetProfit, users]);

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
    // Ensure proper number conversion to avoid string concatenation
    const totalAmount = sessionData.reduce((sum, entry) => {
      const amount = Number(entry.amount) || 0;
      return sum + amount;
    }, 0);
    
    const rawProfitLoss = sessionData.reduce((sum, entry) => {
      const profitLoss = Number(entry.netProfitLoss) || 0;
      return sum + profitLoss;
    }, 0);
    
    // Calculate total final net result (sum of all user final net results)
    const totalFinalNetResult = Array.from(userFinalNetProfit.values()).reduce((sum, value) => {
      const numValue = Number(value) || 0;
      return sum + numValue;
    }, 0);

    // Calculate additional statistics
    const totalEntries = sessionData.length;
    const uniqueUserIds = new Set(sessionData.map(entry => entry.user_id));
    const totalUsers = uniqueUserIds.size;
    
    const totalProfit = sessionData.reduce((sum, entry) => {
      const profitLoss = Number(entry.netProfitLoss) || 0;
      return sum + (profitLoss > 0 ? profitLoss : 0);
    }, 0);
    const totalLoss = sessionData.reduce((sum, entry) => {
      const profitLoss = Number(entry.netProfitLoss) || 0;
      return sum + (profitLoss < 0 ? Math.abs(profitLoss) : 0);
    }, 0);

    // Count users and calculate commission by commission type
    let noCommissionCount = 0;
    let entrywiseCount = 0;
    let profitLossCount = 0;
    
    let noCommissionRawTotal = 0;
    let entrywiseRawTotal = 0;
    let profitLossRawTotal = 0;
    
    let noCommissionFinalTotal = 0;
    let entrywiseFinalTotal = 0;
    let profitLossFinalTotal = 0;
    
    uniqueUserIds.forEach(userId => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        // Calculate raw total for this user
        const userRawTotal = sessionData
          .filter(entry => entry.user_id === userId)
          .reduce((sum, entry) => sum + (Number(entry.netProfitLoss) || 0), 0);
        
        // Get final total for this user
        const userFinalTotal = Number(userFinalNetProfit.get(userId)) || 0;
        
        if (user.session_commission_type === 'no_commission') {
          noCommissionCount++;
          noCommissionRawTotal += userRawTotal;
          noCommissionFinalTotal += userFinalTotal;
        } else if (user.session_commission_type === 'entrywise') {
          entrywiseCount++;
          entrywiseRawTotal += userRawTotal;
          entrywiseFinalTotal += userFinalTotal;
        } else if (user.session_commission_type === 'profit_loss') {
          profitLossCount++;
          profitLossRawTotal += userRawTotal;
          profitLossFinalTotal += userFinalTotal;
        }
      }
    });

    // Calculate commission amounts (difference between raw and final)
    const noCommissionAmount = noCommissionRawTotal - noCommissionFinalTotal;
    const entrywiseCommissionAmount = entrywiseRawTotal - entrywiseFinalTotal;
    const profitLossCommissionAmount = profitLossRawTotal - profitLossFinalTotal;

    // Calculate average partnership and session commission percentages
    let totalPartnership = 0;
    let totalSessionCommission = 0;
    let usersWithPartnership = 0;
    let usersWithSessionCommission = 0;
    
    uniqueUserIds.forEach(userId => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        const partnership = Number(user.partnership) || 0;
        if (partnership > 0) {
          totalPartnership += partnership;
          usersWithPartnership++;
        }
        
        const sessionCommission = Number(user.session_commission) || 0;
        if (sessionCommission > 0 && user.session_commission_type !== 'no_commission') {
          totalSessionCommission += sessionCommission;
          usersWithSessionCommission++;
        }
      }
    });

    const avgPartnership = usersWithPartnership > 0 ? totalPartnership / usersWithPartnership : 0;
    const avgSessionCommission = usersWithSessionCommission > 0 ? totalSessionCommission / usersWithSessionCommission : 0;

    return {
      totalAmount: Number(totalAmount) || 0,
      rawProfitLoss: Number(rawProfitLoss) || 0,
      totalFinalNetResult: Number(totalFinalNetResult) || 0,
      totalEntries,
      totalUsers,
      totalProfit: Number(totalProfit) || 0,
      totalLoss: Number(totalLoss) || 0,
      noCommissionCount,
      entrywiseCount,
      profitLossCount,
      noCommissionAmount: Number(noCommissionAmount) || 0,
      entrywiseCommissionAmount: Number(entrywiseCommissionAmount) || 0,
      profitLossCommissionAmount: Number(profitLossCommissionAmount) || 0,
      avgPartnership: Number(avgPartnership) || 0,
      avgSessionCommission: Number(avgSessionCommission) || 0,
    };
  }, [sessionData, userFinalNetProfit, users]);

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

    // Validate Yes fields
    const hasYesEntry = formData.yesEntryRun.trim() || formData.yesAmount.trim();
    if (hasYesEntry) {
      if (!formData.yesEntryRun.trim()) {
        newErrors.yesEntryRun = 'Entry Run is required for Yes';
      } else {
        const entryRun = parseFloat(formData.yesEntryRun);
        if (isNaN(entryRun) || entryRun < 0) {
          newErrors.yesEntryRun = 'Entry Run must be a valid number';
        }
      }
      if (!formData.yesAmount.trim()) {
        newErrors.yesAmount = 'Amount is required for Yes';
      } else {
        const amount = parseFloat(formData.yesAmount);
        if (isNaN(amount) || amount <= 0) {
          newErrors.yesAmount = 'Amount must be a positive number';
        }
      }
    }

    // Validate No fields
    const hasNoEntry = formData.noEntryRun.trim() || formData.noAmount.trim();
    if (hasNoEntry) {
      if (!formData.noEntryRun.trim()) {
        newErrors.noEntryRun = 'Entry Run is required for No';
      } else {
        const entryRun = parseFloat(formData.noEntryRun);
        if (isNaN(entryRun) || entryRun < 0) {
          newErrors.noEntryRun = 'Entry Run must be a valid number';
        }
      }
      if (!formData.noAmount.trim()) {
        newErrors.noAmount = 'Amount is required for No';
      } else {
        const amount = parseFloat(formData.noAmount);
        if (isNaN(amount) || amount <= 0) {
          newErrors.noAmount = 'Amount must be a positive number';
        }
      }
    }

    // At least one entry (Yes or No) must be filled
    if (!hasYesEntry && !hasNoEntry) {
      newErrors.yesEntryRun = 'At least one entry (Yes or No) is required';
      newErrors.noEntryRun = 'At least one entry (Yes or No) is required';
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
        // Update existing entry - determine if it's Yes or No based on editingEntry
        const updatePayload: {
          match_id?: number;
          user_id?: number;
          inning_over?: string;
          entry_run?: number;
          amount?: number;
          is_yes?: boolean;
          result?: number | null;
        } = {};

        const isYesEntry = editingEntry.is_yes;
        const entryRun = isYesEntry ? formData.yesEntryRun : formData.noEntryRun;
        const amount = isYesEntry ? formData.yesAmount : formData.noAmount;

        if (formData.match_id !== editingEntry.match_id.toString()) {
          updatePayload.match_id = parseInt(formData.match_id);
        }
        if (formData.user_id !== editingEntry.user_id.toString()) {
          updatePayload.user_id = parseInt(formData.user_id);
        }
        if (formData.inningOver !== editingEntry.inning_over) {
          updatePayload.inning_over = formData.inningOver;
        }
        if (entryRun !== editingEntry.entry_run.toString()) {
          updatePayload.entry_run = parseFloat(entryRun);
        }
        if (amount !== editingEntry.amount.toString()) {
          updatePayload.amount = parseFloat(amount);
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
        // Create new entries - create both Yes and No entries if they have values
        const entriesToCreate = [];

        if (formData.yesEntryRun.trim() && formData.yesAmount.trim()) {
          entriesToCreate.push({
            match_id: parseInt(formData.match_id),
            user_id: parseInt(formData.user_id),
            inning_over: formData.inningOver,
            entry_run: parseFloat(formData.yesEntryRun),
            amount: parseFloat(formData.yesAmount),
            is_yes: true,
          });
        }

        if (formData.noEntryRun.trim() && formData.noAmount.trim()) {
          entriesToCreate.push({
            match_id: parseInt(formData.match_id),
            user_id: parseInt(formData.user_id),
            inning_over: formData.inningOver,
            entry_run: parseFloat(formData.noEntryRun),
            amount: parseFloat(formData.noAmount),
            is_yes: false,
          });
        }

        // Create all entries
        for (const entry of entriesToCreate) {
          await createSessionMutation.mutateAsync(entry);
        }
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
      yesEntryRun: '',
      yesAmount: '',
      noEntryRun: '',
      noAmount: '',
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
    
    // Set form data based on whether it's a Yes or No entry
    // Divide amount by 1000 to show original value in form (same as match entries)
    const originalAmount = (Number(session.amount) / 1000).toString();
    if (session.is_yes) {
      setFormData({
        match_id: session.match_id.toString(),
        user_id: session.user_id.toString(),
        inningOver: session.inning_over,
        yesEntryRun: session.entry_run.toString(),
        yesAmount: originalAmount,
        noEntryRun: '',
        noAmount: '',
      });
    } else {
      setFormData({
        match_id: session.match_id.toString(),
        user_id: session.user_id.toString(),
        inningOver: session.inning_over,
        yesEntryRun: '',
        yesAmount: '',
        noEntryRun: session.entry_run.toString(),
        noAmount: originalAmount,
      });
    }
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
      yesEntryRun: '',
      yesAmount: '',
      noEntryRun: '',
      noAmount: '',
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
      
      // Navigation flow: User → Inning/Over → Yes Entry Run → Yes Amount → No Entry Run → No Amount → Submit
      if (field === 'user_id') {
        requestAnimationFrame(() => {
          inningOverSelectRef.current?.focus();
        });
      } else if (field === 'inningOver') {
        requestAnimationFrame(() => {
          yesEntryRunInputRef.current?.focus();
          yesEntryRunInputRef.current?.select();
        });
      } else if (field === 'yesEntryRun') {
        requestAnimationFrame(() => {
          yesAmountInputRef.current?.focus();
          yesAmountInputRef.current?.select();
        });
      } else if (field === 'yesAmount') {
        // Check if YES fields have values
        const hasYesEntry = formData.yesEntryRun.trim() !== '' && formData.yesAmount.trim() !== '';
        if (hasYesEntry) {
          // Both YES fields have values, submit form
          handleSave();
        } else {
          // YES fields are empty, move to NO Entry Run field
          requestAnimationFrame(() => {
            noEntryRunInputRef.current?.focus();
            noEntryRunInputRef.current?.select();
          });
        }
      } else if (field === 'noEntryRun') {
        requestAnimationFrame(() => {
          noAmountInputRef.current?.focus();
          noAmountInputRef.current?.select();
        });
      } else if (field === 'noAmount') {
        // Submit form when Enter is pressed on No Amount field
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
      <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
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

          <div className="space-y-4">
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
            </div>

            {/* Yes/No Two Column Layout */}
            <div className="space-y-4">
              {/* Section Headers */}
              <div className="grid grid-cols-2 gap-4">
                {/* Yes Column Header */}
                <div className="text-center">
                  <h3 className="text-base font-bold mb-1 text-green-700" style={{ fontSize: '16px' }}>
                    YES
                  </h3>
                </div>
                {/* No Column Header */}
                <div className="text-center">
                  <h3 className="text-base font-bold mb-1 text-red-700" style={{ fontSize: '16px' }}>
                    NO
                  </h3>
                </div>
              </div>
              
              {/* Input Fields - Two Columns: Each column has Entry Run and Amount */}
              <div className="grid grid-cols-2 gap-4">
                {/* Yes Column */}
                <div className="space-y-4">
                  <Input
                    ref={yesEntryRunInputRef}
                    type="number"
                    label="Entry Run"
                    id="yesEntryRun"
                    value={formData.yesEntryRun}
                    onChange={(e) => handleInputChange('yesEntryRun', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'yesEntryRun')}
                    error={errors.yesEntryRun}
                    placeholder="Enter entry run"
                    min="0"
                    className="placeholder:text-sm !bg-green-100 !border-green-600 !border-[3px] focus:!ring-green-500 focus:!border-green-600"
                  />
                  <Input
                    ref={yesAmountInputRef}
                    type="number"
                    label="Amount"
                    id="yesAmount"
                    value={formData.yesAmount}
                    onChange={(e) => handleInputChange('yesAmount', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'yesAmount')}
                    error={errors.yesAmount}
                    placeholder="Enter amount"
                    min="0"
                    className="placeholder:text-sm !bg-green-100 !border-green-600 !border-[3px] focus:!ring-green-500 focus:!border-green-600"
                  />
                </div>
                {/* No Column */}
                <div className="space-y-4">
                  <Input
                    ref={noEntryRunInputRef}
                    type="number"
                    label="Entry Run"
                    id="noEntryRun"
                    value={formData.noEntryRun}
                    onChange={(e) => handleInputChange('noEntryRun', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'noEntryRun')}
                    error={errors.noEntryRun}
                    placeholder="Enter entry run"
                    min="0"
                    className="placeholder:text-sm !bg-red-100 !border-red-600 !border-[3px] focus:!ring-red-500 focus:!border-red-600"
                  />
                  <Input
                    ref={noAmountInputRef}
                    type="number"
                    label="Amount"
                    id="noAmount"
                    value={formData.noAmount}
                    onChange={(e) => handleInputChange('noAmount', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'noAmount')}
                    error={errors.noAmount}
                    placeholder="Enter amount"
                    min="0"
                    className="placeholder:text-sm !bg-red-100 !border-red-600 !border-[3px] focus:!ring-red-500 focus:!border-red-600"
                  />
                </div>
              </div>
            </div>
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
              <div className="flex items-stretch gap-2 bg-white border-2 border-retro-dark rounded-lg p-2">
                  <div className="flex-1">
                    <Select
                      ref={addResultInningOverSelectRef}
                      label=""
                      id="add_result_inning_over"
                      value={addResultFormData.inningOver}
                      onChange={(e) => {
                        const selectedInningOver = e.target.value;
                        setAddResultFormData((prev) => ({ ...prev, inningOver: selectedInningOver }));
                        
                        // Automatically filter table by selected innings/over
                        updateFilters({ ...filters, inningOver: selectedInningOver });
                        
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
                      className="!mb-0 h-10 !text-base !font-semibold !leading-[40px] !py-0"
                      containerClassName="mb-0"
                    />
                  </div>
                  <div className="flex-1">
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
                      className="placeholder:text-sm !mb-0 h-10"
                      containerClassName="mb-0"
                    />
                  </div>
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
                    className="px-4 py-2 bg-green-600 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity whitespace-nowrap h-10 flex items-center justify-center"
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
                    className="px-4 py-2 bg-gray-500 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity whitespace-nowrap h-10 flex items-center justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity whitespace-nowrap h-10 flex items-center justify-center"
                  >
                    {showFilters ? 'Hide Filter' : 'Show Filter'}
                  </button>
              </div>
            </div>
          </div>
        </div>

        <div className="py-4 px-1">
          {/* Filter Section - Card */}
          {showFilters && (
          <Card className="mb-4">
            <div className="space-y-3">
              <span className="text-lg font-bold text-retro-dark block">Filter by:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                  <label htmlFor="filter_user_id" className="text-sm font-semibold text-retro-dark whitespace-nowrap sm:w-20 w-full">
                    User:
                  </label>
                  <div className="flex-1 w-full">
                    <Select
                      label=""
                      id="filter_user_id"
                      value={filters.user_id}
                      onChange={(e) => updateFilters({ ...filters, user_id: e.target.value })}
                      options={userOptions}
                      className="!mb-0 w-full"
                      containerClassName="mb-0 w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                  <label htmlFor="filter_group_id" className="text-sm font-semibold text-retro-dark whitespace-nowrap sm:w-20 w-full">
                    Group:
                  </label>
                  <div className="flex-1 w-full">
                    <Select
                      label=""
                      id="filter_group_id"
                      value={filters.group_id}
                      onChange={(e) => updateFilters({ ...filters, group_id: e.target.value })}
                      options={groupOptions}
                      className="!mb-0 w-full"
                      containerClassName="mb-0 w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                  <label htmlFor="filter_inningOver" className="text-sm font-semibold text-retro-dark whitespace-nowrap sm:w-24 w-full">
                    Inning/Over:
                  </label>
                  <div className="flex-1 w-full">
                    <Select
                      label=""
                      id="filter_inningOver"
                      value={filters.inningOver}
                      onChange={(e) => updateFilters({ ...filters, inningOver: e.target.value })}
                      options={inningOverOptions}
                      className="!mb-0 w-full"
                      containerClassName="mb-0 w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                  <label htmlFor="filter_isYes" className="text-sm font-semibold text-retro-dark whitespace-nowrap sm:w-20 w-full">
                    Yes/No:
                  </label>
                  <div className="flex-1 w-full">
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
                      className="!mb-0 w-full"
                      containerClassName="mb-0 w-full"
                    />
                  </div>
                </div>
              </div>
              {(filters.user_id || filters.group_id || filters.inningOver || filters.isYes) && (
                <div className="flex justify-start sm:justify-end">
                  <button
                    type="button"
                    onClick={() => updateFilters({ ...filters, user_id: '', group_id: '', inningOver: '', isYes: '' })}
                    className="px-4 py-2 bg-gray-500 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </Card>
          )}

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
            <table className="w-full border-collapse bg-transparent text-sm">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-gray-300 bg-[var(--header)]">
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)]">Name</th>
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)]">Group</th>
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
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)] bg-amber-600">
                    <div>Final net</div>
                    <div className="text-xs font-normal">result</div>
                  </th>
                  <th className="px-3 py-1.5 text-left font-bold text-[var(--header-foreground)]">Actions</th>
                </tr>
              </thead>
              {/* Table Body */}
              <tbody>
                {isLoadingSessions ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-retro-dark/60">
                      Loading sessions...
                    </td>
                  </tr>
                ) : sessionData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-retro-dark/60">
                      No entries found. Create your first entry above.
                    </td>
                  </tr>
                ) : (() => {
                  // Group paginated entries by user_id to determine row spans for merged cells
                  const userGroups = new Map<number, typeof paginatedEntries>();
                  paginatedEntries.forEach((entry) => {
                    if (!userGroups.has(entry.user_id)) {
                      userGroups.set(entry.user_id, []);
                    }
                    userGroups.get(entry.user_id)!.push(entry);
                  });

                  // Track which user entries we've already rendered the merged cell for
                  const renderedUserCells = new Set<number>();

                  // Render rows with merged cells for final net profit
                  return paginatedEntries.map((entry, index) => {
                    const userEntries = userGroups.get(entry.user_id)!;
                    const isFirstEntryOfUser = !renderedUserCells.has(entry.user_id);
                    if (isFirstEntryOfUser) {
                      renderedUserCells.add(entry.user_id);
                    }
                    const rowSpan = isFirstEntryOfUser ? userEntries.length : 0;
                    const finalNetProfit = Number(userFinalNetProfit.get(entry.user_id)) || 0;
                    
                    // Get user data for commission type badge
                    const user = users.find((u) => u.id === entry.user_id);
                    const getCommissionTypeBadge = (type?: string) => {
                      if (type === 'profit_loss') return { text: 'PL', color: 'bg-blue-200 text-blue-800' };
                      if (type === 'no_commission') return { text: 'NC', color: 'bg-green-200 text-green-800' };
                      if (type === 'entrywise') return { text: 'En.w', color: 'bg-purple-200 text-purple-800' };
                      return null;
                    };
                    const commissionTypeBadge = getCommissionTypeBadge(user?.session_commission_type);
                    
                    // Check if this is the first row of a new user group (not the very first row in the table)
                    const previousEntry = index > 0 ? paginatedEntries[index - 1] : null;
                    const nextEntry = index < paginatedEntries.length - 1 ? paginatedEntries[index + 1] : null;
                    const isNewUserGroup = isFirstEntryOfUser && index > 0 && previousEntry && previousEntry.user_id !== entry.user_id;
                    const isLastRowOfUserGroup = !nextEntry || (nextEntry && nextEntry.user_id !== entry.user_id);

                    // Build border classes
                    let borderClasses = 'hover:bg-transparent';
                    if (isNewUserGroup) {
                      // New user group: thick top border, no bottom border
                      borderClasses += ' border-t-4 border-gray-700 border-b-0';
                    } else if (isLastRowOfUserGroup && index < paginatedEntries.length - 1) {
                      // Last row of user group (but not last row of table): no bottom border (next row will have top border)
                      borderClasses += ' border-b-0';
                    } else if (!isLastRowOfUserGroup && nextEntry && nextEntry.user_id === entry.user_id) {
                      // Row within same user group: no bottom border to avoid double borders
                      borderClasses += ' border-b-0';
                    } else {
                      // Regular row: normal bottom border
                      borderClasses += ' border-b border-gray-200';
                    }

                    return (
                      <tr 
                        key={entry.id} 
                        className={borderClasses}
                      >
                        <td className="px-3 py-1.5 text-retro-dark relative">
                          <span>{entry.user_name}</span>
                          {commissionTypeBadge && (
                            <span className={`absolute top-1 right-1 text-[10px] font-semibold px-1 py-0.5 rounded ${commissionTypeBadge.color}`}>
                              {commissionTypeBadge.text}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-retro-dark">{entry.group_name || '-'}</td>
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
                                ? 'bg-red-200 text-red-800'
                                : 'bg-green-200 text-green-800'
                            }`}
                          >
                            {entry.netProfitLoss >= 0 ? '+' : ''}
                            {entry.netProfitLoss.toLocaleString()}
                          </span>
                        </td>
                        {isFirstEntryOfUser ? (
                          <td
                            rowSpan={rowSpan}
                            className="px-3 py-1.5 text-retro-dark align-middle bg-amber-50"
                          >
                            <span
                              className={`inline-block px-3 py-1 rounded font-semibold ${
                                finalNetProfit >= 0
                                  ? 'bg-red-700 text-white'
                                  : 'bg-green-700 text-white'
                              }`}
                            >
                              {finalNetProfit >= 0 ? '+' : ''}
                              {Number(finalNetProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                        ) : null}
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
                    );
                  });
                })()}
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
          <div className="mt-6">
            <div className="w-full bg-[var(--retro-cream)] border-2 border-[var(--retro-dark)] rounded-lg overflow-x-auto">
              <table className="w-full border-collapse min-w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-[var(--retro-dark)]">
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">Total Entries</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">Total Users</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">Total Amount</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">No Commission Users</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">Entrywise Commission Users</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">P/L Commission Users</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">Total Profit</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">Total Loss</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">Avg Partnership %</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">Avg Session Commission %</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">Raw Profit/Loss</th>
                    <th className="px-2 py-1 text-center font-bold text-retro-dark text-xs">Total Final Net Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">{summary.totalEntries}</td>
                    <td className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">{summary.totalUsers}</td>
                    <td className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">
                      {Number(summary.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">
                      {summary.noCommissionCount} (Comm: {Number(summary.noCommissionAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </td>
                    <td className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">
                      {summary.entrywiseCount} (Comm: {Number(summary.entrywiseCommissionAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </td>
                    <td className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">
                      {summary.profitLossCount} (Comm: {Number(summary.profitLossCommissionAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </td>
                    <td className="px-2 py-1 text-center font-bold text-red-600 text-xs border-r border-[var(--retro-dark)]/30">
                      +{Number(summary.totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1 text-center font-bold text-green-600 text-xs border-r border-[var(--retro-dark)]/30">
                      -{Number(summary.totalLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">
                      {Number(summary.avgPartnership).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                    </td>
                    <td className="px-2 py-1 text-center font-bold text-retro-dark text-xs border-r border-[var(--retro-dark)]/30">
                      {Number(summary.avgSessionCommission).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                    </td>
                    <td className="px-2 py-1 text-center font-bold text-xs border-r border-[var(--retro-dark)]/30">
                      <span
                        className={summary.rawProfitLoss >= 0 ? 'text-red-600' : 'text-green-600'}
                      >
                        {summary.rawProfitLoss >= 0 ? '+' : ''}
                        {Number(summary.rawProfitLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center font-bold text-xs">
                      <span
                        className={`${
                          summary.totalFinalNetResult >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {summary.totalFinalNetResult >= 0 ? '+' : ''}
                        {Number(summary.totalFinalNetResult).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

