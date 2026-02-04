'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import ConfirmModal from '@/app/components/ui/ConfirmModal';
import { useUsers, useCreateUser, useUpdateUser, useUpdateUserStatus, useDeleteUser, User } from '@/app/hooks/useUsers';

const roleOptions = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const commissionTypeOptions = [
  { value: '', label: '--SELECT--' },
  { value: 'no_commission', label: 'No commission' },
  { value: 'profit_loss', label: 'Profit loss' },
  { value: 'entrywise', label: 'Entrywise' },
];

export default function CreateUserPage() {
  const [formData, setFormData] = useState({
    role: 'user',
    name: '',
    commission: '',
    partnership: '',
    commission_type: '',
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; userId: number | null }>({
    isOpen: false,
    userId: null,
  });
  const [statusChangeModal, setStatusChangeModal] = useState<{ isOpen: boolean; userId: number | null; newStatus: 'active' | 'inactive' | null }>({
    isOpen: false,
    userId: null,
    newStatus: null,
  });

  // Refs for input fields to enable keyboard navigation
  const roleInputRef = useRef<HTMLSelectElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const commissionTypeInputRef = useRef<HTMLSelectElement>(null);
  const commissionInputRef = useRef<HTMLInputElement>(null);
  const partnershipInputRef = useRef<HTMLInputElement>(null);

  // Fetch users from API
  const { data: users = [], isLoading, error } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const updateStatusMutation = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();

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

  // Handle Enter key to move focus to next field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Define the order of fields
      const fieldOrder = ['role', 'name', 'commission_type', 'commission', 'partnership'];
      const currentIndex = fieldOrder.indexOf(currentField);
      
      if (currentIndex < fieldOrder.length - 1) {
        // Move to next field
        const nextField = fieldOrder[currentIndex + 1];
        
        // Check if next field should be visible (commission is hidden when no_commission is selected)
        if (nextField === 'commission' && formData.commission_type === 'no_commission') {
          // Skip commission and go to partnership
          partnershipInputRef.current?.focus();
        } else {
          // Focus the next field based on ref
          switch (nextField) {
            case 'role':
              roleInputRef.current?.focus();
              // Open dropdown for select fields
              setTimeout(() => {
                if (roleInputRef.current) {
                  roleInputRef.current.click();
                }
              }, 50);
              break;
            case 'name':
              nameInputRef.current?.focus();
              break;
            case 'commission_type':
              commissionTypeInputRef.current?.focus();
              // Open dropdown for select fields
              setTimeout(() => {
                if (commissionTypeInputRef.current) {
                  commissionTypeInputRef.current.click();
                }
              }, 50);
              break;
            case 'commission':
              commissionInputRef.current?.focus();
              break;
            case 'partnership':
              partnershipInputRef.current?.focus();
              break;
          }
        }
      } else {
        // Last field - submit the form
        handleSave();
      }
    }
  };

  // Handle focus on select fields to auto-open dropdown
  const handleSelectFocus = (field: 'role' | 'commission_type') => {
    setTimeout(() => {
      if (field === 'role' && roleInputRef.current) {
        roleInputRef.current.click();
      } else if (field === 'commission_type' && commissionTypeInputRef.current) {
        commissionTypeInputRef.current.click();
      }
    }, 50);
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    // Validation - only mandatory fields
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.commission_type) {
      newErrors.commission_type = 'Commission type is required';
    }
    
    // Commission is required if commission_type is not 'no_commission' (including when empty/not selected)
    if (formData.commission_type !== 'no_commission') {
      if (!formData.commission.trim()) {
        newErrors.commission = 'Commission is required';
      } else if (isNaN(Number(formData.commission)) || Number(formData.commission) < 0 || Number(formData.commission) > 100) {
        newErrors.commission = 'Commission must be a number between 0 and 100';
      }
    }
    
    // Partnership is always required
    if (!formData.partnership.trim()) {
      newErrors.partnership = 'Partnership is required';
    } else if (isNaN(Number(formData.partnership)) || Number(formData.partnership) < 0 || Number(formData.partnership) > 100) {
      newErrors.partnership = 'Partnership must be a number between 0 and 100';
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
      if (isEditMode && editingUser) {
        // Update mode - only send changed fields
        const updatePayload: {
          name?: string;
          role?: string;
          commission?: number;
          partnership?: number;
          commission_type?: 'no_commission' | 'profit_loss' | 'entrywise';
        } = {};

        if (formData.name.trim() !== editingUser.name) {
          updatePayload.name = formData.name.trim();
        }
        if (formData.role !== editingUser.role) {
          updatePayload.role = formData.role;
        }
        if (formData.commission_type !== editingUser.commission_type) {
          updatePayload.commission_type = formData.commission_type as 'no_commission' | 'profit_loss' | 'entrywise';
          if (formData.commission_type === 'no_commission') {
            updatePayload.commission = 0;
          } else if (formData.commission.trim()) {
            updatePayload.commission = Number(formData.commission);
          }
        } else if (formData.commission_type !== 'no_commission' && formData.commission.trim() && Number(formData.commission) !== editingUser.commission) {
          updatePayload.commission = Number(formData.commission);
        }
        if (formData.partnership.trim() && Number(formData.partnership) !== editingUser.partnership) {
          updatePayload.partnership = Number(formData.partnership);
        }

        if (Object.keys(updatePayload).length > 0) {
          await updateUserMutation.mutateAsync({
            id: editingUser.id,
            payload: updatePayload,
          });
        } else {
          toast('No changes to save', { duration: 2000 });
        }
      } else {
        // Create mode
        const payload = {
          name: formData.name.trim(),
          role: formData.role,
          commission: formData.commission_type === 'no_commission' ? 0 : (formData.commission ? Number(formData.commission) : 0),
          partnership: Number(formData.partnership),
          commission_type: formData.commission_type as 'no_commission' | 'profit_loss' | 'entrywise',
        };

        await createUserMutation.mutateAsync(payload);
      }

      // Reset form after successful save
      handleCancelEdit();
      
      // Focus on name field after successful save
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Error saving user:', error);
    }
  };

  const handleReset = () => {
    handleCancelEdit();
    toast.success('Form reset', { duration: 2000 });
  };

  const handleEdit = (user: typeof transformedUsers[0]) => {
    const originalUser = users.find((u) => u.id === user.id);
    if (!originalUser) {
      toast.error('User not found', { duration: 2000 });
      return;
    }

    setEditingUser(originalUser);
    setIsEditMode(true);
    setFormData({
      role: originalUser.role,
      name: originalUser.name,
      commission: originalUser.commission.toString(),
      partnership: originalUser.partnership.toString(),
      commission_type: originalUser.commission_type || '',
    });
    setErrors({});
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingUser(null);
    setFormData({
      role: 'user',
      name: '',
      commission: '',
      partnership: '',
      commission_type: '',
    });
    setErrors({});
  };

  // Transform users data for DataTable display
  const transformedUsers = users.map((user) => ({
    id: user.id,
    userRole: user.role.charAt(0).toUpperCase() + user.role.slice(1),
    name: user.name,
    mobile: user.mobile || '-',
    commission: `${user.commission}%`,
    partnership: `${user.partnership}%`,
    commissionType: user.commission_type
      ? user.commission_type
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : '-',
    lastLogin: user.last_login ? new Date(user.last_login).toLocaleString() : '-',
    status: user.status === 'active' ? 'Active' : 'Inactive',
  }));

  // DataTable columns configuration
  const columns: Column<typeof transformedUsers[0]>[] = [
    {
      key: 'userRole',
      label: 'User Role',
      sortable: true,
      render: (value) => (
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
          {value}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
    },
    {
      key: 'mobile',
      label: 'Mobile',
      sortable: true,
    },
    {
      key: 'commission',
      label: 'Commission',
      sortable: true,
    },
    {
      key: 'partnership',
      label: 'Partnership',
      sortable: true,
    },
    {
      key: 'commissionType',
      label: 'Commission Type',
      sortable: true,
      render: (value) => (
        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
          {value}
        </span>
      ),
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
          value === 'Active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      ),
    },
  ];

  const handleDelete = (user: typeof transformedUsers[0]) => {
    setDeleteConfirmModal({ isOpen: true, userId: user.id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmModal.userId) return;

    try {
      await deleteUserMutation.mutateAsync(deleteConfirmModal.userId);
      setDeleteConfirmModal({ isOpen: false, userId: null });
    } catch (error) {
      console.error('Error deleting user:', error);
      // Error is already handled by the mutation's onError callback
    }
  };

  const handleStatusChange = (user: typeof transformedUsers[0]) => {
    // Find the original user data to get the actual status
    const originalUser = users.find((u) => u.id === user.id);
    if (!originalUser) {
      toast.error('User not found', { duration: 2000 });
      return;
    }

    const currentStatus = originalUser.status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    setStatusChangeModal({
      isOpen: true,
      userId: originalUser.id,
      newStatus: newStatus,
    });
  };

  const confirmStatusChange = async () => {
    if (!statusChangeModal.userId || !statusChangeModal.newStatus) return;

    try {
      await updateStatusMutation.mutateAsync({
        userId: statusChangeModal.userId,
        status: statusChangeModal.newStatus,
      });
      setStatusChangeModal({ isOpen: false, userId: null, newStatus: null });
    } catch (error) {
      console.error('Error changing user status:', error);
      // Error is already handled by the mutation's onError callback
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-retro-dark/60 mt-1">{isEditMode ? 'Edit' : 'Create'}</p>
      </div>
      <Card>
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Row 1 */}
            <Select
              ref={roleInputRef}
              label="Roles*"
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'role')}
              onFocus={() => handleSelectFocus('role')}
              options={roleOptions}
              error={errors.role}
            />
            <Input
              ref={nameInputRef}
              type="text"
              label="Name*"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'name')}
              error={errors.name}
            />
            <Select
              ref={commissionTypeInputRef}
              label="Commission Type*"
              id="commission_type"
              value={formData.commission_type}
              onChange={(e) => handleInputChange('commission_type', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'commission_type')}
              onFocus={() => handleSelectFocus('commission_type')}
              options={commissionTypeOptions}
              error={errors.commission_type}
            />

            {/* Row 2 - Commission (hidden only when no_commission is selected) and Partnership (always shown) */}
            {formData.commission_type !== 'no_commission' && (
              <Input
                ref={commissionInputRef}
                type="text"
                label="Commission*"
                id="commission"
                value={formData.commission}
                onChange={(e) => handleInputChange('commission', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'commission')}
                error={errors.commission}
              />
            )}
            <Input
              ref={partnershipInputRef}
              type="text"
              label="Partnership*"
              id="partnership"
              value={formData.partnership}
              onChange={(e) => handleInputChange('partnership', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'partnership')}
              error={errors.partnership}
            />

            {/* Action Buttons - Same Row, Right Aligned */}
            <div className={`${isEditMode ? 'col-span-3' : 'col-span-1'} flex justify-end gap-4 items-end`}>
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
                disabled={isEditMode ? updateUserMutation.isPending : createUserMutation.isPending}
                className="px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditMode
                  ? updateUserMutation.isPending
                    ? 'Updating...'
                    : 'Update'
                  : createUserMutation.isPending
                  ? 'Saving...'
                  : 'Save'}
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

      {/* DataTable below the form */}
      <Card>
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-retro-dark/60">Loading users...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Error loading users: {error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
          ) : (
            <DataTable
              title="List"
              data={transformedUsers}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              entriesPerPageOptions={[10, 25, 50, 100]}
              defaultEntriesPerPage={100}
            />
          )}
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onCancel={() => setDeleteConfirmModal({ isOpen: false, userId: null })}
        onConfirm={confirmDelete}
        title="Delete User"
        message={
          deleteConfirmModal.userId
            ? `Are you sure you want to delete user "${users.find((u) => u.id === deleteConfirmModal.userId)?.name || 'this user'}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="red"
      />

      {/* Status Change Confirmation Modal */}
      <ConfirmModal
        isOpen={statusChangeModal.isOpen}
        onCancel={() => setStatusChangeModal({ isOpen: false, userId: null, newStatus: null })}
        onConfirm={confirmStatusChange}
        title="Change User Status"
        message={
          statusChangeModal.userId && statusChangeModal.newStatus
            ? `Are you sure you want to change the status of user "${users.find((u) => u.id === statusChangeModal.userId)?.name || 'this user'}" to ${statusChangeModal.newStatus === 'active' ? 'Active' : 'Inactive'}?`
            : ''
        }
        confirmText="Change Status"
        cancelText="Cancel"
        confirmButtonColor="blue"
      />
    </div>
  );
}

