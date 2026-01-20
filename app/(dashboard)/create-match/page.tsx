'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Select from '@/app/components/ui/Select';
import DatePicker from '@/app/components/ui/DatePicker';
import DataTable, { Column } from '@/app/components/ui/DataTable';

// Sample team options - in future, this will come from API
const teamOptions = [
  { value: '', label: 'Select Team' },
  { value: 'team1', label: 'Team Alpha' },
  { value: 'team2', label: 'Team Beta' },
  { value: 'team3', label: 'Team Gamma' },
  { value: 'team4', label: 'Team Delta' },
  { value: 'team5', label: 'Team Echo' },
];

interface Match {
  id: string;
  matchBetween: string;
  date: string;
  winner: string;
  status: string;
}

export default function CreateMatchPage() {
  const [formData, setFormData] = useState({
    matchDate: '',
    team1: '',
    team2: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Sample match data - In future, this will come from React TanStack Query
  const [matches, setMatches] = useState<Match[]>([
    {
      id: '1',
      matchBetween: 'Mumbai Vs Delhi',
      date: '2026-01-10',
      winner: 'Not Declared',
      status: 'Yet To Start',
    },
    {
      id: '2',
      matchBetween: 'Melbourne Star Vs Melbourne Renegades',
      date: '2026-01-10',
      winner: 'Not Declared',
      status: 'Yet To Start',
    },
    {
      id: '3',
      matchBetween: 'Brisbane Heat Vs Sydney Thunder',
      date: '2026-01-10',
      winner: 'Not Declared',
      status: 'Yet To Start',
    },
    {
      id: '4',
      matchBetween: 'Durban Vs Sunrisers',
      date: '2026-01-09',
      winner: 'Not Declared',
      status: 'Yet To Start',
    },
    {
      id: '5',
      matchBetween: 'Pakistan Vs Sri Lanka',
      date: '2026-01-09',
      winner: 'Not Declared',
      status: 'Yet To Start',
    },
    {
      id: '6',
      matchBetween: 'Hobart Hurricanes Vs Adelaide Strikers',
      date: '2026-01-09',
      winner: 'Hobart Hurricanes',
      status: 'Not Declared',
    },
    {
      id: '7',
      matchBetween: 'Joburg Super King Vs Paarl Royals',
      date: '2026-01-08',
      winner: 'India',
      status: 'completed',
    },
  ]);

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
    // Validate dd-mm-yyyy format
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

  const handleSave = () => {
    const newErrors: Record<string, string> = {};

    // Validation - all fields are mandatory
    if (!formData.matchDate || !validateDate(formData.matchDate)) {
      newErrors.matchDate = 'Match Date is required';
    }
    if (!formData.team1) {
      newErrors.team1 = 'Team 1 is required';
    }
    if (!formData.team2) {
      newErrors.team2 = 'Team 2 is required';
    }

    // Validate that team1 and team2 are different
    if (formData.team1 && formData.team2 && formData.team1 === formData.team2) {
      newErrors.team2 = 'Team 1 and Team 2 must be different';
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
    toast.success('Match created successfully!', { duration: 3000 });

    // Reset form after successful save
    setFormData({
      matchDate: '',
      team1: '',
      team2: '',
    });

    // Handle save logic here (in future, will use TanStack Query mutation)
    console.log('Match data:', formData);
  };

  const handleReset = () => {
    setFormData({
      matchDate: '',
      team1: '',
      team2: '',
    });
    setErrors({});
    setIsCalendarOpen(false);
    toast.success('Form reset', { duration: 2000 });
  };

  // DataTable columns configuration
  const columns: Column<Match>[] = [
    {
      key: 'matchBetween',
      label: 'Match Between',
      sortable: true,
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
    },
    {
      key: 'winner',
      label: 'Winner',
      sortable: true,
      render: (value) => (
        <span className="inline-block px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-semibold">
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className="inline-block px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
          {value}
        </span>
      ),
    },
  ];

  const handleEdit = (match: Match) => {
    toast.success(`Editing match: ${match.matchBetween}`, { duration: 2000 });
    // Handle edit logic here - in future will navigate to edit page or open modal
    console.log('Edit match:', match);
  };

  const handleDelete = (match: Match) => {
    if (confirm(`Are you sure you want to delete match ${match.matchBetween}?`)) {
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
      toast.success(`Match ${match.matchBetween} deleted successfully`, { duration: 2000 });
    }
  };

  const handleRowSelect = (selectedRows: Match[]) => {
    console.log('Selected rows:', selectedRows);
    // Handle row selection logic here
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">CREATE MATCH</h1>
      </div>
      <Card>
        <form className="space-y-6">
          {/* First Row - Match Date, Team1, VS, Team2 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
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

            {/* Select Team1 */}
            <div className="md:col-span-4">
              <Select
                label="Select Team1*"
                id="team1"
                value={formData.team1}
                onChange={(e) => handleInputChange('team1', e.target.value)}
                options={teamOptions}
                error={errors.team1}
              />
            </div>

            {/* VS Separator - Fixed at input field level, doesn't move with errors */}
            <div className="md:col-span-1 relative" style={{ minHeight: '60px' }}>
              <div className="absolute top-[34px] left-1/2 transform -translate-x-1/2">
                <span className="text-2xl font-bold text-retro-dark">VS</span>
              </div>
            </div>

            {/* Select Team2 */}
            <div className="md:col-span-4">
              <Select
                label="Select Team2*"
                id="team2"
                value={formData.team2}
                onChange={(e) => handleInputChange('team2', e.target.value)}
                options={teamOptions}
                error={errors.team2}
              />
            </div>
          </div>

          {/* Second Row - Action Buttons (Left Aligned) */}
          <div className="flex justify-start gap-4">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 bg-red-500 text-white font-bold text-lg rounded hover:opacity-90 transition-opacity"
            >
              Reset
            </button>
          </div>
        </form>
      </Card>

      {/* DataTable below the form */}
      <h2 className="text-2xl font-bold text-[var(--foreground)] mt-8">TEAM SUMMARY</h2>
      <Card height="600px">
        <DataTable<Match>
          data={matches}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRowSelect={handleRowSelect}
          entriesPerPageOptions={[10, 25, 50, 100]}
          defaultEntriesPerPage={100}
        />
      </Card>
    </div>
  );
}
