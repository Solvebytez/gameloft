'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Select from '@/app/components/ui/Select';
import DatePicker from '@/app/components/ui/DatePicker';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import { useMatchesByDate, Match } from '@/app/hooks/useMatches';
import { useUsers } from '@/app/hooks/useUsers';
import { useSessions, Session } from '@/app/hooks/useSessions';
import { useEntries, Entry } from '@/app/hooks/useEntries';

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

    // Process each user
    userGroups.forEach((userEntries, userKey) => {
      // Find user by id or by customer name
      let user = null;
      if (typeof userKey === 'number') {
        user = users.find((u) => u.id === userKey);
      } else {
        // Try to find user by name
        user = users.find((u) => u.name === userKey);
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
        const team1Amount = Number(entry.team1_amount) || 0;
        const team1Rate = Number(entry.team1_rate) || 0;
        const team2Amount = Number(entry.team2_amount) || 0;
        const team2Rate = Number(entry.team2_rate) || 0;
        const favouriteTeam = entry.favourite_team;

        // Total bet is sum of all amounts
        totalBet += team1Amount + team2Amount;

        // Calculate profit/loss based on winning team and favorite/non-favorite
        if (isTeam1Winner) {
          // Team 1 Win + Favorite entries (favourite_team === 'team1')
          if (favouriteTeam === 'team1') {
            // Calculate: (rate / 100) × amount, then sum
            winningTeamFav += (team1Rate / 100) * team1Amount;
          }
          
          // Team 1 Win + Non-Favorite entries (favourite_team === 'team2', but bet on Team1)
          if (favouriteTeam === 'team2') {
            // Sum all amounts (no rate multiplication)
            winningTeamNonFav += team1Amount;
          }
          
          // Team 2 Loss + Favorite entries (favourite_team === 'team2')
          if (favouriteTeam === 'team2') {
            // Sum all amounts (no rate multiplication)
            losingTeamFav += team2Amount;
          }
          
          // Team 2 Loss + Non-Favorite entries (favourite_team === 'team1', but bet on Team2)
          if (favouriteTeam === 'team1') {
            // Calculate: (rate / 100) × amount, then sum
            losingTeamNonFav += (team2Rate / 100) * team2Amount;
          }
        } else if (isTeam2Winner) {
          // Team 2 Win + Favorite entries (favourite_team === 'team2')
          if (favouriteTeam === 'team2') {
            // Calculate: (rate / 100) × amount, then sum
            winningTeamFav += (team2Rate / 100) * team2Amount;
          }
          
          // Team 2 Win + Non-Favorite entries (favourite_team === 'team1', but bet on Team2)
          if (favouriteTeam === 'team1') {
            // Sum all amounts (no rate multiplication)
            winningTeamNonFav += team2Amount;
          }
          
          // Team 1 Loss + Favorite entries (favourite_team === 'team1')
          if (favouriteTeam === 'team1') {
            // Sum all amounts (no rate multiplication)
            losingTeamFav += team1Amount;
          }
          
          // Team 1 Loss + Non-Favorite entries (favourite_team === 'team2', but bet on Team1)
          if (favouriteTeam === 'team2') {
            // Calculate: (rate / 100) × amount, then sum
            losingTeamNonFav += (team1Rate / 100) * team1Amount;
          }
        }
      });

      // Calculate totals
      const winningTeamTotal = winningTeamFav + winningTeamNonFav;
      const losingTeamTotal = losingTeamFav + losingTeamNonFav;
      
      // Net profit/loss = Winning Team Total - Losing Team Total
      profitLoss = winningTeamTotal - losingTeamTotal;

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
        });
        return;
      }

      // Calculate commission based on commission_type
      // Reference formula:
      // Partnership Amount = Profit/Loss × (Partnership / 100)
      // Cust Net With Comm = Partnership Amount + Total Commission
      // Net Profit/Loss = Profit/Loss - Partnership Amount - Total Commission
      
      let totalCommission = 0;
      let commissionPercent = user.commission || 0;
      let custNetWithComm = 0;
      let netProfitLoss = 0;
      const partnership = Number(user.partnership) || 0;

      if (user.commission_type === 'no_commission') {
        // No commission, only partnership
        const partnershipAmount = profitLoss * (partnership / 100);
        totalCommission = 0;
        custNetWithComm = partnershipAmount + totalCommission;
        netProfitLoss = profitLoss - partnershipAmount - totalCommission;
      } else if (user.commission_type === 'profit_loss') {
        // Commission on losses only
        const commission = Number(user.commission) || 0;
        
        if (profitLoss < 0) {
          // Loss: calculate commission on loss
          totalCommission = Math.abs(profitLoss) * (commission / 100);
        } else {
          // Profit: no commission
          totalCommission = 0;
        }
        
        // Calculate partnership amount and final values
        const partnershipAmount = profitLoss * (partnership / 100);
        custNetWithComm = partnershipAmount + totalCommission;
        netProfitLoss = profitLoss - partnershipAmount - totalCommission;
      } else if (user.commission_type === 'entrywise') {
        // Entrywise: commission only on loss amount
        const partnership = Number(user.partnership) || 0;
        const commission = Number(user.commission) || 0;
        
        // Calculate profit/loss for each entry using favorite/non-favorite logic
        let totalProfit = 0;
        let totalLoss = 0;
        
        userEntries.forEach((entry) => {
          const team1Amount = Number(entry.team1_amount) || 0;
          const team1Rate = Number(entry.team1_rate) || 0;
          const team2Amount = Number(entry.team2_amount) || 0;
          const team2Rate = Number(entry.team2_rate) || 0;
          const favouriteTeam = entry.favourite_team;
          
          let entryProfitLoss = 0;
          
          if (isTeam1Winner) {
            // Calculate based on favorite/non-favorite logic
            let team1Win = 0;
            let team2Loss = 0;
            
            if (favouriteTeam === 'team1') {
              // Team 1 Win + Fav: (rate / 100) × amount
              team1Win = (team1Rate / 100) * team1Amount;
              // Team 2 Loss + Non-Fav: (rate / 100) × amount
              team2Loss = (team2Rate / 100) * team2Amount;
            } else if (favouriteTeam === 'team2') {
              // Team 1 Win + Non-Fav: just amount
              team1Win = team1Amount;
              // Team 2 Loss + Fav: just amount
              team2Loss = team2Amount;
            }
            
            entryProfitLoss = team1Win - team2Loss;
          } else if (isTeam2Winner) {
            // Calculate based on favorite/non-favorite logic
            let team2Win = 0;
            let team1Loss = 0;
            
            if (favouriteTeam === 'team2') {
              // Team 2 Win + Fav: (rate / 100) × amount
              team2Win = (team2Rate / 100) * team2Amount;
              // Team 1 Loss + Non-Fav: (rate / 100) × amount
              team1Loss = (team1Rate / 100) * team1Amount;
            } else if (favouriteTeam === 'team1') {
              // Team 2 Win + Non-Fav: just amount
              team2Win = team2Amount;
              // Team 1 Loss + Fav: just amount
              team1Loss = team1Amount;
            }
            
            entryProfitLoss = team2Win - team1Loss;
          }

          if (entryProfitLoss >= 0) {
            totalProfit += entryProfitLoss;
          } else {
            totalLoss += entryProfitLoss; // negative
          }
        });
        
        // Apply commission only on loss
        const lossCommission = Math.abs(totalLoss) * (commission / 100);
        const netAfterLossCommission = totalProfit + totalLoss + lossCommission;
        
        // Apply partnership
        const partnershipShare = netAfterLossCommission * (partnership / 100);
        totalCommission = lossCommission;
        custNetWithComm = netAfterLossCommission - partnershipShare;
        netProfitLoss = netAfterLossCommission - partnershipShare;
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
      });
    });

    // Sort by user name
    rows.sort((a, b) => a.custName.localeCompare(b.custName));

    // Update srNo to sequential numbers
    rows.forEach((row, index) => {
      row.srNo = index + 1;
    });

    // Calculate team totals - need both losing team and winning team totals
    const winningTeam = isTeam1Winner ? selectedMatch.team1 : selectedMatch.team2;
    const losingTeam = isTeam1Winner ? selectedMatch.team2 : selectedMatch.team1;

    if (winningTeam && losingTeam) {
      // Filter rows to get only user entries (exclude totals and separators)
      const userRows = rows.filter(r => r.srNo !== '' && typeof r.srNo === 'number');

      // Calculate losing team totals (negative profit/loss values or zero)
      const losingTeamRows = userRows.filter(r => r.profitLoss <= 0);
      const losingTeamTotalBet = losingTeamRows.reduce((sum, r) => sum + r.totalBet, 0);
      const losingTeamProfitLoss = losingTeamRows.reduce((sum, r) => sum + r.profitLoss, 0);
      const losingTeamCommission = losingTeamRows.reduce((sum, r) => sum + r.totalCommission, 0);
      const losingTeamCustNetWithComm = losingTeamRows.reduce((sum, r) => sum + r.custNetWithComm, 0);
      const losingTeamNetProfitLoss = losingTeamRows.reduce((sum, r) => sum + r.netProfitLoss, 0);

      // Calculate winning team totals (positive profit/loss values)
      const winningTeamRows = userRows.filter(r => r.profitLoss > 0);
      const winningTeamTotalBet = winningTeamRows.reduce((sum, r) => sum + r.totalBet, 0);
      const winningTeamProfitLoss = winningTeamRows.reduce((sum, r) => sum + r.profitLoss, 0);
      const winningTeamCommission = winningTeamRows.reduce((sum, r) => sum + r.totalCommission, 0);
      const winningTeamCustNetWithComm = winningTeamRows.reduce((sum, r) => sum + r.custNetWithComm, 0);
      const winningTeamNetProfitLoss = winningTeamRows.reduce((sum, r) => sum + r.netProfitLoss, 0);

      // Add winning team total row first (always show, even if values are 0)
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

      // Add empty separator
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
      render: (value, row) => (
        <span className={row.isTotal ? 'font-bold' : ''}>{value}</span>
      ),
    },
    {
      key: 'custName',
      label: 'Cust Name',
      sortable: true,
      render: (value, row) => (
        <span className={row.isTotal ? 'font-bold' : ''}>{value || ''}</span>
      ),
    },
    {
      key: 'totalBet',
      label: 'Total Bet',
      sortable: true,
      render: (value, row) => {
        const bgColor = row.isTotal && value > 0 ? 'bg-green-100' : '';
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : ''}`}>
            {value > 0 ? formatNumber(value) : ''}
          </div>
        );
      },
    },
    {
      key: 'profitLoss',
      label: 'Profit/Loss(+/-)',
      sortable: true,
      render: (value, row) => {
        const bgColor = row.isTotal && value > 0 ? 'bg-green-100' : '';
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : ''}`}>
            {value !== 0 ? formatNumber(value) : ''}
          </div>
        );
      },
    },
    {
      key: 'totalCommission',
      label: 'Total Commisson',
      sortable: true,
      render: (value, row) => {
        const bgColor = row.isTotal ? 'bg-blue-100' : '';
        const commissionPercent = Number(row.commissionPercent) || 0;
        const formattedPercent = commissionPercent.toFixed(2);
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : ''}`}>
            {value > 0 ? `${formatNumber(value)} (${formattedPercent}%)` : value === 0 ? `0 (${formattedPercent}%)` : ''}
          </div>
        );
      },
    },
    {
      key: 'partnership',
      label: 'Partnership',
      sortable: true,
      render: (value, row) => {
        const bgColor = row.isTotal ? 'bg-blue-100' : '';
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : ''}`}>
            {typeof value === 'number' ? value : value}
          </div>
        );
      },
    },
    {
      key: 'custNetWithComm',
      label: 'Cust net with comm',
      sortable: true,
      render: (value) => {
        const isPositive = value >= 0;
        const bgColor = isPositive ? 'bg-green-100' : value < 0 ? 'bg-red-100' : '';
        return (
          <div className={`-m-3 p-3 ${bgColor} font-bold`}>
            {value !== 0 ? formatNumber(value) : '0'}
          </div>
        );
      },
    },
    {
      key: 'netProfitLoss',
      label: 'Net Profit/Loss',
      sortable: true,
      render: (value) => {
        const isPositive = value >= 0;
        const bgColor = isPositive ? 'bg-green-100' : value < 0 ? 'bg-red-100' : '';
        return (
          <div className={`-m-3 p-3 ${bgColor} font-bold`}>
            {value !== 0 ? formatNumber(value) : '0'}
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

