'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Select from '@/app/components/ui/Select';
import DatePicker from '@/app/components/ui/DatePicker';
import DataTable, { Column } from '@/app/components/ui/DataTable';

// Sample match options - in future, this will come from API
const matchOptions = [
  { value: '', label: 'Select Match' },
  { value: 'match1', label: 'Melbourne Star vs Melbourne Renegades' },
  { value: 'match2', label: 'Mumbai vs Delhi' },
  { value: 'match3', label: 'Brisbane Heat vs Sydney Thunder' },
  { value: 'match4', label: 'Pakistan vs Sri Lanka' },
  { value: 'match5', label: 'India vs Australia' },
];

// Sample winning team options - in future, this will come from API
const winningTeamOptions = [
  { value: '', label: 'Select Winning Team' },
  { value: 'melbourne-star', label: 'Melbourne Star' },
  { value: 'melbourne-renegades', label: 'Melbourne Renegades' },
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'delhi', label: 'Delhi' },
  { value: 'brisbane-heat', label: 'Brisbane Heat' },
  { value: 'sydney-thunder', label: 'Sydney Thunder' },
];

// Sample user options - in future, this will come from API
const userOptions = [
  { value: 'all', label: 'All Users' },
  { value: 'user1', label: 'User 1' },
  { value: 'user2', label: 'User 2' },
  { value: 'user3', label: 'User 3' },
  { value: 'user4', label: 'User 4' },
];

export default function BusinessReportPage() {
  const [formData, setFormData] = useState({
    matchDate: '10-01-2026',
    selectMatch: 'match1',
    winningTeam: 'melbourne-star',
    selectUser: 'all',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, matchDate: date }));
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

  // Sample data - In future, this will come from React TanStack Query
  const [matchSummaryData, setMatchSummaryData] = useState<MatchSummaryRow[]>([
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

  // DataTable columns configuration
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
        return (
          <div className={`-m-3 p-3 ${bgColor} ${row.isTotal ? 'font-bold' : ''}`}>
            {value > 0 ? `${formatNumber(value)} (${row.commissionPercent}%)` : value === 0 ? '0 (0%)' : ''}
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
      render: (value, row) => {
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
      render: (value, row) => {
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
        <h1 className="text-3xl font-bold text-[var(--foreground)]">BUSINESS REPORT</h1>
      </div>
      <Card>
        <form className="space-y-6">
          {/* Single Row - Match Date, Select Match, WinningTeam, Select User */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Match Date Field */}
            <div className="md:col-span-3 space-y-2">
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
            <div className="md:col-span-3">
              <Select
                label="Select Match*"
                id="select-match"
                value={formData.selectMatch}
                onChange={(e) => handleInputChange('selectMatch', e.target.value)}
                options={matchOptions}
                error={errors.selectMatch}
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
              />
            </div>

            {/* Select User Field */}
            <div className="md:col-span-3">
              <Select
                label="Select User*"
                id="select-user"
                value={formData.selectUser}
                onChange={(e) => handleInputChange('selectUser', e.target.value)}
                options={userOptions}
                error={errors.selectUser}
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

      {/* MATCH SUMMARY Table */}
      <Card>
        <div className="p-4">
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
        </div>
      </Card>
    </div>
  );
}

