'use client';

import { useState, useRef, useMemo } from 'react';
import Card from '@/app/components/ui/Card';
import Select from '@/app/components/ui/Select';
import DatePicker from '@/app/components/ui/DatePicker';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import { useTeams } from '@/app/hooks/useTeams';
import { useMatches, useCreateMatch, useUpdateMatch, useDeleteMatch, Match } from '@/app/hooks/useMatches';
import ConfirmModal from '@/app/components/ui/ConfirmModal';

export default function CreateMatchPage() {
  const [formData, setFormData] = useState({
    matchDate: '',
    team1: '',
    team2: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; matchId: number | null }>({
    isOpen: false,
    matchId: null,
  });
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Fetch teams created by current user
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: matches = [], isLoading: matchesLoading } = useMatches();
  const createMatchMutation = useCreateMatch();
  const updateMatchMutation = useUpdateMatch();
  const deleteMatchMutation = useDeleteMatch();

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

  // Convert yyyy-mm-dd to dd-mm-yyyy for UI
  const convertDateToUIFormat = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
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
      console.error(firstError, { duration: 3000 });
      return;
    }

    try {
      // Convert date format from dd-mm-yyyy to yyyy-mm-dd
      const apiDate = convertDateToAPIFormat(formData.matchDate);

      if (editingMatchId) {
        // Update existing match
        const updatePayload: { team1_id?: number; team2_id?: number; match_date?: string } = {};
        
        // Find the original match to compare values
        const originalMatch = matches.find((m) => m.id === editingMatchId);
        if (originalMatch) {
          if (parseInt(formData.team1) !== originalMatch.team1_id) {
            updatePayload.team1_id = parseInt(formData.team1);
          }
          if (parseInt(formData.team2) !== originalMatch.team2_id) {
            updatePayload.team2_id = parseInt(formData.team2);
          }
          if (apiDate !== originalMatch.match_date) {
            updatePayload.match_date = apiDate;
          }
        }

        // Only call update if there are changes
        if (Object.keys(updatePayload).length > 0) {
          await updateMatchMutation.mutateAsync({
            id: editingMatchId,
            payload: updatePayload,
          });
        } else {
          toast('No changes to save', { duration: 2000 });
        }
      } else {
        // Create new match
        await createMatchMutation.mutateAsync({
          team1_id: parseInt(formData.team1),
          team2_id: parseInt(formData.team2),
          match_date: apiDate,
        });
      }

      // Clear all errors on success
      setErrors({});

      // Reset form after successful save
      handleCancelEdit();
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to save match:', error);
    }
  };

  const handleReset = () => {
    handleCancelEdit();
    console.log('Form reset', { duration: 2000 });
  };

  const handleCancelEdit = () => {
    setFormData({
      matchDate: '',
      team1: '',
      team2: '',
    });
    setErrors({});
    setIsCalendarOpen(false);
    setEditingMatchId(null);
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
    // Find the full match object from matches array
    const fullMatch = matches.find((m) => m.id.toString() === match.id);
    if (!fullMatch) {
      console.error('Match not found', { duration: 2000 });
      return;
    }

    // Convert API date format (yyyy-mm-dd) to UI format (dd-mm-yyyy)
    const uiDate = convertDateToUIFormat(fullMatch.match_date);

    // Populate form with match data
    setFormData({
      matchDate: uiDate,
      team1: fullMatch.team1_id.toString(),
      team2: fullMatch.team2_id.toString(),
    });

    // Set editing mode
    setEditingMatchId(fullMatch.id);

    // Clear any errors
    setErrors({});

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (match: { id: string; matchBetween: string; date: string; winner: string; status: string }) => {
    setDeleteConfirmModal({
      isOpen: true,
      matchId: parseInt(match.id),
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal.matchId) return;

    try {
      await deleteMatchMutation.mutateAsync(deleteConfirmModal.matchId);
      setDeleteConfirmModal({ isOpen: false, matchId: null });
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to delete match:', error);
    }
  };

  const handleRowSelect = (selectedRows: { id: string; matchBetween: string; date: string; winner: string; status: string }[]) => {
    console.log('Selected rows:', selectedRows);
    // Handle row selection logic here
  };

  return (
    <div className="space-y-2">
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
            <div className="md:col-span-3">
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

            {/* Action Buttons */}
            <div className="md:col-span-2 flex items-end justify-end gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={createMatchMutation.isPending || updateMatchMutation.isPending || teamsLoading}
                className="px-4 py-1.5 bg-green-700 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMatchMutation.isPending || updateMatchMutation.isPending
                ? 'Saving...'
                : editingMatchId
                ? 'Update'
                : 'Save'}
            </button>
            {editingMatchId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                  className="px-4 py-1.5 bg-gray-500 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
                className="px-4 py-1.5 bg-red-700 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity"
            >
              Reset
            </button>
            </div>
          </div>
        </form>
      </Card>

      {/* DataTable below the form */}
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
            entriesPerPageOptions={[10, 25, 50, 100]}
            defaultEntriesPerPage={100}
          />
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onCancel={() => setDeleteConfirmModal({ isOpen: false, matchId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Match"
        message={
          deleteConfirmModal.matchId
            ? `Are you sure you want to delete match "${matches.find((m) => m.id === deleteConfirmModal.matchId)?.match_between || 'this match'}"? This action cannot be undone.`
            : 'Are you sure you want to delete this match? This action cannot be undone.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="red"
      />
    </div>
  );
}
