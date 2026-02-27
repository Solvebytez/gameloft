'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import ConfirmModal from '@/app/components/ui/ConfirmModal';
import { useCreateInningsOver, useUpdateInningsOver, useDeleteInningsOver, useInningsOvers, InningsOver } from '@/app/hooks/useInningsOvers';

export default function InningsOverPage() {
  const [formData, setFormData] = useState({
    inning: '',
    over: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingInningsOver, setEditingInningsOver] = useState<InningsOver | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; inningsOverId: number | null }>({
    isOpen: false,
    inningsOverId: null,
  });
  const inningInputRef = useRef<HTMLInputElement>(null);
  const createInningsOverMutation = useCreateInningsOver();
  const updateInningsOverMutation = useUpdateInningsOver();
  const deleteInningsOverMutation = useDeleteInningsOver();
  const { data: inningsOvers = [], isLoading: inningsOversLoading } = useInningsOvers();

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
    if (!formData.inning.trim()) {
      newErrors.inning = 'Inning is required';
    } else {
      const inningNum = parseInt(formData.inning);
      if (isNaN(inningNum) || inningNum < 1) {
        newErrors.inning = 'Inning must be a positive number';
      }
    }

    if (!formData.over.trim()) {
      newErrors.over = 'Over is required';
    } else {
      const overNum = parseInt(formData.over);
      if (isNaN(overNum) || overNum < 1) {
        newErrors.over = 'Over must be a positive number';
      }
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
      if (isEditMode && editingInningsOver) {
        // Update existing innings/over
        await updateInningsOverMutation.mutateAsync({
          id: editingInningsOver.id,
          payload: {
            inning: parseInt(formData.inning),
            over: parseInt(formData.over),
          },
        });
        
        // Reset edit mode
        setIsEditMode(false);
        setEditingInningsOver(null);
      } else {
        // Create new innings/over
        await createInningsOverMutation.mutateAsync({
          inning: parseInt(formData.inning),
          over: parseInt(formData.over),
        });
      }

      // Reset form after successful save
      setFormData({
        inning: '',
        over: '',
      });

      // Focus on inning field after successful save
      setTimeout(() => {
        inningInputRef.current?.focus();
      }, 100);
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Error saving innings/over:', error);
    }
  };

  const handleReset = () => {
    setFormData({
      inning: '',
      over: '',
    });
    setErrors({});
    setIsEditMode(false);
    setEditingInningsOver(null);
    toast.success('Form reset', { duration: 2000 });
  };

  const handleEdit = (inningsOver: InningsOver) => {
    setIsEditMode(true);
    setEditingInningsOver(inningsOver);
    setFormData({
      inning: inningsOver.inning.toString(),
      over: inningsOver.over.toString(),
    });
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingInningsOver(null);
    setFormData({
      inning: '',
      over: '',
    });
    setErrors({});
  };

  const handleDelete = (inningsOver: InningsOver) => {
    setDeleteConfirmModal({
      isOpen: true,
      inningsOverId: inningsOver.id,
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirmModal.inningsOverId) {
      try {
        await deleteInningsOverMutation.mutateAsync(deleteConfirmModal.inningsOverId);
        setDeleteConfirmModal({ isOpen: false, inningsOverId: null });
      } catch (error) {
        console.error('Error deleting innings/over:', error);
        // Error is already handled by the mutation's onError callback
      }
    }
  };

  // Handle Enter key to submit form
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'inning') {
        // Move to over field
        const overInput = document.getElementById('over') as HTMLInputElement;
        if (overInput) {
          overInput.focus();
          overInput.select();
        }
      } else if (field === 'over') {
        // Submit form when Enter is pressed
        handleSave();
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <form className="space-y-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Input
                ref={inningInputRef}
                type="number"
                label="Inning*"
                id="inning"
                value={formData.inning}
                onChange={(e) => handleInputChange('inning', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'inning')}
                error={errors.inning}
                placeholder="Enter inning number"
                min="1"
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                label="Over*"
                id="over"
                value={formData.over}
                onChange={(e) => handleInputChange('over', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'over')}
                error={errors.over}
                placeholder="Enter over number"
                min="1"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 items-end">
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
                type="button"
                onClick={handleSave}
                disabled={createInningsOverMutation.isPending || updateInningsOverMutation.isPending}
                className="px-6 py-3 bg-green-700 text-white font-bold text-lg rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(createInningsOverMutation.isPending || updateInningsOverMutation.isPending) ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
              </button>
              {!isEditMode && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 bg-red-700 text-white font-bold text-lg rounded hover:opacity-90 transition-opacity"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* Innings/Overs Table */}
      <Card>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground">Innings/Over List</h2>
          <p className="text-sm text-retro-dark/60 mt-1">
            {inningsOvers.length} {inningsOvers.length === 1 ? 'entry' : 'entries'} found
          </p>
        </div>

        {inningsOversLoading ? (
          <div className="text-center py-8 text-retro-dark/60">Loading innings/overs...</div>
        ) : inningsOvers.length === 0 ? (
          <div className="text-center py-8 text-retro-dark/60">No innings/overs found. Create your first entry above.</div>
        ) : (
          <div className="p-4">
            <DataTable
              data={inningsOvers}
              columns={inningsOverColumns}
              showSearch={true}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onCancel={() => setDeleteConfirmModal({ isOpen: false, inningsOverId: null })}
        onConfirm={confirmDelete}
        title="Delete Innings/Over"
        message={
          deleteConfirmModal.inningsOverId
            ? `Are you sure you want to delete "${inningsOvers.find((io) => io.id === deleteConfirmModal.inningsOverId)?.inning}/${inningsOvers.find((io) => io.id === deleteConfirmModal.inningsOverId)?.over} Over"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="red"
      />
    </div>
  );
}

// Define columns for innings/overs table
const inningsOverColumns: Column<InningsOver>[] = [
  {
    key: 'id',
    label: 'ID',
    render: (value, inningsOver) => <span className="font-mono text-sm">{inningsOver.id}</span>,
  },
  {
    key: 'inning',
    label: 'Inning/Over',
    render: (value, inningsOver) => (
      <span className="font-semibold">{inningsOver.inning}/{inningsOver.over} Over</span>
    ),
  },
  {
    key: 'inning',
    label: 'Inning',
    sortable: true,
    render: (value, inningsOver) => <span className="font-semibold">{inningsOver.inning}</span>,
  },
  {
    key: 'over',
    label: 'Over',
    sortable: true,
    render: (value, inningsOver) => <span className="font-semibold">{inningsOver.over}</span>,
  },
  {
    key: 'created_at',
    label: 'Created At',
    render: (value, inningsOver) => {
      // Parse date as IST (backend sends dates in IST format)
      let dateStr = inningsOver.created_at?.trim() || '';
      if (dateStr && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        dateStr = dateStr.replace(' ', 'T') + '+05:30';
      }
      const date = new Date(dateStr || inningsOver.created_at);
      return (
        <span className="text-sm text-retro-dark/60">
          {date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Kolkata',
          })}
        </span>
      );
    },
  },
];

