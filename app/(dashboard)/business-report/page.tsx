'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Select from '@/app/components/ui/Select';
import DatePicker from '@/app/components/ui/DatePicker';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import { useMatchesByDate } from '@/app/hooks/useMatches';
import { useUsers } from '@/app/hooks/useUsers';
import { useSessions, Session } from '@/app/hooks/useSessions';
import { useEntries, Entry } from '@/app/hooks/useEntries';
import { calculateFinalNetProfit, calculateEntrywiseCommission } from '@/app/utils/commissionCalculator';

export default function BusinessReportPage() {
  const [formData, setFormData] = useState({
    reportType: '',
    matchDate: '',
    selectMatch: '',
    winningTeam: '',
    selectUser: 'all',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
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

  // Fetch sessions for the selected match (when report type is "session" and report is generated)
  const shouldFetchSessions = reportGenerated && formData.selectMatch && formData.reportType === 'session';
  const { data: allSessions = [], isLoading: isLoadingSessions } = useSessions(
    shouldFetchSessions ? Number(formData.selectMatch) : null
  );

  // Fetch match entries for the selected match (when report type is "match" and report is generated)
  const shouldFetchEntries = reportGenerated && formData.selectMatch && formData.reportType === 'match';
  const { data: entriesData, isLoading: isLoadingEntries } = useEntries(
    shouldFetchEntries ? formData.selectMatch : undefined
  );
  const allEntries: Entry[] = entriesData?.data || [];

  // Debug: Log session fetching
  useEffect(() => {
    if (reportGenerated && formData.selectMatch) {
      console.log('Session Fetch Status:', {
        shouldFetchSessions,
        matchId: formData.selectMatch,
        isLoadingSessions,
        allSessionsCount: allSessions.length,
        sessions: allSessions,
      });
    }
  }, [reportGenerated, formData.selectMatch, shouldFetchSessions, isLoadingSessions, allSessions]);

  // Filter sessions by selected user if not "all"
  const sessions = useMemo(() => {
    if (formData.selectUser === 'all' || !formData.selectUser) {
      return allSessions;
    }
    return allSessions.filter((session) => String(session.user_id) === formData.selectUser);
  }, [allSessions, formData.selectUser]);

  // Filter entries by selected user if not "all"
  const entries = useMemo(() => {
    if (formData.selectUser === 'all' || !formData.selectUser) {
      return allEntries;
    }
    return allEntries.filter((entry) => entry.user_id && String(entry.user_id) === formData.selectUser);
  }, [allEntries, formData.selectUser]);

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
  const calculatedMatchSummaryData = useMemo(() => {
    // Don't calculate if report not generated, wrong type, or no match selected
    if (!reportGenerated || formData.reportType !== 'match' || !formData.selectMatch) {
      return [];
    }

    // If still loading, return empty (will show loading state)
    if (isLoadingEntries) {
      return [];
    }

    // Debug logging
    console.log('Match Summary Calculation (from entries):', {
      reportGenerated,
      reportType: formData.reportType,
      selectMatch: formData.selectMatch,
      allEntriesCount: allEntries.length,
      entriesCount: entries.length,
      usersCount: users.length,
      matchesCount: matches.length,
    });

    // If no entries found, return empty (will show no data message)
    if (entries.length === 0) {
      console.log('No entries found for match:', formData.selectMatch);
      return [];
    }

    // Get selected match to find teams and winning team
    const selectedMatch = matches.find((m) => String(m.id) === formData.selectMatch);
    if (!selectedMatch) {
      console.log('Selected match not found in matches list');
      return [];
    }

    // Determine winning team
    const winningTeamId = Number(formData.winningTeam);
    const isTeam1Winner = winningTeamId === selectedMatch.team1.id;
    const isTeam2Winner = winningTeamId === selectedMatch.team2.id;

    if (!isTeam1Winner && !isTeam2Winner) {
      console.log('Winning team not selected or invalid');
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
      console.log('No users found in entries');
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

      // Calculate totals
      const winningTeamTotal = winningTeamFav + winningTeamNonFav;  // What we PAY OUT (liability)
      const losingTeamTotal = losingTeamFav + losingTeamNonFav;        // What we RECEIVE (asset)
      
      // Net profit/loss = What we RECEIVE - What we PAY OUT = Losing Team Total - Winning Team Total
      profitLoss = losingTeamTotal - winningTeamTotal;

      // If no user found, use customer name from entry
      const custName = user ? user.name : (userEntries[0]?.customer || 'Unknown');

      // Skip if no user found and we need commission/partnership info
      if (!user) {
        console.log('User not found for entry:', userKey);
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
        });
        return;
      }

      // Calculate commission using utility function
      let totalCommission = 0;
      const commissionPercent = user.commission || 0;
      let custNetWithComm = 0;
      let netProfitLoss = 0;

      if (user.commission_type === 'entrywise') {
        // Handle entrywise commission separately (needs per-entry calculation)
        let totalProfit = 0;
        let totalLoss = 0;
        
        userEntries.forEach((entry) => {
          // Parse amounts from formatted strings
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
          
          let entryProfitLoss = 0;
          
          if (isTeam1Winner) {
            let team1Win = 0;
            let team2Loss = 0;
            
            if (favouriteTeam === 'team1') {
              team1Win = (team1Rate / 100) * team1FavAmount;
              team2Loss = (team2Rate / 100) * team2NfavAmount;
            } else if (favouriteTeam === 'team2') {
              team1Win = team1NfavAmount;
              team2Loss = team2FavAmount;
            }
            
            entryProfitLoss = team1Win - team2Loss;
          } else if (isTeam2Winner) {
            let team2Win = 0;
            let team1Loss = 0;
            
            if (favouriteTeam === 'team2') {
              team2Win = (team2Rate / 100) * team2FavAmount;
              team1Loss = (team1Rate / 100) * team1NfavAmount;
            } else if (favouriteTeam === 'team1') {
              team2Win = team2NfavAmount;
              team1Loss = team1FavAmount;
            }
            
            entryProfitLoss = team2Win - team1Loss;
          }

          if (entryProfitLoss >= 0) {
            totalProfit += entryProfitLoss;
          } else {
            totalLoss += entryProfitLoss; // negative
          }
        });
        
        // Use entrywise commission calculator
        const entrywiseResult = calculateEntrywiseCommission({
          totalProfit,
          totalLoss,
          commissionPercent: Number(user.commission) || 0,
          partnershipPercent: Number(user.partnership) || 0,
        });

        totalCommission = entrywiseResult.totalCommissionAfterPartnership;
        custNetWithComm = entrywiseResult.partnershipAmount;
        netProfitLoss = entrywiseResult.netProfitLoss;
      } else {
        // Use standard commission calculator for no_commission and profit_loss
        const commissionResult = calculateFinalNetProfit({
          profitLoss,
          commissionPercent: Number(user.commission) || 0,
          partnershipPercent: Number(user.partnership) || 0,
          commissionType: user.commission_type,
        });

        totalCommission = commissionResult.totalCommissionAfterPartnership;
        custNetWithComm = commissionResult.partnershipAmount;
        netProfitLoss = commissionResult.netProfitLoss;
      }

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
      });
    });

    // Sort by user name
    rows.sort((a, b) => a.custName.localeCompare(b.custName));

    // Update srNo to sequential numbers
    rows.forEach((row, index) => {
      row.srNo = index + 1;
    });

    // Calculate team totals - need both losing team and winning team totals
    // Calculate totals from ALL entries (allEntries), not just filtered entries
    const winningTeam = isTeam1Winner ? selectedMatch.team1 : selectedMatch.team2;
    const losingTeam = isTeam1Winner ? selectedMatch.team2 : selectedMatch.team1;

    if (winningTeam && losingTeam) {
      // Group all entries by user for proper commission calculation (especially entrywise)
      const allUserGroups = new Map<number | string, Entry[]>();
      allEntries.forEach((entry) => {
        const key = entry.user_id || entry.customer;
        if (!allUserGroups.has(key)) {
          allUserGroups.set(key, []);
        }
        allUserGroups.get(key)!.push(entry);
      });

      // Calculate totals from all user groups
      let losingTeamTotalBet = 0;
      let losingTeamProfitLoss = 0;
      let losingTeamCommission = 0;
      let losingTeamCustNetWithComm = 0;
      let losingTeamNetProfitLoss = 0;

      let winningTeamTotalBet = 0;
      let winningTeamProfitLoss = 0;
      let winningTeamCommission = 0;
      let winningTeamCustNetWithComm = 0;
      let winningTeamNetProfitLoss = 0;

      // Use user maps for O(1) lookups (performance improvement)
      const userMapById = new Map(users.map((u) => [u.id, u]));
      const userMapByName = new Map(users.map((u) => [u.name, u]));

      // Process each user group to calculate totals
      allUserGroups.forEach((userEntries, userKey) => {
        // Find user (O(1) lookup)
        let user = null;
        if (typeof userKey === 'number') {
          user = userMapById.get(userKey) || null;
        } else {
          user = userMapByName.get(userKey) || null;
        }

        // Calculate user totals
        let userTotalBet = 0;
        let userProfitLoss = 0;
        let userCommission = 0;
        let userCustNetWithComm = 0;
        let userNetProfitLoss = 0;

        // Calculate profit/loss for all entries of this user
        let winningTeamFav = 0;
        let winningTeamNonFav = 0;
        let losingTeamFav = 0;
        let losingTeamNonFav = 0;

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

          userTotalBet += team1Amount + team2Amount;

          if (isTeam1Winner) {
            if (favouriteTeam === 'team1') {
              winningTeamFav += (team1Rate / 100) * team1FavAmount;
              losingTeamNonFav += (team2Rate / 100) * team2NfavAmount;
            } else if (favouriteTeam === 'team2') {
              winningTeamNonFav += team1NfavAmount;
              losingTeamFav += team2FavAmount;
            }
          } else if (isTeam2Winner) {
            if (favouriteTeam === 'team2') {
              winningTeamFav += (team2Rate / 100) * team2FavAmount;
              losingTeamNonFav += (team1Rate / 100) * team1NfavAmount;
            } else if (favouriteTeam === 'team1') {
              winningTeamNonFav += team2NfavAmount;
              losingTeamFav += team1FavAmount;
            }
          }
        });

        // Net profit/loss = What we RECEIVE - What we PAY OUT = Losing Team Total - Winning Team Total
        userProfitLoss = (losingTeamFav + losingTeamNonFav) - (winningTeamFav + winningTeamNonFav);

        // Calculate commission and partnership using utility function
        if (user) {
          if (user.commission_type === 'entrywise') {
            // For entrywise, calculate profit/loss per entry, then commission on total loss
            let totalProfit = 0;
            let totalLoss = 0;

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

              let entryProfitLoss = 0;

              if (isTeam1Winner) {
                let team1Win = 0;
                let team2Loss = 0;
                if (favouriteTeam === 'team1') {
                  team1Win = (team1Rate / 100) * team1FavAmount;
                  team2Loss = (team2Rate / 100) * team2NfavAmount;
                } else if (favouriteTeam === 'team2') {
                  team1Win = team1NfavAmount;
                  team2Loss = team2FavAmount;
                }
                entryProfitLoss = team1Win - team2Loss;
              } else if (isTeam2Winner) {
                let team2Win = 0;
                let team1Loss = 0;
                if (favouriteTeam === 'team2') {
                  team2Win = (team2Rate / 100) * team2FavAmount;
                  team1Loss = (team1Rate / 100) * team1NfavAmount;
                } else if (favouriteTeam === 'team1') {
                  team2Win = team2NfavAmount;
                  team1Loss = team1FavAmount;
                }
                entryProfitLoss = team2Win - team1Loss;
              }

              if (entryProfitLoss >= 0) {
                totalProfit += entryProfitLoss;
              } else {
                totalLoss += entryProfitLoss; // negative
              }
            });

            // Use entrywise commission calculator
            const entrywiseResult = calculateEntrywiseCommission({
              totalProfit,
              totalLoss,
              commissionPercent: Number(user.commission) || 0,
              partnershipPercent: Number(user.partnership) || 0,
            });

            userCommission = entrywiseResult.totalCommissionAfterPartnership;
            userCustNetWithComm = entrywiseResult.partnershipAmount;
            userNetProfitLoss = entrywiseResult.netProfitLoss;
          } else {
            // Use standard commission calculator for no_commission and profit_loss
            const commissionResult = calculateFinalNetProfit({
              profitLoss: userProfitLoss,
              commissionPercent: Number(user.commission) || 0,
              partnershipPercent: Number(user.partnership) || 0,
              commissionType: user.commission_type,
            });

            userCommission = commissionResult.totalCommissionAfterPartnership;
            userCustNetWithComm = commissionResult.partnershipAmount;
            userNetProfitLoss = commissionResult.netProfitLoss;
          }
        } else {
          // No user found - no commission/partnership
          userCustNetWithComm = userProfitLoss;
          userNetProfitLoss = userProfitLoss;
        }

        // Add to appropriate team totals based on profit/loss sign
        if (userProfitLoss <= 0) {
          losingTeamTotalBet += userTotalBet;
          losingTeamProfitLoss += userProfitLoss;
          losingTeamCommission += userCommission;
          losingTeamCustNetWithComm += userCustNetWithComm;
          losingTeamNetProfitLoss += userNetProfitLoss;
        } else {
          winningTeamTotalBet += userTotalBet;
          winningTeamProfitLoss += userProfitLoss;
          winningTeamCommission += userCommission;
          winningTeamCustNetWithComm += userCustNetWithComm;
          winningTeamNetProfitLoss += userNetProfitLoss;
        }
      });

      // Add winning team total row first (immediately after individual entries, no gap)
      rows.push({
        srNo: 'Total',
        custName: '',
        totalBet: winningTeamTotalBet,
        profitLoss: winningTeamProfitLoss,
        totalCommission: winningTeamCommission,
        commissionPercent: 0,
        partnership: winningTeam.name,
        custNetWithComm: winningTeamCustNetWithComm,
        netProfitLoss: winningTeamNetProfitLoss,
        isTotal: true,
        teamName: winningTeam.name,
      });

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
        totalBet: losingTeamTotalBet,
        profitLoss: losingTeamProfitLoss,
        totalCommission: losingTeamCommission,
        commissionPercent: 0,
        partnership: losingTeam.name,
        custNetWithComm: losingTeamCustNetWithComm,
        netProfitLoss: losingTeamNetProfitLoss,
        isTotal: true,
        teamName: losingTeam.name,
      });
    }

    console.log('Calculated match summary rows from entries:', rows.length);
    return rows;
  }, [entries, users, matches, formData, reportGenerated, isLoadingEntries, calculateMatchFinalNetProfit]);

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

  // Transform users into dropdown options
  const userOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Users' }];
    if (isLoadingUsers) {
      options.push({ value: 'loading', label: 'Loading users...' });
    } else if (users.length > 0) {
      users.forEach((user) => {
        options.push({
          value: String(user.id),
          label: user.name,
        });
      });
    }
    return options;
  }, [users, isLoadingUsers]);

  // Report type options
  const reportTypeOptions = [
    { value: '', label: 'Select Type' },
    { value: 'match', label: 'Match' },
    { value: 'session', label: 'Session' },
  ];

  // Reset selectMatch and winningTeam when date changes
  useEffect(() => {
    if (formData.matchDate && isValidDate) {
      setFormData((prev) => ({
        ...prev,
        selectMatch: '',
        winningTeam: '',
      }));
      setReportGenerated(false);
    }
  }, [formData.matchDate, isValidDate]);

  // Reset report when report type changes
  useEffect(() => {
    setReportGenerated(false);
  }, [formData.reportType]);

  // Reset winningTeam when match changes
  useEffect(() => {
    if (formData.selectMatch) {
      setFormData((prev) => ({
        ...prev,
        winningTeam: '',
      }));
    }
  }, [formData.selectMatch]);

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
    setFormData((prev) => ({ ...prev, matchDate: date, selectMatch: '', winningTeam: '' }));
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

  const handleGenerateReport = () => {
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
    if (!formData.winningTeam) {
      newErrors.winningTeam = 'Winning Team is required';
    }
    if (!formData.selectUser) {
      newErrors.selectUser = 'Select User is required';
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
    setReportGenerated(true);
    toast.success('Report generated successfully!', { duration: 3000 });

    // Handle generate report logic here (in future, will use TanStack Query)
    console.log('Report data:', formData);
  };

  const handlePrint = () => {
    toast.success('Printing report...', { duration: 2000 });
    // Handle print logic here
    window.print();
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
  }

  // Use calculated data when report is generated, otherwise use empty array
  const matchSummaryData = useMemo(() => {
    console.log('matchSummaryData calculation:', {
      reportType: formData.reportType,
      calculatedDataLength: calculatedMatchSummaryData.length,
      calculatedData: calculatedMatchSummaryData,
    });
    if (formData.reportType === 'match' && calculatedMatchSummaryData.length > 0) {
      return calculatedMatchSummaryData;
    }
    return [];
  }, [calculatedMatchSummaryData, formData.reportType]);

  // Legacy sample data - kept for reference but not used when report is generated
  const [legacySampleData] = useState<MatchSummaryRow[]>([
    {
      srNo: 1337,
      custName: '7',
      totalBet: 950000,
      profitLoss: 521000,
      totalCommission: 15630,
      commissionPercent: 5,
      partnership: 40,
      custNetWithComm: 224030,
      netProfitLoss: 296970,
    },
    {
      srNo: 1312,
      custName: '20',
      totalBet: 2300000,
      profitLoss: 1373000,
      totalCommission: 48055,
      commissionPercent: 5,
      partnership: 30,
      custNetWithComm: 459955,
      netProfitLoss: 913045,
    },
    {
      srNo: 1259,
      custName: '23',
      totalBet: 1390000,
      profitLoss: 2250,
      totalCommission: 45,
      commissionPercent: 5,
      partnership: 60,
      custNetWithComm: 1395,
      netProfitLoss: 855,
    },
    {
      srNo: 1271,
      custName: 'JK',
      totalBet: 7850000,
      profitLoss: 220500,
      totalCommission: 0,
      commissionPercent: 0,
      partnership: 0,
      custNetWithComm: 0,
      netProfitLoss: 220500,
    },
    {
      srNo: 1257,
      custName: '15',
      totalBet: 7910000,
      profitLoss: -1701400,
      totalCommission: 0,
      commissionPercent: 5,
      partnership: 0,
      custNetWithComm: 0,
      netProfitLoss: -1701400,
    },
    {
      srNo: 1256,
      custName: '14',
      totalBet: 535000,
      profitLoss: 65700,
      totalCommission: 2628,
      commissionPercent: 5,
      partnership: 20,
      custNetWithComm: 15768,
      netProfitLoss: 49932,
    },
    {
      srNo: 1267,
      custName: '00',
      totalBet: 550000,
      profitLoss: -30900,
      totalCommission: 0,
      commissionPercent: 5,
      partnership: 20,
      custNetWithComm: -6180,
      netProfitLoss: -24720,
    },
    {
      srNo: 1291,
      custName: 'PZ',
      totalBet: 225000,
      profitLoss: -22750,
      totalCommission: 0,
      commissionPercent: 5,
      partnership: 0,
      custNetWithComm: 0,
      netProfitLoss: -22750,
    },
    {
      srNo: 1258,
      custName: '17',
      totalBet: 350000,
      profitLoss: 1600,
      totalCommission: 60,
      commissionPercent: 5,
      partnership: 25,
      custNetWithComm: 460,
      netProfitLoss: 1140,
    },
    {
      srNo: 1340,
      custName: 'amil',
      totalBet: 25000,
      profitLoss: -20700,
      totalCommission: 0,
      commissionPercent: 5,
      partnership: 20,
      custNetWithComm: -4140,
      netProfitLoss: -16560,
    },
    {
      srNo: 1255,
      custName: '12',
      totalBet: 40000,
      profitLoss: 31200,
      totalCommission: 780,
      commissionPercent: 5,
      partnership: 50,
      custNetWithComm: 16380,
      netProfitLoss: 14820,
    },
    {
      srNo: 1338,
      custName: '27',
      totalBet: 3225000,
      profitLoss: 187500,
      totalCommission: 3281.25,
      commissionPercent: 5,
      partnership: 65,
      custNetWithComm: 125156.25,
      netProfitLoss: 62343.75,
    },
    {
      srNo: 1282,
      custName: 'BABLU',
      totalBet: 300000,
      profitLoss: 165000,
      totalCommission: 8250,
      commissionPercent: 5,
      partnership: 0,
      custNetWithComm: 8250,
      netProfitLoss: 156750,
    },
    {
      srNo: 1322,
      custName: 'JACK',
      totalBet: 500000,
      profitLoss: -8750,
      totalCommission: 0,
      commissionPercent: 0,
      partnership: 0,
      custNetWithComm: 0,
      netProfitLoss: -8750,
    },
    // Empty row separator
    {
      srNo: '',
      custName: '',
      totalBet: 0,
      profitLoss: 0,
      totalCommission: 0,
      commissionPercent: 0,
      partnership: '',
      custNetWithComm: 0,
      netProfitLoss: 0,
    },
    // Total Row 1 - Melbourne Star
    {
      srNo: 'Total',
      custName: '',
      totalBet: 26150000,
      profitLoss: 783250,
      totalCommission: 78729.25,
      commissionPercent: 0,
      partnership: 'Melbourne Star',
      custNetWithComm: 762345,
      netProfitLoss: -57824.25,
      isTotal: true,
      teamName: 'Melbourne Star',
    },
    // Empty row separator
    {
      srNo: '',
      custName: '',
      totalBet: 0,
      profitLoss: 0,
      totalCommission: 0,
      commissionPercent: 0,
      partnership: '',
      custNetWithComm: 0,
      netProfitLoss: 0,
    },
    // Total Row 2 - Melbourne Renegades
    {
      srNo: 'Total',
      custName: '',
      totalBet: 26150000,
      profitLoss: -4262500,
      totalCommission: 7120,
      commissionPercent: 0,
      partnership: 'Melbourne Renegades',
      custNetWithComm: -3408030,
      netProfitLoss: -854470,
      isTotal: true,
      teamName: 'Melbourne Renegades',
    },
  ]);

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  // Session table columns configuration
  const sessionColumns: Column<Session>[] = [
    {
      key: 'id',
      label: 'Sr No',
      sortable: true,
      render: (value) => <span>{value}</span>,
    },
    {
      key: 'user_name',
      label: 'User Name',
      sortable: true,
      render: (value) => <span>{value || '-'}</span>,
    },
    {
      key: 'group_name',
      label: 'Group',
      sortable: true,
      render: (value) => <span>{value || '-'}</span>,
    },
    {
      key: 'inning_over',
      label: 'Inning/Over',
      sortable: true,
      render: (value) => <span>{value}</span>,
    },
    {
      key: 'entry_run',
      label: 'Entry Run',
      sortable: true,
      render: (value) => <span>{value}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (value) => <span>{formatNumber(value)}</span>,
    },
    {
      key: 'is_yes',
      label: 'Type',
      sortable: true,
      render: (value) => <span>{value ? 'Yes' : 'No'}</span>,
    },
    {
      key: 'result',
      label: 'Result',
      sortable: true,
      render: (value) => <span>{value !== null ? value : '-'}</span>,
    },
    {
      key: 'net_profit_loss',
      label: 'Net Profit/Loss',
      sortable: true,
      render: (value) => {
        const isPositive = value >= 0;
        const bgColor = isPositive ? 'bg-green-100' : 'bg-red-100';
        return (
          <div className={`-m-3 p-3 ${bgColor} font-bold`}>
            {formatNumber(value)}
          </div>
        );
      },
    },
  ];

  // DataTable columns configuration for Match Summary
  const columns: Column<MatchSummaryRow>[] = [
    {
      key: 'srNo',
      label: 'Sr No',
      sortable: true,
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
      sortable: true,
      render: (value, row) => {
        const getCommissionTypeBadge = (type?: string) => {
          if (type === 'profit_loss') return { text: 'PL', color: 'bg-blue-200 text-blue-800' };
          if (type === 'no_commission') return { text: 'NC', color: 'bg-green-200 text-green-800' };
          if (type === 'entrywise') return { text: 'En.w', color: 'bg-purple-200 text-purple-800' };
          return null;
        };
        const commissionTypeBadge = getCommissionTypeBadge(row.commissionType);
        
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        return (
          <div className={`${row.isTotal ? 'font-bold' : ''} relative -m-3 p-3`}>
            {isEmptyRow ? '-' : (value || '')}
            {commissionTypeBadge && !row.isTotal && !isEmptyRow && (
              <span className={`absolute top-1 right-1 text-[10px] font-semibold px-1 py-0.5 rounded ${commissionTypeBadge.color}`}>
                {commissionTypeBadge.text}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'totalBet',
      label: 'Total Bet',
      sortable: true,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        // Only show background if there's a value or it's a total row
        const hasValue = value > 0;
        const bgColor = (row.isTotal && hasValue) ? 'bg-green-100' : '';
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : ''}`}>
            {isEmptyRow ? '-' : (hasValue ? formatNumber(value) : '')}
          </div>
        );
      },
    },
    {
      key: 'profitLoss',
      label: 'Profit/Loss(+/-)',
      sortable: true,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        // Only show background if there's a value or it's a total row with value
        const hasValue = value !== 0;
        const bgColor = (row.isTotal && hasValue) ? 'bg-green-100' : '';
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : ''}`}>
            {isEmptyRow ? '-' : (hasValue ? formatNumber(value) : '')}
          </div>
        );
      },
    },
    {
      key: 'totalCommission',
      label: 'Total Commisson',
      sortable: true,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        // Only show background for total rows, not for individual rows
        const bgColor = isEmptyRow
          ? ''
          : row.isTotal 
            ? 'bg-green-100'
            : '';
        const commissionPercent = Number(row.commissionPercent) || 0;
        const formattedPercent = commissionPercent.toFixed(2);
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : ''}`}>
            {isEmptyRow 
              ? '-'
              : value > 0 
                ? `${formatNumber(value)} (${formattedPercent}%)` 
                : value === 0 && row.isTotal
                  ? `0 (${formattedPercent}%)` 
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
      sortable: true,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        // For total rows with team name (string), use blue background. For individual rows, no background
        const hasValue = value && (typeof value === 'string' ? value.trim() !== '' : true);
        const bgColor = (row.isTotal && hasValue && typeof value === 'string') 
          ? 'bg-blue-100' 
          : '';
        // For total rows, show team name (string), for individual rows show percentage with 2 decimals
        // For empty rows, show dash
        const displayValue = isEmptyRow
          ? '-'
          : row.isTotal 
            ? value 
            : (typeof value === 'number' ? value.toFixed(2) : value);
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : ''}`}>
            {displayValue || ''}
          </div>
        );
      },
    },
    {
      key: 'custNetWithComm',
      label: 'Cust net with comm',
      sortable: true,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        const isPositive = value >= 0;
        // For total rows, always show background (even if 0). For individual rows, only if value is not 0
        const bgColor = isEmptyRow
          ? ''
          : row.isTotal 
            ? 'bg-green-100'
            : (value !== 0 ? (isPositive ? 'bg-green-100' : 'bg-red-100') : '');
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : 'font-bold'}`}>
            {isEmptyRow ? '-' : (value !== 0 ? formatNumber(value) : '0')}
          </div>
        );
      },
    },
    {
      key: 'netProfitLoss',
      label: 'Net Profit/Loss',
      sortable: true,
      render: (value, row) => {
        // Check if this is an empty separator row
        const isEmptyRow = !row.srNo && !row.custName && !row.isTotal;
        const isPositive = value >= 0;
        // For total rows, always show background (even if 0). For individual rows, only if value is not 0
        const bgColor = isEmptyRow
          ? ''
          : row.isTotal 
            ? 'bg-green-100'
            : (value !== 0 ? (isPositive ? 'bg-green-100' : 'bg-red-100') : '');
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : 'font-bold'}`}>
            {isEmptyRow ? '-' : (value !== 0 ? formatNumber(value) : '0')}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">BUSINESS REPORT</h1>
      </div>
      <Card>
        <form className="space-y-6">
          {/* Single Row - Report Type, Match Date, Select Match, WinningTeam, Select User */}
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
                  className={`w-full px-4 py-3 bg-white border-[3px] ${
                    errors.matchDate ? 'border-red-500' : 'border-retro-dark'
                  } text-retro-dark font-bold text-lg rounded focus:outline-none focus:ring-2 focus:ring-retro-accent disabled:opacity-50 disabled:cursor-not-allowed`}
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

            {/* WinningTeam Field */}
            <div className="md:col-span-3">
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

            {/* Select User Field */}
            <div className="md:col-span-3">
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
            </div>
          </div>

          {/* Action Buttons - Left Aligned */}
          <div className="flex justify-start gap-4">
            <button
              type="button"
              onClick={handleGenerateReport}
              className="px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity"
            >
              Generate Report
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-3 bg-red-500 text-white font-bold text-lg rounded hover:opacity-90 transition-opacity"
            >
              Print
            </button>
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
                    title="MATCH SUMMARY"
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
                {isLoadingSessions ? (
                  <div className="py-8 text-center">
                    <p className="text-lg text-retro-dark">Loading session data...</p>
                  </div>
                ) : sessions.length > 0 ? (
                  <DataTable
                    title="SESSION SUMMARY"
                    data={sessions}
                    columns={sessionColumns}
                    entriesPerPageOptions={[10, 25, 50, 100]}
                    defaultEntriesPerPage={100}
                    showEntries={true}
                    showExport={true}
                    showSearch={true}
                  />
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-lg text-retro-dark">No session data found for the selected match.</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

