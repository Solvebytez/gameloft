'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Select from '@/app/components/ui/Select';
import DatePicker from '@/app/components/ui/DatePicker';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import DownloadModal from '@/app/components/ui/DownloadModal';
import { useMatchesByDate, matchKeys } from '@/app/hooks/useMatches';
import { useUsers, userKeys } from '@/app/hooks/useUsers';
import { useGroups, groupKeys } from '@/app/hooks/useGroups';
import { useInningsOvers, inningsOverKeys } from '@/app/hooks/useInningsOvers';
import { useSessions, Session, sessionKeys } from '@/app/hooks/useSessions';
import { useEntries, Entry } from '@/app/hooks/useEntries';
import { calculateEntrywise } from '@/app/utils/entrywiseCalculator';
import { reverseCutUserCalculation } from '@/app/utils/cutUserCalculator';
// Removed unused imports - now using calculateRowResult() function

// Production-ready calculation function with validation and rounding
function calculateRowResult({
  profitLoss,
  commissionPercent,
  partnershipPercent,
}: {
  profitLoss: number;
  commissionPercent: number;
  partnershipPercent: number;
}) {
  // Validate and clamp percentages to 0-100 range
  const c = Math.max(0, Math.min(commissionPercent, 100)) / 100;
  const s = Math.max(0, Math.min(partnershipPercent, 100)) / 100;

  // Rounding function for money calculations (2 decimal places)
  const round = (n: number) => Math.round(n * 100) / 100;

  let commission = 0;
  let commissionAfterPartnership = 0;
  let custNetWithComm = 0;
  let netProfitLoss = 0;

  if (profitLoss > 0) {
    // CASE A: PROFIT
    // 1. Calculate raw commission (no partnership applied)
    commission = profitLoss * c;

    // 2. Calculate net after commission
    const netAfterCommission = profitLoss - commission;

    // 3. Apply partnership to netAfterCommission
    custNetWithComm = netAfterCommission * s;
    netProfitLoss = netAfterCommission * (1 - s);

    // Commission after partnership (for reference, not used in display)
    commissionAfterPartnership = commission * (1 - s);
  } else {
    // CASE B: LOSS
    // No commission on loss
    commission = 0;
    commissionAfterPartnership = 0;

    // netAfterCommission = profitLoss (no commission to subtract)
    const netAfterCommission = profitLoss;

    // Apply partnership to netAfterCommission
    custNetWithComm = netAfterCommission * s;
    netProfitLoss = netAfterCommission * (1 - s);
  }

  return {
    commission: round(commission),
    commissionAfterPartnership: round(commissionAfterPartnership),
    custNetWithComm: round(custNetWithComm),
    netProfitLoss: round(netProfitLoss),
  };
}

export default function BusinessReportPage() {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    reportType: 'match',
    matchDate: '',
    selectMatch: '',
    winningTeam: '',
    inningOver: '',
    selectionType: 'user', // 'group' or 'user'
    selectGroup: 'all',
    selectUser: 'all',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportFormData, setReportFormData] = useState<typeof formData | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  
  // Pagination state for session table
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch matches when date is selected and valid
  const isValidDate = formData.matchDate && validateDate(formData.matchDate);
  const { data: matches = [], isLoading: isLoadingMatches } = useMatchesByDate(
    isValidDate ? formData.matchDate : null
  );

  // Fetch users from API
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();

  // Fetch groups from API
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups();

  // Fetch innings/overs from API
  const { data: inningsOvers = [] } = useInningsOvers();

  // Fetch sessions for the selected match (when report type is "session" and report is generated)
  // OPTIMIZED: Only fetch when report is generated, not before
  const shouldFetchSessions = !!(reportGenerated && reportFormData && reportFormData.selectMatch && reportFormData.reportType === 'session');
  const { data: allSessions = [], isLoading: isLoadingSessions } = useSessions(
    shouldFetchSessions ? Number(reportFormData!.selectMatch) : null,
    shouldFetchSessions // Only enable when shouldFetchSessions is true
  );

  // OPTIMIZED: Only fetch sessions for inning filter when report is generated or when match is selected AND report type is session
  // This reduces unnecessary API calls
  const shouldFetchSessionsForInningFilter = !!(formData.selectMatch && formData.reportType === 'session' && (reportGenerated || formData.selectMatch));
  const { data: sessionsForInningFilter = [] } = useSessions(
    shouldFetchSessionsForInningFilter ? Number(formData.selectMatch) : null,
    shouldFetchSessionsForInningFilter
  );

  // OPTIMIZED: Only fetch entries for user filter when report is generated or when match is selected AND report type is match
  // This reduces unnecessary API calls before report generation
  const shouldFetchEntriesForUserFilter = !!(formData.selectMatch && formData.reportType === 'match' && (reportGenerated || formData.selectMatch));
  const { data: entriesDataForFilter } = useEntries(
    shouldFetchEntriesForUserFilter ? formData.selectMatch : undefined,
    undefined // Get all entries to see which users have entries
  );
  const entriesForUserFilter: Entry[] = useMemo(() => {
    return entriesDataForFilter?.data || [];
  }, [entriesDataForFilter?.data]);

  // Fetch match entries for the selected match (when report type is "match" and report is generated)
  const shouldFetchEntries = reportGenerated && reportFormData && reportFormData.selectMatch && reportFormData.reportType === 'match';
  // Get selected user from reportFormData (use 'all' if not specified or 'all' is selected, or if group is selected)
  // Note: When group is selected, we don't pass userId to API, we filter client-side
  const selectedUserId = shouldFetchEntries && reportFormData.selectionType === 'user' && reportFormData.selectUser && reportFormData.selectUser !== 'all' 
    ? reportFormData.selectUser 
    : undefined;
  const { data: entriesData, isLoading: isLoadingEntries } = useEntries(
    shouldFetchEntries ? reportFormData.selectMatch : undefined,
    selectedUserId
  );
  const allEntries: Entry[] = entriesData?.data || [];



  // Filter sessions by selected user/group and inningOver if not "all" (use reportFormData when report is generated)
  const filteredSessions = useMemo(() => {
    let sessions = allSessions;
    
    // First filter by inningOver if selected (for session reports)
    if (reportGenerated && reportFormData && reportFormData.reportType === 'session' && reportFormData.inningOver) {
      sessions = sessions.filter((session) => session.inning_over === reportFormData.inningOver);
    } else if (!reportGenerated && formData.reportType === 'session' && formData.inningOver) {
      sessions = sessions.filter((session) => session.inning_over === formData.inningOver);
    }
    
    // Then filter by user/group
    if (!reportGenerated || !reportFormData) {
      // Before report is generated, use formData
      if (formData.selectionType === 'group') {
        if (formData.selectGroup === 'all' || !formData.selectGroup) {
          return sessions;
        }
        // Filter by group: get users in the group, then filter sessions by those users
        const selectedGroup = groups.find(g => String(g.id) === formData.selectGroup);
        if (selectedGroup && selectedGroup.users) {
          const groupUserIds = selectedGroup.users.map(u => u.id);
          return sessions.filter((session) => groupUserIds.includes(session.user_id));
        }
        return sessions;
      } else {
        // User selection
        const selectUser = formData.selectUser;
        if (selectUser === 'all' || !selectUser) {
          return sessions;
        }
        return sessions.filter((session) => String(session.user_id) === selectUser);
      }
    } else {
      // After report is generated, use reportFormData
      if (reportFormData.selectionType === 'group') {
        if (reportFormData.selectGroup === 'all' || !reportFormData.selectGroup) {
          return sessions;
        }
        // Filter by group: get users in the group, then filter sessions by those users
        const selectedGroup = groups.find(g => String(g.id) === reportFormData.selectGroup);
        if (selectedGroup && selectedGroup.users) {
          const groupUserIds = selectedGroup.users.map(u => u.id);
          return sessions.filter((session) => groupUserIds.includes(session.user_id));
        }
        return sessions;
      } else {
        // User selection
        const selectUser = reportFormData.selectUser;
        if (selectUser === 'all' || !selectUser) {
          return sessions;
        }
        return sessions.filter((session) => String(session.user_id) === selectUser);
      }
    }
  }, [allSessions, formData.selectUser, formData.selectGroup, formData.selectionType, formData.inningOver, formData.reportType, reportFormData, reportGenerated, groups]);

  // Transform sessions data to match table format (same as session detail page)
  const sessionData = useMemo(() => {
    const mappedSessions = filteredSessions.map((session) => ({
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

    // Always group by user first, then sort by user name
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
      .flatMap(([, sessions]) => sessions);

    return sortedByUser;
  }, [filteredSessions]);

  // Calculate final net profit per user (using all session data, not just paginated) - same logic as session detail page
  const calculateFinalNetProfit = useMemo(() => {
    return (userId: number, userNetProfitLossSum: number): number => {
      const user = users.find((u) => u.id === userId);
      if (!user) {
        return Number(userNetProfitLossSum) || 0;
      }
      
      const sum = Number(userNetProfitLossSum) || 0;
      const partnership = Number(user.partnership) || 0;
      const sessionCommission = Number(user.session_commission) || 0;
      
      if (user.session_commission_type === 'no_commission') {
        return sum * (1 - partnership / 100);
      }
      
      if (user.session_commission_type === 'profit_loss') {
        if (sum < 0) {
          const afterSessionCommission = sum * (1 - sessionCommission / 100);
          return afterSessionCommission * (1 - partnership / 100);
        } else {
          return sum * (1 - partnership / 100);
        }
      }
      
      return sum;
    };
  }, [users]);

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
      
      if (user?.session_commission_type === 'entrywise') {
        let totalProfit = 0;
        let totalLoss = 0;
        
        entries.forEach((entry) => {
          const value = Number(entry.netProfitLoss) || 0;
          if (value >= 0) {
            totalProfit += value;
          } else {
            totalLoss += value;
          }
        });
        
        const sessionCommission = Number(user.session_commission) || 0;
        const partnership = Number(user.partnership) || 0;
        
        const lossCommission = Math.abs(totalLoss) * (sessionCommission / 100);
        const netAfterLossCommission = totalProfit + totalLoss + lossCommission;
        const finalAmount = netAfterLossCommission * (1 - partnership / 100);
        
        finalNetProfitMap.set(userId, finalAmount);
      } else {
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

  // Filter entries by selected user/group if not "all" (use reportFormData when report is generated)
  const entries = useMemo(() => {
    if (!reportGenerated || !reportFormData) {
      // Before report is generated, use formData
      if (formData.selectionType === 'group') {
        if (formData.selectGroup === 'all' || !formData.selectGroup) {
          return allEntries;
        }
        // Filter by group: get users in the group, then filter entries by those users
        const selectedGroup = groups.find(g => String(g.id) === formData.selectGroup);
        if (selectedGroup && selectedGroup.users) {
          const groupUserIds = selectedGroup.users.map(u => u.id);
          return allEntries.filter((entry) => entry.user_id && groupUserIds.includes(entry.user_id));
        }
        return allEntries;
      } else {
        // User selection
        const selectUser = formData.selectUser;
        if (selectUser === 'all' || !selectUser) {
          return allEntries;
        }
        return allEntries.filter((entry) => entry.user_id && String(entry.user_id) === selectUser);
      }
    } else {
      // After report is generated, use reportFormData
      if (reportFormData.selectionType === 'group') {
        if (reportFormData.selectGroup === 'all' || !reportFormData.selectGroup) {
          return allEntries;
        }
        // Filter by group: get users in the group, then filter entries by those users
        const selectedGroup = groups.find(g => String(g.id) === reportFormData.selectGroup);
        if (selectedGroup && selectedGroup.users) {
          const groupUserIds = selectedGroup.users.map(u => u.id);
          return allEntries.filter((entry) => entry.user_id && groupUserIds.includes(entry.user_id));
        }
        return allEntries;
      } else {
        // User selection
        const selectUser = reportFormData.selectUser;
        if (selectUser === 'all' || !selectUser) {
          return allEntries;
        }
        return allEntries.filter((entry) => entry.user_id && String(entry.user_id) === selectUser);
      }
    }
  }, [allEntries, formData.selectUser, formData.selectGroup, formData.selectionType, reportFormData, reportGenerated, groups]);

  // Calculate final net profit for match summary using commission (not session_commission)
  const calculateMatchFinalNetProfit = useMemo(() => {
    return (userId: number, userNetProfitLossSum: number): number => {
      const user = users.find((u) => u.id === userId);
      if (!user) {
        return Number(userNetProfitLossSum) || 0;
      }
      
      const sum = Number(userNetProfitLossSum) || 0;
      const partnership = Number(user.partnership) || 0;
      const commission = Number(user.commission) || 0;
      
      // For users with no commission, deduct partnership percentage only
      if (user.commission_type === 'no_commission') {
        return sum * (1 - partnership / 100);
      }
      
      // For users with profit_loss commission type
      if (user.commission_type === 'profit_loss') {
        // If total is negative (loss), apply commission first, then partnership
        if (sum < 0) {
          const afterCommission = sum * (1 - commission / 100);
          return afterCommission * (1 - partnership / 100);
        } else {
          // If total is positive (profit), apply partnership only (no commission)
          return sum * (1 - partnership / 100);
        }
      }
      
      // For entrywise commission type
      if (user.commission_type === 'entrywise') {
        // This will be handled separately when processing entries
        return sum;
      }
      
      return sum;
    };
  }, [users]);

  // Calculate match summary data from match entries (not sessions)
  // Only calculate when report is generated (use reportFormData snapshot, not live formData)
  const calculatedMatchSummaryData = useMemo(() => {
    // Don't calculate if report not generated, wrong type, or no match selected
    if (!reportGenerated || !reportFormData || reportFormData.reportType !== 'match' || !reportFormData.selectMatch) {
      return [];
    }

    // If still loading, return empty (will show loading state)
    if (isLoadingEntries) {
      return [];
    }

    // If no entries found, return empty (will show no data message)
    if (entries.length === 0) {
      return [];
    }

    // Get selected match to find teams and winning team
    const selectedMatch = matches.find((m) => String(m.id) === reportFormData.selectMatch);
    if (!selectedMatch) {
      return [];
    }

    // Determine winning team
    const winningTeamId = Number(reportFormData.winningTeam);
    const isTeam1Winner = winningTeamId === selectedMatch.team1.id;
    const isTeam2Winner = winningTeamId === selectedMatch.team2.id;

    if (!isTeam1Winner && !isTeam2Winner) {
      return [];
    }

    // Group entries by user_id (or customer name if user_id is null)
    const userGroups = new Map<number | string, Entry[]>();
    entries.forEach((entry) => {
      const key = entry.user_id || entry.customer;
      if (!userGroups.has(key)) {
        userGroups.set(key, []);
      }
      userGroups.get(key)!.push(entry);
    });

    // If no users found in entries, return empty
    if (userGroups.size === 0) {
      return [];
    }

    const rows: MatchSummaryRow[] = [];
    let rowIndex = 1;

    // Create user map for O(1) lookups (performance improvement)
    const userMapById = new Map(users.map((u) => [u.id, u]));
    const userMapByName = new Map(users.map((u) => [u.name, u]));

    // Process each user
    userGroups.forEach((userEntries, userKey) => {
      // Find user by id or by customer name (O(1) lookup)
      let user = null;
      if (typeof userKey === 'number') {
        user = userMapById.get(userKey) || null;
      } else {
        user = userMapByName.get(userKey) || null;
      }

      // Calculate profit/loss from match entries using favorite/non-favorite logic
      let totalBet = 0;
      let profitLoss = 0;

      // Initialize totals for winning team and losing team
      let winningTeamFav = 0;      // Winning team + Favorite entries
      let winningTeamNonFav = 0;   // Winning team + Non-Favorite entries
      let losingTeamFav = 0;      // Losing team + Favorite entries
      let losingTeamNonFav = 0;    // Losing team + Non-Favorite entries

      userEntries.forEach((entry) => {
        // Parse amounts from formatted strings (team1Fav, team1Nfav, etc.) to match what's displayed in match entry table
        const parseAmountFromString = (formattedString: string | null | undefined): number => {
          if (!formattedString || formattedString === '0' || formattedString === '0/0000') return 0;
          try {
            const parts = formattedString.split('/');
            if (parts.length === 2) {
              return Number(parts[1]) || 0; // Extract amount part (after the slash)
            }
            return 0;
          } catch {
            return 0;
          }
        };

        // Get amounts from formatted strings to match match entry table display
        const team1FavAmount = parseAmountFromString(entry.team1Fav);
        const team1NfavAmount = parseAmountFromString(entry.team1Nfav);
        const team2FavAmount = parseAmountFromString(entry.team2Fav);
        const team2NfavAmount = parseAmountFromString(entry.team2Nfav);

        // Use the displayed amounts (from formatted strings) instead of raw team1_amount/team2_amount
        const team1Amount = team1FavAmount + team1NfavAmount;
        const team2Amount = team2FavAmount + team2NfavAmount;
        const team1Rate = Number(entry.team1_rate) || 0;
        const team2Rate = Number(entry.team2_rate) || 0;
        const favouriteTeam = entry.favourite_team;

        // Total bet is sum of all amounts (using displayed amounts)
        totalBet += team1Amount + team2Amount;

        // Calculate profit/loss based on winning team and favorite/non-favorite
        // Use the parsed amounts from formatted strings (team1FavAmount, team1NfavAmount, etc.)
        if (isTeam1Winner) {
          // Team 1 Win + Favorite entries (favourite_team === 'team1')
          if (favouriteTeam === 'team1') {
            // Calculate: (rate / 100) × amount, then sum
            // Use team1FavAmount (from team1Fav string) for favorite entries
            winningTeamFav += (team1Rate / 100) * team1FavAmount;
            // Team 2 Loss + Non-Favorite entries (favourite_team === 'team1', but bet on Team2)
            // Losing non-favorite: multiply rate% with amount
            losingTeamNonFav += (team2Rate / 100) * team2NfavAmount;
          }
          
          // Team 1 Win + Non-Favorite entries (favourite_team === 'team2', but bet on Team1)
          if (favouriteTeam === 'team2') {
            // Non-favorite winning: just the amount (no rate multiplication, no × 100)
            winningTeamNonFav += team1NfavAmount;
            // Team 2 Loss + Favorite entries (favourite_team === 'team2')
            // Losing favorite: just amount (no rate multiplication)
            losingTeamFav += team2FavAmount;
          }
        } else if (isTeam2Winner) {
          // Team 2 Win + Favorite entries (favourite_team === 'team2')
          if (favouriteTeam === 'team2') {
            // Calculate: (rate / 100) × amount, then sum
            winningTeamFav += (team2Rate / 100) * team2FavAmount;
            // Team 1 Loss + Non-Favorite entries (favourite_team === 'team2', but bet on Team1)
            // Losing non-favorite: multiply rate% with amount
            losingTeamNonFav += (team1Rate / 100) * team1NfavAmount;
          }
          
          // Team 2 Win + Non-Favorite entries (favourite_team === 'team1', but bet on Team2)
          if (favouriteTeam === 'team1') {
            // Non-favorite winning: just the amount (no rate multiplication, no × 100)
            winningTeamNonFav += team2NfavAmount;
            // Team 1 Loss + Favorite entries (favourite_team === 'team1')
            // Losing favorite: just amount (no rate multiplication)
            losingTeamFav += team1FavAmount;
          }
        }
      });

      // Check if user is a cut type user and reverse the calculation if needed
      const isCutUser = user?.mark_as_cut === 'yes';
      
      let finalWinningTeamFav = winningTeamFav;
      let finalWinningTeamNonFav = winningTeamNonFav;
      let finalLosingTeamFav = losingTeamFav;
      let finalLosingTeamNonFav = losingTeamNonFav;

      // Reverse calculation for cut type users
      if (isCutUser) {
        const reversed = reverseCutUserCalculation({
          winningTeamFav,
          winningTeamNonFav,
          losingTeamFav,
          losingTeamNonFav,
        });
        finalWinningTeamFav = reversed.winningTeamFav;
        finalWinningTeamNonFav = reversed.winningTeamNonFav;
        finalLosingTeamFav = reversed.losingTeamFav;
        finalLosingTeamNonFav = reversed.losingTeamNonFav;
      }

      // Calculate totals (using reversed values for cut users)
      const winningTeamTotal = finalWinningTeamFav + finalWinningTeamNonFav;  // What we PAY OUT (liability)
      const losingTeamTotal = finalLosingTeamFav + finalLosingTeamNonFav;        // What we RECEIVE (asset)
      
      // Net profit/loss = What we RECEIVE - What we PAY OUT = Losing Team Total - Winning Team Total
      profitLoss = losingTeamTotal - winningTeamTotal;

      // If no user found, use customer name from entry
      const custName = user ? user.name : (userEntries[0]?.customer || 'Unknown');

      // Skip if no user found and we need commission/partnership info
      if (!user) {
        // Still add row but without commission calculations
        rows.push({
          srNo: rowIndex++,
          custName,
          totalBet,
          profitLoss,
          totalCommission: 0,
          commissionPercent: 0,
          partnership: '',
          custNetWithComm: profitLoss,
          netProfitLoss: profitLoss,
          commissionType: undefined,
          markAsCut: 'no',
        });
        return;
      }

      // Calculate commission based on commission type
      const commissionPercent = user.commission || 0;
      const partnershipPercent = Number(user.partnership) || 0;
      const commissionType = user.commission_type;
      
      let totalCommission = 0;
      let custNetWithComm = 0;
      let netProfitLoss = 0;

      // Only apply calculateRowResult for profit_loss commission type
      if (commissionType === 'profit_loss') {
        const result = calculateRowResult({
          profitLoss,
          commissionPercent,
          partnershipPercent,
        });
        totalCommission = result.commission;
        custNetWithComm = result.custNetWithComm;
        netProfitLoss = result.netProfitLoss;
        
        // For profit_loss commission type, negate profit/loss values
        profitLoss = -profitLoss;
        custNetWithComm = -custNetWithComm;
        netProfitLoss = -netProfitLoss;
      } else if (commissionType === 'entrywise') {
        // Entrywise calculation: commission on losing team total, then apply to gross difference
        const entrywiseResult = calculateEntrywise({
          winningTeamTotal,
          losingTeamTotal,
          commissionPercent,
          partnershipPercent,
        });
        totalCommission = entrywiseResult.commission;
        custNetWithComm = entrywiseResult.custNetWithComm;
        netProfitLoss = entrywiseResult.netProfitLoss;
        
        // For cut users with entrywise, negate profit/loss values
        if (isCutUser) {
          profitLoss = -profitLoss;
          custNetWithComm = -custNetWithComm;
          netProfitLoss = -netProfitLoss;
        }
      } else if (commissionType === 'no_commission') {
        // No commission, only partnership
        const partnershipRate = partnershipPercent / 100;
        totalCommission = 0;
        custNetWithComm = profitLoss * (1 - partnershipRate);
        netProfitLoss = profitLoss * (1 - partnershipRate);
      } else {
        // Other types - treat similar to no_commission
        const partnershipRate = partnershipPercent / 100;
        totalCommission = 0;
        custNetWithComm = profitLoss * (1 - partnershipRate);
        netProfitLoss = profitLoss * (1 - partnershipRate);
      }

      // Determine which team this user bet more on (for team totals grouping)
      let userTeam1Bet = 0;
      let userTeam2Bet = 0;
      userEntries.forEach((entry) => {
        const parseAmountFromString = (formattedString: string | null | undefined): number => {
          if (!formattedString || formattedString === '0' || formattedString === '0/0000') return 0;
          try {
            const parts = formattedString.split('/');
            if (parts.length === 2) {
              return Number(parts[1]) || 0;
            }
            return 0;
          } catch {
            return 0;
          }
        };
        userTeam1Bet += parseAmountFromString(entry.team1Fav) + parseAmountFromString(entry.team1Nfav);
        userTeam2Bet += parseAmountFromString(entry.team2Fav) + parseAmountFromString(entry.team2Nfav);
      });
      const userBetOnTeam1 = userTeam1Bet >= userTeam2Bet;

      rows.push({
        srNo: rowIndex++,
        custName: user.name,
        totalBet,
        profitLoss,
        totalCommission,
        commissionPercent,
        partnership: user.partnership,
        custNetWithComm,
        netProfitLoss,
        commissionType: user.commission_type,
        markAsCut: user.mark_as_cut ?? 'no',
        userBetOnTeam1, // Store which team user bet on
      });
    });

    // Sort by user name
    rows.sort((a, b) => a.custName.localeCompare(b.custName));

    // Update srNo to sequential numbers
    rows.forEach((row, index) => {
      row.srNo = index + 1;
    });

    // Calculate team totals - sum from filtered user rows instead of recalculating from entries
    // Find winning team directly from selected ID to ensure correct assignment
    const winningTeam = winningTeamId === selectedMatch.team1.id ? selectedMatch.team1 : selectedMatch.team2;
    const losingTeam = winningTeamId === selectedMatch.team1.id ? selectedMatch.team2 : selectedMatch.team1;

    if (winningTeam && losingTeam) {
      // Check number of user rows first - if only one user, use their values directly
      const userRows = rows.filter((row) => !row.isTotal && row.custName !== '');
      const hasOnlyOneUser = userRows.length === 1;
      
      // Check if we should sum from user rows or recalculate from entries
      // isAllSelected = true only when "all" is explicitly selected or nothing is selected
      const isAllSelected = reportFormData.selectionType === 'group' 
        ? (reportFormData.selectGroup === 'all' || reportFormData.selectGroup === '' || !reportFormData.selectGroup)
        : (reportFormData.selectUser === 'all' || reportFormData.selectUser === '' || !reportFormData.selectUser);
      
      // When we have only one user OR when filtered, we'll add winning team from user rows, so skip it in calculation
      // Also skip if we already added it above when isAllSelected and multiple users
      let skipWinningTeamRow = hasOnlyOneUser || !isAllSelected;

      // DEBUG: team total calculation context
      console.log('[BusinessReport][Totals] context', {
        selectionType: reportFormData.selectionType,
        selectUser: reportFormData.selectUser,
        selectGroup: reportFormData.selectGroup,
        isAllSelected,
        hasOnlyOneUser,
        userRowsCount: userRows.length,
        winningTeam: winningTeam?.name,
        losingTeam: losingTeam?.name,
        skipWinningTeamRow,
      });
      
      // If only one user row (regardless of selection), use those values directly
      if (hasOnlyOneUser) {
        const userRow = userRows[0];
        console.log('[BusinessReport][Totals] single user -> using user row directly', {
          custName: userRow.custName,
          totalCommission: userRow.totalCommission,
        });
        rows.push({
          srNo: 'Total',
          custName: '',
          totalBet: userRow.totalBet,
          profitLoss: userRow.profitLoss,
          totalCommission: userRow.totalCommission,
          commissionPercent: userRow.commissionPercent || 0,
          partnership: winningTeam.name,
          custNetWithComm: userRow.custNetWithComm,
          netProfitLoss: userRow.netProfitLoss,
          isTotal: true,
          teamName: winningTeam.name,
        });
      } else if (!isAllSelected) {
        // If multiple user rows and filtered, sum them
        const summedTotal = {
          totalBet: 0,
          profitLoss: 0,
          commission: 0,
          custNetWithComm: 0,
          netProfitLoss: 0,
        };

        userRows.forEach((row) => {
          summedTotal.totalBet += Number(row.totalBet) || 0;
          summedTotal.profitLoss += Number(row.profitLoss) || 0;
          summedTotal.commission += Number(row.totalCommission) || 0;
          summedTotal.custNetWithComm += Number(row.custNetWithComm) || 0;
          summedTotal.netProfitLoss += Number(row.netProfitLoss) || 0;
        });

        rows.push({
          srNo: 'Total',
          custName: '',
          totalBet: summedTotal.totalBet,
          profitLoss: summedTotal.profitLoss,
          totalCommission: summedTotal.commission,
          commissionPercent: summedTotal.commission > 0 && summedTotal.totalBet > 0 
            ? (summedTotal.commission / summedTotal.totalBet) * 100 : 0,
          partnership: winningTeam.name,
          custNetWithComm: summedTotal.custNetWithComm,
          netProfitLoss: summedTotal.netProfitLoss,
          isTotal: true,
          teamName: winningTeam.name,
        });
      }

      // Don't add empty separator row here when we added winning team from user rows
      // The losing team calculation below will add one empty row before the losing team total
      
      // When "All Users" is selected, calculate team totals by summing individual user rows
      // This ensures commission matches the sum of individual user commissions
      if (isAllSelected && userRows.length > 1) {
        console.log('[BusinessReport][Totals] isAllSelected=true -> summing ALL user rows for winning team total', {
          userRows: userRows.map((r) => ({
            custName: r.custName,
            totalCommission: r.totalCommission,
            profitLoss: r.profitLoss,
          })),
        });
        // Winning team total should sum ALL user rows (they're all calculated for winning team scenario)
        const winningTeamSum = {
          totalBet: 0,
          profitLoss: 0,
          commission: 0,
          custNetWithComm: 0,
          netProfitLoss: 0,
        };
        userRows.forEach((row) => {
          winningTeamSum.totalBet += Number(row.totalBet) || 0;
          winningTeamSum.profitLoss += Number(row.profitLoss) || 0;
          winningTeamSum.commission += Number(row.totalCommission) || 0;
          winningTeamSum.custNetWithComm += Number(row.custNetWithComm) || 0;
          winningTeamSum.netProfitLoss += Number(row.netProfitLoss) || 0;
        });
        console.log('[BusinessReport][Totals] winningTeamSum (from user rows)', winningTeamSum);

        // Add winning team total row (sum of all user rows)
        rows.push({
          srNo: 'Total',
          custName: '',
          totalBet: winningTeamSum.totalBet,
          profitLoss: winningTeamSum.profitLoss,
          totalCommission: winningTeamSum.commission,
          commissionPercent: winningTeamSum.commission > 0 && winningTeamSum.totalBet > 0 
            ? (winningTeamSum.commission / winningTeamSum.totalBet) * 100 : 0,
          partnership: winningTeam.name,
          custNetWithComm: winningTeamSum.custNetWithComm,
          netProfitLoss: winningTeamSum.netProfitLoss,
          isTotal: true,
          teamName: winningTeam.name,
        });

        // Add separator row
        rows.push({
          srNo: '',
          custName: '',
          totalBet: 0,
          profitLoss: 0,
          totalCommission: 0,
          commissionPercent: 0,
          partnership: '',
          custNetWithComm: 0,
          netProfitLoss: 0,
        });

        // For losing team, we need to calculate from entries (different scenario - if losing team won)
        // Set flag to skip winning team row in calculation below (we already added it)
        skipWinningTeamRow = true;
        
        // Continue to calculate losing team from entries below (don't return early)
      }
      
      // Always calculate team totals from entries (for losing team when filtered, for both teams when not filtered)
      // When isAllSelected is true and we already added winning team total, skipWinningTeamRow will be true
      const entriesForTeamTotals = isAllSelected ? allEntries : entries;
      const allUserGroups = new Map<number | string, Entry[]>();
      entriesForTeamTotals.forEach((entry) => {
        const key = entry.user_id || entry.customer;
        if (!allUserGroups.has(key)) {
          allUserGroups.set(key, []);
        }
        allUserGroups.get(key)!.push(entry);
      });

      // Calculate FIXED team totals for BOTH teams independently (regardless of winner selection)
      // Team1 totals (fixed)
      let team1TotalBet = 0;
      let team1ProfitLoss = 0;
      let team1Commission = 0;
      let team1CustNetWithComm = 0;
      let team1NetProfitLoss = 0;

      // Team2 totals (fixed)
      let team2TotalBet = 0;
      let team2ProfitLoss = 0;
      let team2Commission = 0;
      let team2CustNetWithComm = 0;
      let team2NetProfitLoss = 0;

      // Track if we have any entrywise/no_commission users (affects how we handle signs)
      let hasEntrywiseOrNoCommission = false;
      let hasNoCommission = false;

      // Use user maps for O(1) lookups (performance improvement)
      const userMapById = new Map(users.map((u) => [u.id, u]));
      const userMapByName = new Map(users.map((u) => [u.name, u]));

      // Process each user group to calculate individual user rows AND aggregate team totals
      allUserGroups.forEach((userEntries, userKey) => {
        // Find user (O(1) lookup)
        let user = null;
        if (typeof userKey === 'number') {
          user = userMapById.get(userKey) || null;
        } else {
          user = userMapByName.get(userKey) || null;
        }

        // Calculate user totals (for team aggregation only)
        let userProfitLoss = 0;

        // Calculate profit/loss for all entries of this user
        // Calculate Team1 and Team2 contributions separately (fixed, regardless of winner)
        let team1PayOut = 0;  // What we pay if Team1 wins
        let team1Receive = 0; // What we receive from Team2 when Team1 wins
        let team2PayOut = 0;  // What we pay if Team2 wins
        let team2Receive = 0; // What we receive from Team1 when Team2 wins
        let userTeam1Bet = 0;
        let userTeam2Bet = 0;

        userEntries.forEach((entry) => {
          // Parse amounts from formatted strings to match match entry table display
          const parseAmountFromString = (formattedString: string | null | undefined): number => {
            if (!formattedString || formattedString === '0' || formattedString === '0/0000') return 0;
            try {
              const parts = formattedString.split('/');
              if (parts.length === 2) {
                return Number(parts[1]) || 0;
              }
              return 0;
            } catch {
              return 0;
            }
          };

          const team1FavAmount = parseAmountFromString(entry.team1Fav);
          const team1NfavAmount = parseAmountFromString(entry.team1Nfav);
          const team2FavAmount = parseAmountFromString(entry.team2Fav);
          const team2NfavAmount = parseAmountFromString(entry.team2Nfav);

          const team1Amount = team1FavAmount + team1NfavAmount;
          const team1Rate = Number(entry.team1_rate) || 0;
          const team2Amount = team2FavAmount + team2NfavAmount;
          const team2Rate = Number(entry.team2_rate) || 0;
          const favouriteTeam = entry.favourite_team;

          userTeam1Bet += team1Amount;
          userTeam2Bet += team2Amount;

          // Calculate what happens if Team1 wins
            if (favouriteTeam === 'team1') {
            team1PayOut += (team1Rate / 100) * team1FavAmount; // Team1 favorite wins
            team2Receive += (team2Rate / 100) * team2NfavAmount; // Team2 non-favorite loses
            } else if (favouriteTeam === 'team2') {
            team1PayOut += team1NfavAmount; // Team1 non-favorite wins
            team2Receive += team2FavAmount; // Team2 favorite loses
            }

          // Calculate what happens if Team2 wins
            if (favouriteTeam === 'team2') {
            team2PayOut += (team2Rate / 100) * team2FavAmount; // Team2 favorite wins
            team1Receive += (team1Rate / 100) * team1NfavAmount; // Team1 non-favorite loses
            } else if (favouriteTeam === 'team1') {
            team2PayOut += team2NfavAmount; // Team2 non-favorite wins
            team1Receive += team1FavAmount; // Team1 favorite loses
          }
        });

        // Calculate user's total profit/loss (based on selected winner)
        const winningTeamPayOut = isTeam1Winner ? team1PayOut : team2PayOut;
        const losingTeamReceive = isTeam1Winner ? team2Receive : team1Receive;
        userProfitLoss = losingTeamReceive - winningTeamPayOut;

        // Calculate FIXED Team1 and Team2 profit/loss for this user (regardless of winner selection)
        // Team1 profit/loss = what we receive from Team2 - what we pay to Team1
        const userTeam1ProfitLoss = team2Receive - team1PayOut;
        // Team2 profit/loss = what we receive from Team1 - what we pay to Team2
        const userTeam2ProfitLoss = team1Receive - team2PayOut;

        // For entrywise: Calculate Win Side and Lost Side totals for this user based on selected winner
        // This uses the same logic as individual user rows
        let userWinningTeamFav = 0;
        let userWinningTeamNonFav = 0;
        let userLosingTeamFav = 0;
        let userLosingTeamNonFav = 0;
        
        // Arrays to store individual entry details for logging
        interface EntryLog {
          entryId: number;
          formatted: string;
          rate?: number;
          amount: number;
          calculated: number;
        }
        const winFavEntries: EntryLog[] = [];
        const winNonFavEntries: EntryLog[] = [];
        const lostFavEntries: EntryLog[] = [];
        const lostNonFavEntries: EntryLog[] = [];
        
        userEntries.forEach((entry) => {
          const parseAmountFromString = (formattedString: string | null | undefined): number => {
            if (!formattedString || formattedString === '0' || formattedString === '0/0000') return 0;
            try {
              const parts = formattedString.split('/');
              if (parts.length === 2) {
                return Number(parts[1]) || 0;
              }
              return 0;
            } catch {
              return 0;
            }
          };
          
          const team1FavAmount = parseAmountFromString(entry.team1Fav);
          const team1NfavAmount = parseAmountFromString(entry.team1Nfav);
          const team2FavAmount = parseAmountFromString(entry.team2Fav);
          const team2NfavAmount = parseAmountFromString(entry.team2Nfav);
          const team1Rate = Number(entry.team1_rate) || 0;
          const team2Rate = Number(entry.team2_rate) || 0;
          const favouriteTeam = entry.favourite_team;
          
          if (isTeam1Winner) {
            // Team1 wins: Team1 is winning team, Team2 is losing team
            if (favouriteTeam === 'team1') {
              // Team1 Win + Favorite: Green Fav × Rate (Win + Fav)
              const winFavValue = (team1Rate / 100) * team1FavAmount;
              userWinningTeamFav += winFavValue;
              winFavEntries.push({
                entryId: entry.id,
                formatted: entry.team1Fav,
                rate: team1Rate,
                amount: team1FavAmount,
                calculated: winFavValue,
              });
              // Team2 Loss + Non-Favorite: Red Non-Fav × Rate (Lost + Non-Fav)
              const lostNonFavValue = (team2Rate / 100) * team2NfavAmount;
              userLosingTeamNonFav += lostNonFavValue;
              if (lostNonFavValue > 0) {
                lostNonFavEntries.push({
                  entryId: entry.id,
                  formatted: entry.team2Nfav,
                  rate: team2Rate,
                  amount: team2NfavAmount,
                  calculated: lostNonFavValue,
                });
              }
            } else if (favouriteTeam === 'team2') {
              // Team1 Win + Non-Favorite: Red Non-Fav Amount (only amount) (Win + Non-Fav)
              userWinningTeamNonFav += team1NfavAmount;
              if (team1NfavAmount > 0) {
                winNonFavEntries.push({
                  entryId: entry.id,
                  formatted: entry.team1Nfav,
                  amount: team1NfavAmount,
                  calculated: team1NfavAmount,
                });
              }
              // Team2 Loss + Favorite: Green Fav Amount (only amount) (Lost + Fav)
              userLosingTeamFav += team2FavAmount;
              if (team2FavAmount > 0) {
                lostFavEntries.push({
                  entryId: entry.id,
                  formatted: entry.team2Fav,
                  amount: team2FavAmount,
                  calculated: team2FavAmount,
                });
              }
            }
          } else {
            // Team2 wins: Team2 is winning team, Team1 is losing team
            if (favouriteTeam === 'team2') {
              // Team2 Win + Favorite: Green Fav × Rate (Win + Fav)
              const winFavValue = (team2Rate / 100) * team2FavAmount;
              userWinningTeamFav += winFavValue;
              winFavEntries.push({
                entryId: entry.id,
                formatted: entry.team2Fav,
                rate: team2Rate,
                amount: team2FavAmount,
                calculated: winFavValue,
              });
              // Team1 Loss + Non-Favorite: Red Non-Fav × Rate (Lost + Non-Fav)
              const lostNonFavValue = (team1Rate / 100) * team1NfavAmount;
              userLosingTeamNonFav += lostNonFavValue;
              if (lostNonFavValue > 0) {
                lostNonFavEntries.push({
                  entryId: entry.id,
                  formatted: entry.team1Nfav,
                  rate: team1Rate,
                  amount: team1NfavAmount,
                  calculated: lostNonFavValue,
                });
              }
            } else if (favouriteTeam === 'team1') {
              // Team2 Win + Non-Favorite: Red Non-Fav Amount (only amount) (Win + Non-Fav)
              userWinningTeamNonFav += team2NfavAmount;
              if (team2NfavAmount > 0) {
                winNonFavEntries.push({
                  entryId: entry.id,
                  formatted: entry.team2Nfav,
                  amount: team2NfavAmount,
                  calculated: team2NfavAmount,
                });
              }
              // Team1 Loss + Favorite: Green Fav Amount (only amount) (Lost + Fav)
              userLosingTeamFav += team1FavAmount;
              if (team1FavAmount > 0) {
                lostFavEntries.push({
                  entryId: entry.id,
                  formatted: entry.team1Fav,
                  amount: team1FavAmount,
                  calculated: team1FavAmount,
                });
              }
            }
          }
        });
        
        
        // Calculate commission and partnership based on commission type
        if (user) {
          const commissionPercent = Number(user.commission) || 0;
          const partnershipPercent = Number(user.partnership) || 0;
          const commissionType = user.commission_type;

          // Only apply calculateRowResult for profit_loss commission type
          if (commissionType === 'profit_loss') {
            // Calculate FIXED Team1 totals for this user (regardless of winner selection)
            const team1Result = calculateRowResult({
              profitLoss: userTeam1ProfitLoss,
              commissionPercent,
              partnershipPercent,
            });

            // Calculate FIXED Team2 totals for this user (regardless of winner selection)
            const team2Result = calculateRowResult({
              profitLoss: userTeam2ProfitLoss,
              commissionPercent,
              partnershipPercent,
            });

            // Aggregate to FIXED team totals
            team1TotalBet += userTeam1Bet;
            team1ProfitLoss += userTeam1ProfitLoss; // Accumulate user's Team1 profit/loss
            team1Commission += team1Result.commission;
            team1CustNetWithComm += team1Result.custNetWithComm;
            team1NetProfitLoss += team1Result.netProfitLoss;

            team2TotalBet += userTeam2Bet;
            team2ProfitLoss += userTeam2ProfitLoss; // Accumulate user's Team2 profit/loss
            team2Commission += team2Result.commission;
            team2CustNetWithComm += team2Result.custNetWithComm;
            team2NetProfitLoss += team2Result.netProfitLoss;
          } else if (commissionType === 'no_commission') {
            hasEntrywiseOrNoCommission = true;
            hasNoCommission = true;
            // No commission, only partnership
            const partnershipRate = partnershipPercent / 100;

            // Calculate Team1 and Team2 Win/Lost Side totals for this user (fixed, regardless of winner)
            // Same logic as entrywise for Win/Lost Side calculation
            let team1WinSideFav = 0;
            let team1WinSideNonFav = 0;
            let team1LostSideFav = 0;
            let team1LostSideNonFav = 0;
            let team2WinSideFav = 0;
            let team2WinSideNonFav = 0;
            let team2LostSideFav = 0;
            let team2LostSideNonFav = 0;
            
            userEntries.forEach((entry) => {
              const parseAmountFromString = (formattedString: string | null | undefined): number => {
                if (!formattedString || formattedString === '0' || formattedString === '0/0000') return 0;
                try {
                  const parts = formattedString.split('/');
                  if (parts.length === 2) {
                    return Number(parts[1]) || 0;
                  }
                  return 0;
                } catch {
                  return 0;
                }
              };
              
              const team1FavAmount = parseAmountFromString(entry.team1Fav);
              const team1NfavAmount = parseAmountFromString(entry.team1Nfav);
              const team2FavAmount = parseAmountFromString(entry.team2Fav);
              const team2NfavAmount = parseAmountFromString(entry.team2Nfav);
              const team1Rate = Number(entry.team1_rate) || 0;
              const team2Rate = Number(entry.team2_rate) || 0;
              const favouriteTeam = entry.favourite_team;
              
              // Team1 Win Side (when Team1 wins)
              if (favouriteTeam === 'team1') {
                team1WinSideFav += (team1Rate / 100) * team1FavAmount;
                team1LostSideNonFav += (team2Rate / 100) * team2NfavAmount;
              } else if (favouriteTeam === 'team2') {
                team1WinSideNonFav += team1NfavAmount;
                team1LostSideFav += team2FavAmount;
              }
              
              // Team2 Win Side (when Team2 wins)
              if (favouriteTeam === 'team2') {
                team2WinSideFav += (team2Rate / 100) * team2FavAmount;
                team2LostSideNonFav += (team1Rate / 100) * team1NfavAmount;
              } else if (favouriteTeam === 'team1') {
                team2WinSideNonFav += team2NfavAmount;
                team2LostSideFav += team1FavAmount;
              }
            });
            
            // Calculate Team1 gross difference (when Team1 wins)
            const team1WinSideTotal = team1WinSideFav + team1WinSideNonFav;
            const team1LostSideTotal = team1LostSideFav + team1LostSideNonFav;
            const team1GrossDifference = team1LostSideTotal - team1WinSideTotal;
            
            // Calculate Team2 gross difference (when Team2 wins)
            const team2WinSideTotal = team2WinSideFav + team2WinSideNonFav;
            const team2LostSideTotal = team2LostSideFav + team2LostSideNonFav;
            const team2GrossDifference = team2LostSideTotal - team2WinSideTotal;
            
            // Apply partnership on gross difference (no commission)
            const team1CustNet = team1GrossDifference * partnershipRate;
            const team1Net = team1GrossDifference * (1 - partnershipRate);
            const team2CustNet = team2GrossDifference * partnershipRate;
            const team2Net = team2GrossDifference * (1 - partnershipRate);

            // Aggregate Team1 and Team2 contributions to team totals
            team1TotalBet += userTeam1Bet;
            team1ProfitLoss += team1GrossDifference;
            team1Commission += 0;
            team1CustNetWithComm += team1CustNet;
            team1NetProfitLoss += team1Net;

            team2TotalBet += userTeam2Bet;
            team2ProfitLoss += team2GrossDifference;
            team2Commission += 0;
            team2CustNetWithComm += team2CustNet;
            team2NetProfitLoss += team2Net;
        } else if (commissionType === 'entrywise') {
          hasEntrywiseOrNoCommission = true;
          // Entrywise calculation: commission on losing team total, then apply to gross difference
          // Calculate Team1 and Team2 Win/Lost Side totals for this user (fixed, regardless of winner)
          // Team1 Win Side (when Team1 wins): Team1 Fav × Rate + Team1 Non-Fav Amount
          // Team1 Lost Side (when Team1 wins): Team2 Fav Amount + Team2 Non-Fav × Rate
          // Team2 Win Side (when Team2 wins): Team2 Fav × Rate + Team2 Non-Fav Amount
          // Team2 Lost Side (when Team2 wins): Team1 Fav Amount + Team1 Non-Fav × Rate
          let team1WinSideFav = 0;
          let team1WinSideNonFav = 0;
          let team1LostSideFav = 0;
          let team1LostSideNonFav = 0;
          let team2WinSideFav = 0;
          let team2WinSideNonFav = 0;
          let team2LostSideFav = 0;
          let team2LostSideNonFav = 0;
          
          userEntries.forEach((entry) => {
            const parseAmountFromString = (formattedString: string | null | undefined): number => {
              if (!formattedString || formattedString === '0' || formattedString === '0/0000') return 0;
              try {
                const parts = formattedString.split('/');
                if (parts.length === 2) {
                  return Number(parts[1]) || 0;
                }
                return 0;
              } catch {
                return 0;
              }
            };
            
            const team1FavAmount = parseAmountFromString(entry.team1Fav);
            const team1NfavAmount = parseAmountFromString(entry.team1Nfav);
            const team2FavAmount = parseAmountFromString(entry.team2Fav);
            const team2NfavAmount = parseAmountFromString(entry.team2Nfav);
            const team1Rate = Number(entry.team1_rate) || 0;
            const team2Rate = Number(entry.team2_rate) || 0;
            const favouriteTeam = entry.favourite_team;
            
            // Team1 Win Side (when Team1 wins)
            if (favouriteTeam === 'team1') {
              // Team1 Fav × Rate
              team1WinSideFav += (team1Rate / 100) * team1FavAmount;
              // Team2 Non-Fav × Rate (for Lost Side)
              team1LostSideNonFav += (team2Rate / 100) * team2NfavAmount;
            } else if (favouriteTeam === 'team2') {
              // Team1 Non-Fav Amount
              team1WinSideNonFav += team1NfavAmount;
              // Team2 Fav Amount (for Lost Side)
              team1LostSideFav += team2FavAmount;
            }
            
            // Team2 Win Side (when Team2 wins)
            if (favouriteTeam === 'team2') {
              // Team2 Fav × Rate
              team2WinSideFav += (team2Rate / 100) * team2FavAmount;
              // Team1 Non-Fav × Rate (for Lost Side)
              team2LostSideNonFav += (team1Rate / 100) * team1NfavAmount;
            } else if (favouriteTeam === 'team1') {
              // Team2 Non-Fav Amount
              team2WinSideNonFav += team2NfavAmount;
              // Team1 Fav Amount (for Lost Side)
              team2LostSideFav += team1FavAmount;
            }
          });
          
          // Calculate Team1 entrywise result (when Team1 wins)
          const team1WinSideTotal = team1WinSideFav + team1WinSideNonFav;
          const team1LostSideTotal = team1LostSideFav + team1LostSideNonFav;
          const team1EntrywiseResult = calculateEntrywise({
            winningTeamTotal: team1WinSideTotal,
            losingTeamTotal: team1LostSideTotal,
            commissionPercent,
            partnershipPercent,
          });
          
          // Calculate Team2 entrywise result (when Team2 wins)
          const team2WinSideTotal = team2WinSideFav + team2WinSideNonFav;
          const team2LostSideTotal = team2LostSideFav + team2LostSideNonFav;
          const team2EntrywiseResult = calculateEntrywise({
            winningTeamTotal: team2WinSideTotal,
            losingTeamTotal: team2LostSideTotal,
            commissionPercent,
            partnershipPercent,
          });
          
          // Aggregate Team1 and Team2 contributions to team totals
          // Calculate actual profit/loss: losingTeamTotal - winningTeamTotal (can be negative)
          const team1ActualProfitLoss = team1LostSideTotal - team1WinSideTotal;
          const team2ActualProfitLoss = team2LostSideTotal - team2WinSideTotal;
          
          team1TotalBet += userTeam1Bet;
          team1ProfitLoss += team1ActualProfitLoss; // Use actual profit/loss (can be negative), not grossDifference
          team1Commission += team1EntrywiseResult.commission;
          team1CustNetWithComm += team1EntrywiseResult.custNetWithComm;
          team1NetProfitLoss += team1EntrywiseResult.netProfitLoss;
          
          team2TotalBet += userTeam2Bet;
          team2ProfitLoss += team2ActualProfitLoss; // Use actual profit/loss (can be negative), not grossDifference
          team2Commission += team2EntrywiseResult.commission;
          team2CustNetWithComm += team2EntrywiseResult.custNetWithComm;
          team2NetProfitLoss += team2EntrywiseResult.netProfitLoss;
          } else {
            // Other types - treat similar to no_commission
            const partnershipRate = partnershipPercent / 100;

            // Team totals
            const team1CustNet = userTeam1ProfitLoss * (1 - partnershipRate);
            const team1Net = userTeam1ProfitLoss * (1 - partnershipRate);
            const team2CustNet = userTeam2ProfitLoss * (1 - partnershipRate);
            const team2Net = userTeam2ProfitLoss * (1 - partnershipRate);

            team1TotalBet += userTeam1Bet;
            team1ProfitLoss += userTeam1ProfitLoss;
            team1Commission += 0;
            team1CustNetWithComm += team1CustNet;
            team1NetProfitLoss += team1Net;

            team2TotalBet += userTeam2Bet;
            team2ProfitLoss += userTeam2ProfitLoss;
            team2Commission += 0;
            team2CustNetWithComm += team2CustNet;
            team2NetProfitLoss += team2Net;
          }
        } else {
          // No user found - no commission/partnership

          // Still aggregate bets to team totals (no commission/partnership)
          team1TotalBet += userTeam1Bet;
          team1ProfitLoss += userTeam1ProfitLoss;
          team2TotalBet += userTeam2Bet;
          team2ProfitLoss += userTeam2ProfitLoss;
        }
      });


      // Select fixed team totals based on winner
      // firstTeamTotals = winning team totals
      // secondTeamTotals = losing team totals
      // NOTE: This must be AFTER entrywise calculation so team1Commission/team2Commission are set
      const firstTeamTotals = isTeam1Winner
        ? {
            name: winningTeam.name,
            totalBet: team1TotalBet,
            profitLoss: team1ProfitLoss,
            commission: team1Commission,
            custNetWithComm: team1CustNetWithComm,
            netProfitLoss: team1NetProfitLoss,
          }
        : {
            name: winningTeam.name,
            totalBet: team2TotalBet,
            profitLoss: team2ProfitLoss,
            commission: team2Commission,
            custNetWithComm: team2CustNetWithComm,
            netProfitLoss: team2NetProfitLoss,
          };

      // Calculate losing team totals from pre-aggregated values
      // Team totals are now sums of individual user calculations
      // For profit_loss: team1ProfitLoss and team2ProfitLoss are already correctly signed (can be + or -)
      // For entrywise: team1ProfitLoss and team2ProfitLoss are actual profit/loss (can be + or -), same as profit_loss
      // For no_commission: team1ProfitLoss and team2ProfitLoss are gross differences (always positive)
      // When we have no_commission users, we need to negate losing team values (grossDifference is always positive)
      // When we have entrywise users, values are already correctly signed (can be negative), so use as-is (same as profit_loss)
      // When we only have profit_loss users, values are already correctly signed, so use as-is
      const secondTeamTotals = isTeam1Winner
        ? {
            name: losingTeam.name,
            totalBet: team2TotalBet,
            profitLoss: hasNoCommission ? -team2ProfitLoss : team2ProfitLoss,
            commission: hasNoCommission ? -team2Commission : team2Commission,
            custNetWithComm: hasNoCommission ? -team2CustNetWithComm : team2CustNetWithComm,
            netProfitLoss: hasNoCommission ? -team2NetProfitLoss : team2NetProfitLoss,
          }
        : {
            name: losingTeam.name,
            totalBet: team1TotalBet,
            profitLoss: hasNoCommission ? -team1ProfitLoss : team1ProfitLoss,
            commission: hasNoCommission ? -team1Commission : team1Commission,
            custNetWithComm: hasNoCommission ? -team1CustNetWithComm : team1CustNetWithComm,
            netProfitLoss: hasNoCommission ? -team1NetProfitLoss : team1NetProfitLoss,
          };

      // Add winning team total row first (immediately after individual entries, no gap)
      // Skip if we already added it from user rows (when filtered)
      if (!skipWinningTeamRow) {
        console.log('[BusinessReport][Totals] adding winning team total row from ENTRY aggregation', {
          firstTeamTotals,
        });
        rows.push({
          srNo: 'Total',
          custName: '',
          totalBet: firstTeamTotals.totalBet,
          profitLoss: firstTeamTotals.profitLoss,
          totalCommission: firstTeamTotals.commission,
          commissionPercent: firstTeamTotals.commission > 0 ? (firstTeamTotals.commission / firstTeamTotals.totalBet) * 100 : 0,
          partnership: firstTeamTotals.name,
          custNetWithComm: firstTeamTotals.custNetWithComm,
          netProfitLoss: firstTeamTotals.netProfitLoss,
          isTotal: true,
          teamName: firstTeamTotals.name,
        });
      }

      // Add ONE empty separator row between team totals
      rows.push({
        srNo: '',
        custName: '',
        totalBet: 0,
        profitLoss: 0,
        totalCommission: 0,
        commissionPercent: 0,
        partnership: '',
        custNetWithComm: 0,
        netProfitLoss: 0,
      });

      // Add losing team total row below (always show, even if values are 0)
      rows.push({
        srNo: 'Total',
        custName: '',
        totalBet: secondTeamTotals.totalBet,
        profitLoss: secondTeamTotals.profitLoss,
        totalCommission: secondTeamTotals.commission,
        commissionPercent: secondTeamTotals.commission > 0 ? (secondTeamTotals.commission / secondTeamTotals.totalBet) * 100 : 0,
        partnership: secondTeamTotals.name,
        custNetWithComm: secondTeamTotals.custNetWithComm,
        netProfitLoss: secondTeamTotals.netProfitLoss,
        isTotal: true,
        teamName: secondTeamTotals.name,
      });
    }

    return rows;
  }, [entries, users, matches, reportFormData, reportGenerated, isLoadingEntries, calculateMatchFinalNetProfit]);

  // Transform matches into dropdown options
  const matchOptions = useMemo(() => {
    const options = [{ value: '', label: 'Select Match' }];
    if (isLoadingMatches) {
      options.push({ value: 'loading', label: 'Loading matches...' });
    } else if (matches.length > 0) {
      matches.forEach((match) => {
        options.push({
          value: String(match.id),
          label: match.match_between || `${match.team1.name} vs ${match.team2.name}`,
        });
      });
    } else if (isValidDate && !isLoadingMatches) {
      options.push({ value: 'no-matches', label: 'No matches found' });
    }
    return options;
  }, [matches, isLoadingMatches, isValidDate]);

  // Get winning team options based on selected match
  const winningTeamOptions = useMemo(() => {
    const options = [{ value: '', label: 'Select Winning Team' }];
    if (formData.selectMatch) {
      const selectedMatch = matches.find((m) => String(m.id) === formData.selectMatch);
      if (selectedMatch) {
        options.push({
          value: String(selectedMatch.team1.id),
          label: selectedMatch.team1.name,
        });
        options.push({
          value: String(selectedMatch.team2.id),
          label: selectedMatch.team2.name,
        });
      }
    }
    return options;
  }, [matches, formData.selectMatch]);

  // Transform groups into dropdown options
  const groupOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Groups' }];
    if (isLoadingGroups) {
      options.push({ value: 'loading', label: 'Loading groups...' });
    } else if (groups.length > 0) {
      groups.forEach((group) => {
        options.push({
          value: String(group.id),
          label: group.name,
        });
      });
    }
    return options;
  }, [groups, isLoadingGroups]);

  // Transform users into dropdown options
  // If a group is selected, filter users by that group
  // If a match is selected, filter users to only those who have entries for that match
  const userOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Users' }];
    if (isLoadingUsers) {
      options.push({ value: 'loading', label: 'Loading users...' });
    } else if (users.length > 0) {
      let usersToShow = users;
      
      // If match is selected, filter users to only those who have entries for that match
      if (formData.selectMatch && entriesForUserFilter.length > 0) {
        const userIdsWithEntries = new Set(
          entriesForUserFilter
            .filter(entry => entry.user_id)
            .map(entry => entry.user_id as number)
        );
        usersToShow = usersToShow.filter(user => userIdsWithEntries.has(user.id));
      }
      
      // If group is selected and not 'all', filter users by group
      if (formData.selectionType === 'group' && formData.selectGroup && formData.selectGroup !== 'all') {
        const selectedGroup = groups.find(g => String(g.id) === formData.selectGroup);
        if (selectedGroup && selectedGroup.users) {
          const groupUserIds = selectedGroup.users.map(u => u.id);
          usersToShow = usersToShow.filter(user => groupUserIds.includes(user.id));
        }
      }
      
      usersToShow.forEach((user) => {
        options.push({
          value: String(user.id),
          label: user.name,
        });
      });
    }
    return options;
  }, [users, isLoadingUsers, groups, formData.selectionType, formData.selectGroup, formData.selectMatch, entriesForUserFilter]);

  // Create innings/over options - filter by match if match is selected
  const inningOverOptions = useMemo(() => {
    // First option: "All" to show all innings/overs (empty value means show all)
    const options = [{ value: '', label: 'All Innings/Overs' }];
    
    // If match is selected and reportType is session, filter innings/overs based on sessions for that match
    if (formData.selectMatch && formData.reportType === 'session' && sessionsForInningFilter.length > 0) {
      // Get unique inning_over values from sessions for this match
      const uniqueInningOvers = new Set(
        sessionsForInningFilter.map(session => session.inning_over).filter(Boolean)
      );
      
      // Filter innings/overs to only show those that exist in sessions for this match
      inningsOvers.forEach((io) => {
        const inningOverValue = `${io.inning}/${io.over}`;
        if (uniqueInningOvers.has(inningOverValue)) {
          options.push({
            value: inningOverValue,
            label: `${io.inning}/${io.over} Over`,
          });
        }
      });
    } else {
      // Show all innings/overs if no match selected or not session report type
      inningsOvers.forEach((io) => {
        options.push({
          value: `${io.inning}/${io.over}`,
          label: `${io.inning}/${io.over} Over`,
        });
      });
    }
    
    return options;
  }, [inningsOvers, formData.selectMatch, formData.reportType, sessionsForInningFilter]);

  // Report type options
  const reportTypeOptions = [
    { value: '', label: 'Select Type' },
    { value: 'match', label: 'Match' },
    { value: 'session', label: 'Session' },
  ];

  // Reset selectMatch, winningTeam, and inningOver when date changes
  useEffect(() => {
    if (formData.matchDate && isValidDate) {
      setFormData((prev) => ({
        ...prev,
        selectMatch: '',
        winningTeam: '',
        inningOver: '',
      }));
      setReportGenerated(false);
    }
  }, [formData.matchDate, isValidDate]);

  // Reset report when report type, match, selection type, group, or user changes
  useEffect(() => {
    setReportGenerated(false);
    setReportFormData(null); // Clear old report data when form changes
  }, [formData.reportType, formData.selectMatch, formData.selectionType, formData.selectGroup, formData.selectUser]);

  // Reset winningTeam and inningOver when match changes
  useEffect(() => {
    if (formData.selectMatch) {
      setFormData((prev) => ({
        ...prev,
        winningTeam: '',
        inningOver: '',
      }));
    }
  }, [formData.selectMatch]);

  // Reset winningTeam and inningOver when reportType changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      winningTeam: '',
      inningOver: '',
    }));
  }, [formData.reportType]);

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


  const handleDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, matchDate: date, selectMatch: '', winningTeam: '', inningOver: '' }));
    setIsCalendarOpen(false);
    // Clear error
    if (errors.matchDate) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.matchDate;
        return newErrors;
      });
    }
  };

  const handleGenerateReport = async () => {
    const newErrors: Record<string, string> = {};

    // Validation - all fields are mandatory
    if (!formData.reportType) {
      newErrors.reportType = 'Report Type is required';
    }
    if (!formData.matchDate || !validateDate(formData.matchDate)) {
      newErrors.matchDate = 'Match Date is required';
    }
    if (!formData.selectMatch) {
      newErrors.selectMatch = 'Select Match is required';
    }
    // Validate based on report type
    if (formData.reportType === 'match') {
      if (!formData.winningTeam) {
        newErrors.winningTeam = 'Winning Team is required';
      }
    }
    // Note: inningOver is optional for session reports - if empty, shows all innings/overs
    if (formData.selectionType === 'group') {
      if (!formData.selectGroup) {
        newErrors.selectGroup = 'Select Group is required';
      }
    } else {
      if (!formData.selectUser) {
        newErrors.selectUser = 'Select User is required';
      }
    }

    // Set errors and show toast if validation fails
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError, { duration: 3000 });
      return;
    }

    // Clear all errors on success
    setErrors({});
    
    // Refetch ALL data from database to ensure fresh values (commission, rates, amounts, etc.)
    toast.loading('Refreshing data from database...', { id: 'refreshing-data' });
    
    try {
      // Convert date format from dd-mm-yyyy to yyyy-mm-dd for API
      const [day, month, year] = formData.matchDate.split('-');
      const apiDate = `${year}-${month}-${day}`;
      
      // OPTIMIZED: Only refetch data that's actually needed for the report
      // Refetch based on report type to avoid unnecessary API calls
      const refetchPromises = [
        // Always refetch users (for commission, partnership values)
        queryClient.refetchQueries({ queryKey: userKeys.list() }),
        // Always refetch matches for the selected date
        queryClient.refetchQueries({ queryKey: matchKeys.listByDate(apiDate) }),
        // Always refetch groups (for group data)
        queryClient.refetchQueries({ queryKey: groupKeys.list() }),
      ];

      // Refetch entries only if report type is 'match'
      if (formData.reportType === 'match') {
        refetchPromises.push(
          queryClient.refetchQueries({ queryKey: ['entries', formData.selectMatch] })
        );
      }

      // Refetch sessions only if report type is 'session'
      if (formData.reportType === 'session') {
        refetchPromises.push(
          queryClient.refetchQueries({ queryKey: sessionKeys.list(Number(formData.selectMatch)) })
        );
      }

      // Always refetch innings/overs (used in filters)
      refetchPromises.push(
        queryClient.refetchQueries({ queryKey: inningsOverKeys.list() })
      );

      await Promise.all(refetchPromises);
      
      toast.dismiss('refreshing-data');
      toast.success('Data refreshed successfully!', { duration: 2000 });
    } catch (error) {
      toast.dismiss('refreshing-data');
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data. Using cached data.', { duration: 3000 });
    }
    
    // Store form data snapshot for calculation (prevents reactive updates)
    setReportFormData({ ...formData });
    // Force fresh calculation by resetting and then setting reportGenerated
    setReportGenerated(false);
    // Use requestAnimationFrame to ensure state update happens before recalculation
    requestAnimationFrame(() => {
      setReportGenerated(true);
    });
    toast.success('Report generated successfully!', { duration: 3000 });
  };

  interface MatchSummaryRow {
    srNo: string | number;
    custName: string;
    totalBet: number;
    profitLoss: number;
    totalCommission: number;
    commissionPercent: number;
    partnership: number | string;
    custNetWithComm: number;
    netProfitLoss: number;
    isTotal?: boolean;
    teamName?: string;
    commissionType?: string;
    markAsCut?: 'no' | 'yes';
    userBetOnTeam1?: boolean; // Which team user bet more on (for team totals grouping)
  }

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Helper function to get display value from column render function or raw value
  const getDisplayValue = (column: Column<MatchSummaryRow>, row: MatchSummaryRow): string => {
    const rawValue = row[column.key as keyof MatchSummaryRow];
    
    // If column has a render function, we need to extract text from the rendered JSX
    // For export purposes, we'll use the raw value or a simplified version
    if (column.render) {
      // For complex renders (like badges), we'll use the raw value
      // This is a simplified approach - in a real scenario, you might want to extract text from JSX
      if (column.key === 'custName') {
        return String(rawValue || '');
      }
      if (column.key === 'totalBet' || column.key === 'profitLoss' || column.key === 'totalCommission' || 
          column.key === 'custNetWithComm' || column.key === 'netProfitLoss') {
        const numValue = typeof rawValue === 'number' ? rawValue : (typeof rawValue === 'string' ? parseFloat(rawValue.replace(/,/g, '')) || 0 : Number(rawValue) || 0);
        return formatNumber(numValue);
      }
      if (column.key === 'commissionPercent' || column.key === 'partnership') {
        const numValue = typeof rawValue === 'number' ? rawValue : (typeof rawValue === 'string' ? parseFloat(rawValue.replace(/,/g, '')) || 0 : Number(rawValue) || 0);
        return String(numValue);
      }
      return String(rawValue || '');
    }
    
    // Handle numbers
    if (typeof rawValue === 'number') {
      if (column.key === 'totalBet' || column.key === 'profitLoss' || column.key === 'totalCommission' || 
          column.key === 'custNetWithComm' || column.key === 'netProfitLoss') {
        return formatNumber(rawValue);
      }
      return String(rawValue);
    }
    
    // Handle strings
    if (typeof rawValue === 'string') {
      return rawValue;
    }
    
    // Handle null/undefined
    if (rawValue == null) {
      return '';
    }
    
    return String(rawValue);
  };

  // Use calculated data when report is generated, otherwise use empty array
  const matchSummaryData = useMemo(() => {
    if (formData.reportType === 'match' && calculatedMatchSummaryData.length > 0) {
      return calculatedMatchSummaryData;
    }
    return [];
  }, [calculatedMatchSummaryData, formData.reportType]);


  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };


  // DataTable columns configuration for Match Summary
  const columns: Column<MatchSummaryRow>[] = [
    {
      key: 'srNo',
      label: 'Sr No',
      sortable: false,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        return (
          <span className={row.isTotal ? 'font-bold' : ''}>
            {isEmptyRow ? '-' : (value || '')}
          </span>
        );
      },
    },
    {
      key: 'custName',
      label: 'Cust Name',
      sortable: false,
      render: (value, row) => {
        const getCommissionTypeBadge = (type?: string) => {
          if (type === 'profit_loss') return { text: 'PL', color: 'bg-blue-200 text-blue-800' };
          if (type === 'no_commission') return { text: 'NC', color: 'bg-green-200 text-green-800' };
          if (type === 'entrywise') return { text: 'En.w', color: 'bg-purple-200 text-purple-800' };
          return null;
        };
        const commissionTypeBadge = getCommissionTypeBadge(row.commissionType);
        const isCutUser = row.markAsCut === 'yes';
        
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        return (
          <div className={`${row.isTotal ? 'font-bold' : ''} relative -m-3 p-3`}>
            <div className="flex flex-col gap-1 items-start">
              <div className="flex items-center gap-1">
                <span>{isEmptyRow ? '-' : (value || '')}</span>
                {isCutUser && !row.isTotal && !isEmptyRow && (
                  <span className="inline-block px-1 py-0.5 bg-orange-200 text-orange-800 rounded text-[10px] font-semibold">
                    CT
                  </span>
                )}
                {!isCutUser && commissionTypeBadge && !row.isTotal && !isEmptyRow && (
                  <span className={`inline-block w-fit text-[10px] font-semibold px-1 py-0.5 rounded ${commissionTypeBadge.color}`}>
                    {commissionTypeBadge.text}
                  </span>
                )}
              </div>
              {isCutUser && commissionTypeBadge && !row.isTotal && !isEmptyRow && (
                <span className={`inline-block w-fit text-[10px] font-semibold px-1 py-0.5 rounded ${commissionTypeBadge.color}`}>
                  {commissionTypeBadge.text}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'totalBet',
      label: 'Total Bet',
      sortable: false,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        
        // Convert value to number - handle both number and string (with or without commas)
        let numValue = 0;
        if (typeof value === 'number') {
          numValue = value;
        } else if (typeof value === 'string') {
          // Remove commas and parse
          const cleaned = value.replace(/,/g, '').trim();
          numValue = parseFloat(cleaned) || 0;
        } else if (value != null) {
          numValue = Number(value) || 0;
        }
        
        // Only apply colors to TOTAL ROWS, not individual user rows
        const hasValue = numValue !== 0 && !isNaN(numValue);
        const isPositive = numValue > 0;
        
        // Determine background color class and inline style ONLY for total rows
        let bgColorClass = '';
        let inlineStyle: React.CSSProperties = {};
        if (row.isTotal && !isEmptyRow && hasValue) {
          bgColorClass = isPositive ? '!bg-[#00a65a] !text-white' : '!bg-[#dd4b39] !text-white';
          // Use inline style with explicit values - React will apply these correctly
          inlineStyle = {
            backgroundColor: isPositive ? '#00a65a' : '#dd4b39',
            color: '#ffffff',
            // Ensure it fills the entire cell
            margin: '-0.75rem',
            padding: '0.75rem',
          };
        }
        
        const classes = [
          '-m-3',
          'p-3',
          row.isTotal ? 'font-bold' : '',
          bgColorClass
        ].filter(Boolean).join(' ');
        
        return (
          <div className={classes} style={inlineStyle}>
            {isEmptyRow ? '-' : (hasValue ? formatNumber(numValue) : '')}
          </div>
        );
      },
    },
    {
      key: 'profitLoss',
      label: 'Profit/Loss(+/-)',
      sortable: false,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        
        // Convert value to number - handle both number and string (with or without commas)
        let numValue = 0;
        if (typeof value === 'number') {
          numValue = value;
        } else if (typeof value === 'string') {
          // Remove commas and parse
          const cleaned = value.replace(/,/g, '').trim();
          numValue = parseFloat(cleaned) || 0;
        } else if (value != null) {
          numValue = Number(value) || 0;
        }
        
        // Only show background if there's a value
        const hasValue = numValue !== 0 && !isNaN(numValue);
        const isPositive = numValue > 0;
        
        // Determine background color class - ONLY apply colors to TOTAL ROWS, not individual user rows
        let bgColorClass = '';
        let inlineStyle: React.CSSProperties = {};
        if (row.isTotal && !isEmptyRow && hasValue) {
          bgColorClass = isPositive ? '!bg-[#00a65a] !text-white' : '!bg-[#dd4b39] !text-white';
          // Use inline style with explicit values - React will apply these correctly
          inlineStyle = {
            backgroundColor: isPositive ? '#00a65a' : '#dd4b39',
            color: '#ffffff',
            // Ensure it fills the entire cell
            margin: '-0.75rem',
            padding: '0.75rem',
          };
        }
        
        const classes = [
          '-m-3',
          'p-3',
          row.isTotal ? 'font-bold' : '',
          bgColorClass
        ].filter(Boolean).join(' ');
        
        return (
          <div className={classes} style={inlineStyle}>
            {isEmptyRow ? '-' : (hasValue ? formatNumber(numValue) : '')}
          </div>
        );
      },
    },
    {
      key: 'totalCommission',
      label: 'Total Commisson',
      sortable: false,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        
        // Convert value to number - handle both number and string (with or without commas)
        let numValue = 0;
        if (typeof value === 'number') {
          numValue = value;
        } else if (typeof value === 'string') {
          // Remove commas and parse
          const cleaned = value.replace(/,/g, '').trim();
          numValue = parseFloat(cleaned) || 0;
        } else if (value != null) {
          numValue = Number(value) || 0;
        }
        
        const commissionPercent = Number(row.commissionPercent) || 0;
        const formattedPercent = commissionPercent.toFixed(2);
        
        // Only apply colors to TOTAL ROWS, not individual user rows
        const hasValue = numValue !== 0 && !isNaN(numValue);
        const isPositive = numValue > 0;
        
        // Determine background color class and inline style ONLY for total rows
        let bgColorClass = '';
        let inlineStyle: React.CSSProperties = {};
        if (row.isTotal && !isEmptyRow && hasValue) {
          bgColorClass = isPositive ? '!bg-[#00a65a] !text-white' : '!bg-[#dd4b39] !text-white';
          // Use inline style with explicit values - React will apply these correctly
          inlineStyle = {
            backgroundColor: isPositive ? '#00a65a' : '#dd4b39',
            color: '#ffffff',
            // Ensure it fills the entire cell
            margin: '-0.75rem',
            padding: '0.75rem',
          };
        }
        
        const classes = [
          '-m-3',
          'p-3',
          row.isTotal ? 'font-bold' : '',
          bgColorClass
        ].filter(Boolean).join(' ');
        
        return (
          <div className={classes} style={inlineStyle}>
            {isEmptyRow 
              ? '-'
              : row.isTotal
                ? formatNumber(value) // For total rows, don't show percentage
              : value > 0 
                ? `${formatNumber(value)} (${formattedPercent}%)` 
                  : value !== 0
                    ? formatNumber(value)
                    : ''}
          </div>
        );
      },
    },
    {
      key: 'partnership',
      label: 'Partnership',
      sortable: false,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        // For total rows with team name (string), use blue background. For individual rows, no background
        const hasValue = value && (typeof value === 'string' ? value.trim() !== '' : true);
        const bgColorClass = (row.isTotal && hasValue && typeof value === 'string') 
          ? '!bg-[#0073b7] !text-white' 
          : '';
        // For total rows, show team name (string), for individual rows show percentage with 2 decimals
        // For empty rows, show dash
        const displayValue = isEmptyRow
          ? '-'
          : row.isTotal 
            ? value 
            : (typeof value === 'number' ? value.toFixed(2) : value);
        return (
          <div 
            className={`-m-3 p-3 ${row.isTotal ? 'font-bold' : ''} ${bgColorClass}`}
          >
            {displayValue || ''}
          </div>
        );
      },
    },
    {
      key: 'custNetWithComm',
      label: 'Cust net with comm',
      sortable: false,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        
        // Convert value to number - handle both number and string (with or without commas)
        let numValue = 0;
        if (typeof value === 'number') {
          numValue = value;
        } else if (typeof value === 'string') {
          // Remove commas and parse
          const cleaned = value.replace(/,/g, '').trim();
          numValue = parseFloat(cleaned) || 0;
        } else if (value != null) {
          numValue = Number(value) || 0;
        }
        
        const isPositive = numValue > 0;
        const hasValue = numValue !== 0 && !isNaN(numValue);
        
        // Determine background color class
        let bgColorClass = '';
        let inlineStyle: React.CSSProperties = {};
        if (!isEmptyRow && hasValue) {
          bgColorClass = isPositive ? '!bg-[#00a65a] !text-white' : '!bg-[#dd4b39] !text-white';
          // Use inline style with explicit values - React will apply these correctly
          inlineStyle = {
            backgroundColor: isPositive ? '#00a65a' : '#dd4b39',
            color: '#ffffff',
            // Ensure it fills the entire cell
            margin: '-0.75rem',
            padding: '0.75rem',
          };
        }
        
        const classes = [
          '-m-3',
          'p-3',
          'font-bold',
          bgColorClass
        ].filter(Boolean).join(' ');
        
        return (
          <div className={classes} style={inlineStyle}>
            {isEmptyRow ? '-' : (hasValue ? formatNumber(numValue) : '0')}
          </div>
        );
      },
    },
    {
      key: 'netProfitLoss',
      label: 'Net Profit/Loss',
      sortable: false,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        
        // Convert value to number - handle both number and string (with or without commas)
        let numValue = 0;
        if (typeof value === 'number') {
          numValue = value;
        } else if (typeof value === 'string') {
          // Remove commas and parse
          const cleaned = value.replace(/,/g, '').trim();
          numValue = parseFloat(cleaned) || 0;
        } else if (value != null) {
          numValue = Number(value) || 0;
        }
        
        const isPositive = numValue > 0;
        const hasValue = numValue !== 0 && !isNaN(numValue);
        
        // Determine background color class
        let bgColorClass = '';
        let inlineStyle: React.CSSProperties = {};
        if (!isEmptyRow && hasValue) {
          bgColorClass = isPositive ? '!bg-[#00a65a] !text-white' : '!bg-[#dd4b39] !text-white';
          // Use inline style with explicit values - React will apply these correctly
          inlineStyle = {
            backgroundColor: isPositive ? '#00a65a' : '#dd4b39',
            color: '#ffffff',
            // Ensure it fills the entire cell
            margin: '-0.75rem',
            padding: '0.75rem',
          };
        }
        
        const classes = [
          '-m-3',
          'p-3',
          'font-bold',
          bgColorClass
        ].filter(Boolean).join(' ');
        
        return (
          <div className={classes} style={inlineStyle}>
            {isEmptyRow ? '-' : (hasValue ? formatNumber(numValue) : '0')}
          </div>
        );
      },
    },
  ];

  // Convert data to CSV format
  const convertToCSV = (data: MatchSummaryRow[]): string => {
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

  // Download CSV handler
  const handleDownloadCSV = () => {
    if (matchSummaryData.length === 0) {
      toast.error('No data to download', { duration: 2000 });
      return;
    }
    const csvData = convertToCSV(matchSummaryData);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `business_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV file downloaded!', { duration: 2000 });
  };

  // Download Excel handler
  const handleDownloadExcel = () => {
    if (matchSummaryData.length === 0) {
      toast.error('No data to download', { duration: 2000 });
      return;
    }
    const csvData = convertToCSV(matchSummaryData);
    // Excel can open CSV files, but we'll add BOM for UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `business_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Excel file downloaded!', { duration: 2000 });
  };

  // Download PDF handler
  const handleDownloadPDF = async () => {
    if (matchSummaryData.length === 0) {
      toast.error('No data to download', { duration: 2000 });
      return;
    }

    try {
      // Dynamically import jsPDF and autoTable (client-side only to avoid SSR issues)
      const [{ default: jsPDF }, autoTable] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable').then(m => m.default)
      ]);
      
      // Get filter values for PDF header
      const selectedMatch = matches.find((m) => String(m.id) === formData.selectMatch);
      const matchName = selectedMatch ? `${selectedMatch.team1.name} vs ${selectedMatch.team2.name}` : 'N/A';
      const matchDate = formData.matchDate || 'N/A';
      
      // Get winning team name
      let winningTeamName = 'N/A';
      if (selectedMatch && formData.winningTeam) {
        const winningTeamId = Number(formData.winningTeam);
        if (winningTeamId === selectedMatch.team1.id) {
          winningTeamName = selectedMatch.team1.name;
        } else if (winningTeamId === selectedMatch.team2.id) {
          winningTeamName = selectedMatch.team2.name;
        }
      }
      
      // Get selection type and selected user/group name
      let selectionInfo = '';
      if (formData.selectionType === 'user') {
        if (formData.selectUser === 'all') {
          selectionInfo = 'All Users';
        } else {
          const selectedUser = users.find((u) => String(u.id) === formData.selectUser);
          selectionInfo = selectedUser ? selectedUser.name : 'N/A';
        }
      } else {
        if (formData.selectGroup === 'all') {
          selectionInfo = 'All Groups';
        } else {
          const selectedGroup = groups.find((g) => String(g.id) === formData.selectGroup);
          selectionInfo = selectedGroup ? selectedGroup.name : 'N/A';
        }
      }
      
      // Create new jsPDF instance
      const doc = new jsPDF('landscape'); // Use landscape for better table fit
      
      // Add title
      doc.setFontSize(16);
      doc.text('Business Report', 14, 15);
      
      // Add filter information
      doc.setFontSize(10);
      let yPos = 22;
      doc.text(`Match Date: ${matchDate}`, 14, yPos);
      yPos += 6;
      doc.text(`Match: ${matchName}`, 14, yPos);
      yPos += 6;
      doc.text(`Winning Team: ${winningTeamName}`, 14, yPos);
      yPos += 6;
      doc.text(`Selection: ${formData.selectionType === 'user' ? 'User' : 'Group'} - ${selectionInfo}`, 14, yPos);
      yPos += 6;
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, yPos);
      
      // Prepare table data
      const tableData = matchSummaryData.map(row => 
        columns.map(col => {
          const displayValue = getDisplayValue(col, row);
          return displayValue || '';
        })
      );
      
      // Prepare table headers
      const tableHeaders = columns.map(col => capitalizeFirst(col.label));
      
      // Add table using autoTable function (not method)
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: yPos + 5,
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [242, 242, 242],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 249, 249],
        },
        margin: { top: 28, right: 14, bottom: 14, left: 14 },
      });
      
      // Save the PDF
      doc.save(`business_report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF file downloaded!', { duration: 2000 });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF', { duration: 2000 });
    }
  };

  // Print handler - prints only table data, not the form
  const handlePrint = () => {
    if (matchSummaryData.length === 0) {
      toast.error('No data to print', { duration: 2000 });
      return;
    }
    
    // Create a new window with table content for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print', { duration: 3000 });
      return;
    }

    // Build HTML content with only the table
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Business Report</title>
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
          <h1>Business Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${capitalizeFirst(col.label)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${matchSummaryData.map(row => `
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

  return (
    <div className="space-y-2">
      <Card>
        <form className="space-y-6">
          {/* First Row - Report Type, Match Date, Select Match, WinningTeam/Inning/Over, Selection Type */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Report Type Field */}
            <div className="md:col-span-2">
              <Select
                label="Report Type*"
                id="report-type"
                value={formData.reportType}
                onChange={(e) => handleInputChange('reportType', e.target.value)}
                options={reportTypeOptions}
                error={errors.reportType}
              />
            </div>

            {/* Match Date Field */}
            <div className="md:col-span-2 space-y-2">
              <label htmlFor="match-date" className="block text-sm font-bold text-retro-dark">
                Match Date*
              </label>
              <div className="relative">
                <input
                  ref={dateInputRef}
                  type="text"
                  id="match-date"
                  value={formData.matchDate}
                  onChange={(e) => handleInputChange('matchDate', e.target.value)}
                  onFocus={() => setIsCalendarOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsCalendarOpen(false);
                    }
                  }}
                  placeholder="dd-mm-yyyy"
                  className={`w-full px-3 py-1.5 bg-white border-2 ${
                    errors.matchDate ? 'border-red-500' : 'border-retro-dark'
                  } text-retro-dark font-bold text-xs rounded focus:outline-none focus:ring-2 focus:ring-retro-accent disabled:opacity-50 disabled:cursor-not-allowed`}
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
                {isCalendarOpen && (
                  <DatePicker
                    value={formData.matchDate}
                    onChange={handleDateChange}
                    onClose={() => setIsCalendarOpen(false)}
                    isOpen={isCalendarOpen}
                  />
                )}
              </div>
              {errors.matchDate && (
                <p className="text-sm text-red-500 mt-1">{errors.matchDate}</p>
              )}
            </div>

            {/* Select Match Field */}
            <div className="md:col-span-2">
              <Select
                label="Select Match*"
                id="select-match"
                value={formData.selectMatch}
                onChange={(e) => {
                  // Prevent selecting loading or no-matches options
                  if (e.target.value !== 'loading' && e.target.value !== 'no-matches') {
                    handleInputChange('selectMatch', e.target.value);
                  }
                }}
                options={matchOptions}
                error={errors.selectMatch}
                disabled={!isValidDate || isLoadingMatches}
              />
            </div>

            {/* Conditional Field: WinningTeam for Match (default), Inning/Over for Session */}
            {formData.reportType === 'session' ? (
              <div className="md:col-span-2">
                <Select
                  label="Inning/Over"
                  id="inning-over"
                  value={formData.inningOver}
                  onChange={(e) => handleInputChange('inningOver', e.target.value)}
                  options={inningOverOptions}
                  error={errors.inningOver}
                />
              </div>
            ) : (
              <div className="md:col-span-2">
                <Select
                  label="WinningTeam*"
                  id="winning-team"
                  value={formData.winningTeam}
                  onChange={(e) => handleInputChange('winningTeam', e.target.value)}
                  options={winningTeamOptions}
                  error={errors.winningTeam}
                  disabled={!formData.selectMatch}
                />
              </div>
            )}

            {/* Selection Type Toggle Switch */}
            <div className="md:col-span-2 flex flex-col">
              <label className="block text-sm font-semibold text-[#2d2d2d] mb-2 uppercase">
                Selection Type*
              </label>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium transition-colors ${formData.selectionType === 'group' ? 'text-retro-dark' : 'text-gray-400'}`}>
                  Group
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = formData.selectionType === 'group' ? 'user' : 'group';
                    handleInputChange('selectionType', newValue);
                    handleInputChange('selectGroup', 'all');
                    handleInputChange('selectUser', 'all');
                  }}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-retro-accent focus:ring-offset-2 ${
                    formData.selectionType === 'user' ? 'bg-green-700' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={formData.selectionType === 'user'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.selectionType === 'user' ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium transition-colors ${formData.selectionType === 'user' ? 'text-retro-dark' : 'text-gray-400'}`}>
                  User
                </span>
              </div>
            </div>

            {/* Conditional Dropdown - Select User/Group */}
            <div className="md:col-span-2">
              {formData.selectionType === 'group' ? (
                <Select
                  label="Select Group*"
                  id="select-group"
                  value={formData.selectGroup}
                  onChange={(e) => {
                    // Prevent selecting loading option
                    if (e.target.value !== 'loading') {
                      handleInputChange('selectGroup', e.target.value);
                      handleInputChange('selectUser', 'all');
                    }
                  }}
                  options={groupOptions}
                  error={errors.selectGroup}
                  disabled={isLoadingGroups}
                />
              ) : (
                <Select
                  label="Select User*"
                  id="select-user"
                  value={formData.selectUser}
                  onChange={(e) => {
                    // Prevent selecting loading option
                    if (e.target.value !== 'loading') {
                      handleInputChange('selectUser', e.target.value);
                    }
                  }}
                  options={userOptions}
                  error={errors.selectUser}
                  disabled={isLoadingUsers}
                />
              )}
            </div>
          </div>

          {/* Second Row - Action Buttons */}
          <div className="flex flex-col md:flex-row gap-4 items-start justify-end">
            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleGenerateReport}
                className="px-4 py-1.5 bg-green-700 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity"
              >
                Generate Report
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 bg-red-700 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="px-4 py-1.5 bg-blue-700 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity"
              >
                Download
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* Conditional Table Display */}
      {reportGenerated && (
        <>
          {/* MATCH SUMMARY Table - Show when reportType is 'match' */}
          {formData.reportType === 'match' && (
            <Card>
              <div className="p-4">
                {isLoadingEntries ? (
                  <div className="py-8 text-center">
                    <p className="text-lg text-retro-dark">Loading match data...</p>
                  </div>
                ) : matchSummaryData.length > 0 ? (
                  <DataTable
                    data={matchSummaryData}
                    columns={columns}
                    entriesPerPageOptions={[10, 25, 50, 100]}
                    defaultEntriesPerPage={100}
                    showEntries={true}
                    showExport={true}
                    showSearch={true}
                  />
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-lg text-retro-dark">No match data found for the selected match.</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* SESSION Table - Show when reportType is 'session' */}
          {formData.reportType === 'session' && (
            <Card>
              <div className="p-4">
                <div className="mb-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Session Entries</h2>
                      <p className="text-sm text-retro-dark/60 mt-1">
                        {sessionData.length} {sessionData.length === 1 ? 'entry' : 'entries'} found
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pagination Controls */}
                <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="entriesPerPage" className="text-sm font-semibold text-retro-dark">
                      Show:
                    </label>
                    <select
                      id="entriesPerPage"
                      value={entriesPerPage}
                      onChange={(e) => handleEntriesPerPageChange(e.target.value)}
                      className="px-3 py-1.5 border-2 border-retro-dark rounded-lg bg-white text-sm font-semibold"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-retro-dark">entries</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-semibold text-retro-dark">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {isLoadingSessions ? (
                  <div className="py-8 text-center">
                    <p className="text-lg text-retro-dark">Loading session data...</p>
                  </div>
                ) : sessionData.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-lg text-retro-dark">No session data found for the selected match.</p>
                  </div>
                ) : (
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
                        </tr>
                      </thead>
                      {/* Table Body */}
                      <tbody>
                        {(() => {
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
                              borderClasses += ' border-t-4 border-gray-700 border-b-0';
                            } else if (isLastRowOfUserGroup && index < paginatedEntries.length - 1) {
                              borderClasses += ' border-b-0';
                            } else if (!isLastRowOfUserGroup && nextEntry && nextEntry.user_id === entry.user_id) {
                              borderClasses += ' border-b-0';
                            } else {
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
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onDownloadPDF={handleDownloadPDF}
        onDownloadExcel={handleDownloadExcel}
        onDownloadCSV={handleDownloadCSV}
      />
    </div>
  );
}

