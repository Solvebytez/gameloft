'use client';

import { useState, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Select from '@/app/components/ui/Select';
import DatePicker from '@/app/components/ui/DatePicker';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import { useTeams } from '@/app/hooks/useTeams';
import { useMatches, useCreateMatch } from '@/app/hooks/useMatches';

export default function CreateMatchPage() {
  const [formData, setFormData] = useState({
    matchDate: '',
    team1: '',
    team2: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Fetch teams created by current user
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: matches = [], isLoading: matchesLoading } = useMatches();
  const createMatchMutation = useCreateMatch();

  // Convert teams to options for Select component
  const teamOptions = useMemo(() => {
    const options = [{ value: '', label: 'Select Team' }];
    teams.forEach((team) => {
      options.push({ value: team.id.toString(), label: team.name });
    });
    return options;
  }, [teams]);

  // Convert matches to DataTable format
  const tableMatches = useMemo(() => {
    return matches.map((match) => ({
      id: match.id.toString(),
      matchBetween: match.match_between,
      date: match.match_date,
      winner: match.winner ? match.winner.name : 'Not Declared',
      status: match.status === 'scheduled' ? 'Yet To Start' : match.status === 'completed' ? 'Completed' : match.status === 'in_progress' ? 'In Progress' : match.status,
    }));
  }, [matches]);

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

  // Convert dd-mm-yyyy to yyyy-mm-dd for API
  const convertDateToAPIFormat = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
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

  const handleSave = async () => {
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

    try {
      // Convert date format from dd-mm-yyyy to yyyy-mm-dd
      const apiDate = convertDateToAPIFormat(formData.matchDate);

      await createMatchMutation.mutateAsync({
        team1_id: parseInt(formData.team1),
        team2_id: parseInt(formData.team2),
        match_date: apiDate,
      });

      // Clear all errors on success
      setErrors({});

      // Reset form after successful save
      setFormData({
        matchDate: '',
        team1: '',
        team2: '',
      });
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to create match:', error);
    }
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
  const columns: Column<{ id: string; matchBetween: string; date: string; winner: string; status: string }>[] = [
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

  const handleEdit = (match: { id: string; matchBetween: string; date: string; winner: string; status: string }) => {
    toast.success(`Editing match: ${match.matchBetween}`, { duration: 2000 });
    // Handle edit logic here - in future will navigate to edit page or open modal
    console.log('Edit match:', match);
  };

  const handleDelete = (match: { id: string; matchBetween: string; date: string; winner: string; status: string }) => {
    if (confirm(`Are you sure you want to delete match ${match.matchBetween}?`)) {
      toast.success(`Match ${match.matchBetween} deleted successfully`, { duration: 2000 });
      // TODO: Implement delete API
    }
  };

  const handleRowSelect = (selectedRows: { id: string; matchBetween: string; date: string; winner: string; status: string }[]) => {
    console.log('Selected rows:', selectedRows);
    // Handle row selection logic here
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">CREATE MATCH</h1>
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
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSave();
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
                disabled={teamsLoading}
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
                disabled={teamsLoading}
              />
            </div>
          </div>

          {/* Second Row - Action Buttons (Left Aligned) */}
          <div className="flex justify-start gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={createMatchMutation.isPending || teamsLoading}
              className="px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMatchMutation.isPending ? 'Saving...' : 'Save'}
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
      <h2 className="text-2xl font-bold text-foreground mt-8">MATCH SUMMARY</h2>
      <Card height="600px">
        {matchesLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg text-retro-dark">Loading matches...</p>
          </div>
        ) : (
          <DataTable<{ id: string; matchBetween: string; date: string; winner: string; status: string }>
            data={tableMatches}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRowSelect={handleRowSelect}
            entriesPerPageOptions={[10, 25, 50, 100]}
            defaultEntriesPerPage={100}
          />
        )}
      </Card>
    </div>
  );
}
