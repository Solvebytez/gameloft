'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import ConfirmModal from '@/app/components/ui/ConfirmModal';
import { useCreateGroup, useUpdateGroup, useDeleteGroup, useGroups, Group } from '@/app/hooks/useGroups';

export default function GroupPage() {
  const [formData, setFormData] = useState({
    groupName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; groupId: number | null }>({
    isOpen: false,
    groupId: null,
  });
  const groupNameInputRef = useRef<HTMLInputElement>(null);
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();

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
    if (!formData.groupName.trim()) {
      newErrors.groupName = 'Group name is required';
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
      if (isEditMode && editingGroup) {
        // Update existing group
        await updateGroupMutation.mutateAsync({
          id: editingGroup.id,
          payload: {
            name: formData.groupName.trim(),
          },
        });
        
        // Reset edit mode
        setIsEditMode(false);
        setEditingGroup(null);
      } else {
        // Create new group
        await createGroupMutation.mutateAsync({
          name: formData.groupName.trim(),
        });
      }

      // Reset form after successful save
      setFormData({
        groupName: '',
      });

      // Focus on group name field after successful save
      setTimeout(() => {
        groupNameInputRef.current?.focus();
      }, 100);
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Error saving group:', error);
    }
  };

  const handleReset = () => {
    setFormData({
      groupName: '',
    });
    setErrors({});
    setIsEditMode(false);
    setEditingGroup(null);
    toast.success('Form reset', { duration: 2000 });
  };

  const handleEdit = (group: Group) => {
    setIsEditMode(true);
    setEditingGroup(group);
    setFormData({
      groupName: group.name,
    });
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingGroup(null);
    setFormData({
      groupName: '',
    });
    setErrors({});
  };

  const handleDelete = (group: Group) => {
    setDeleteConfirmModal({
      isOpen: true,
      groupId: group.id,
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirmModal.groupId) {
      try {
        await deleteGroupMutation.mutateAsync(deleteConfirmModal.groupId);
        setDeleteConfirmModal({ isOpen: false, groupId: null });
      } catch (error) {
        console.error('Error deleting group:', error);
        // Error is already handled by the mutation's onError callback
      }
    }
  };

  // Handle Enter key to submit form
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'groupName') {
        // Submit form when Enter is pressed
        handleSave();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Group</h1>
        <p className="text-sm text-retro-dark/60 mt-1">{isEditMode ? 'Edit' : 'Create'}</p>
      </div>
      <Card>
        <form className="space-y-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Input
                ref={groupNameInputRef}
                type="text"
                label="Group Name*"
                id="groupName"
                value={formData.groupName}
                onChange={(e) => handleInputChange('groupName', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'groupName')}
                error={errors.groupName}
                placeholder="Enter group name"
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
                disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                className="px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(createGroupMutation.isPending || updateGroupMutation.isPending) ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
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
          </div>
        </form>
      </Card>

      {/* Groups Table */}
      <Card>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground">Groups List</h2>
          <p className="text-sm text-retro-dark/60 mt-1">
            {groups.length} {groups.length === 1 ? 'group' : 'groups'} found
          </p>
        </div>

        {groupsLoading ? (
          <div className="text-center py-8 text-retro-dark/60">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-retro-dark/60">No groups found. Create your first group above.</div>
        ) : (
          <div className="p-4">
            <DataTable
              data={groups}
              columns={groupColumns}
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
        onCancel={() => setDeleteConfirmModal({ isOpen: false, groupId: null })}
        onConfirm={confirmDelete}
        title="Delete Group"
        message={
          deleteConfirmModal.groupId
            ? `Are you sure you want to delete group "${groups.find((g) => g.id === deleteConfirmModal.groupId)?.name || 'this group'}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="red"
      />
    </div>
  );
}

// Define columns for groups table
const groupColumns: Column<Group>[] = [
  {
    key: 'id',
    label: 'ID',
    render: (value, group) => <span className="font-mono text-sm">{group.id}</span>,
  },
  {
    key: 'name',
    label: 'Group Name',
    render: (value, group) => <span className="font-semibold">{group.name}</span>,
  },
  {
    key: 'total_commission',
    label: 'Total Commission',
    render: (value, group) => {
      // Handle both string and number types from API
      const commission = typeof group.total_commission === 'string' 
        ? parseFloat(group.total_commission) 
        : (group.total_commission || 0);
      return (
        <span className="font-semibold text-retro-accent">
          {!isNaN(commission) ? `${commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '0.00%'}
        </span>
      );
    },
  },
  {
    key: 'user_count',
    label: 'Users',
    render: (value, group) => (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
        {group.user_count || group.users?.length || 0}
      </span>
    ),
  },
  {
    key: 'users',
    label: 'User Names',
    render: (value, group) => {
      const userNames = group.users?.map((u) => u.name).join(', ') || 'No users';
      return (
        <span className="text-sm text-retro-dark/70" title={userNames}>
          {userNames.length > 50 ? `${userNames.substring(0, 50)}...` : userNames}
        </span>
      );
    },
  },
  {
    key: 'created_at',
    label: 'Created At',
    render: (value, group) => {
      // Parse date as IST (backend sends dates in IST format)
      let dateStr = group.created_at?.trim() || '';
      if (dateStr && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        dateStr = dateStr.replace(' ', 'T') + '+05:30';
      }
      const date = new Date(dateStr || group.created_at);
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
