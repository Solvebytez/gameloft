'use client';

import { useState, useRef } from 'react';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import ConfirmModal from '@/app/components/ui/ConfirmModal';
import { useUsers, useCreateUser, useUpdateUser, useUpdateUserStatus, useDeleteUser, User, CreateUserPayload } from '@/app/hooks/useUsers';
import { useGroups } from '@/app/hooks/useGroups';

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

const sessionCommissionTypeOptions = [
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
    session_commission: '',
    session_commission_type: '',
    group_id: '',
    mark_as_cut: 'no',
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
  const sessionCommissionTypeInputRef = useRef<HTMLSelectElement>(null);
  const sessionCommissionInputRef = useRef<HTMLInputElement>(null);
  const groupInputRef = useRef<HTMLSelectElement>(null);

  // Fetch users from API
  const { data: users = [], isLoading, error } = useUsers();
  
  // Fetch groups from API
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const updateStatusMutation = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();

  const handleInputChange = (field: string, value: string | boolean) => {
    // Convert boolean to 'yes'/'no' for mark_as_cut field
    if (field === 'mark_as_cut' && typeof value === 'boolean') {
      setFormData((prev) => ({ ...prev, [field]: value ? 'yes' : 'no' }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
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
      
      // Define the order of fields (matching visual layout)
      const fieldOrder = ['role', 'name', 'commission_type', 'commission', 'partnership', 'group', 'session_commission_type', 'session_commission'];
      const currentIndex = fieldOrder.indexOf(currentField);
      
      if (currentIndex < fieldOrder.length - 1) {
        // Find the next visible field
        let nextIndex = currentIndex + 1;
        let nextField = fieldOrder[nextIndex];
        
        // Skip hidden fields
        while (nextIndex < fieldOrder.length) {
          nextField = fieldOrder[nextIndex];
          
          // Skip commission if commission_type is no_commission
          if (nextField === 'commission' && formData.commission_type === 'no_commission') {
            nextIndex++;
            continue;
          }
          
          // Skip session_commission if session_commission_type is no_commission
          if (nextField === 'session_commission' && formData.session_commission_type === 'no_commission') {
            nextIndex++;
            continue;
          }
          
          // Found a visible field
          break;
        }
        
        // If we've reached the end, submit the form
        if (nextIndex >= fieldOrder.length) {
          handleSave();
          return;
        }
        
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
            case 'session_commission_type':
              sessionCommissionTypeInputRef.current?.focus();
              // Open dropdown for select fields
              setTimeout(() => {
                if (sessionCommissionTypeInputRef.current) {
                  sessionCommissionTypeInputRef.current.click();
                }
              }, 50);
              break;
            case 'session_commission':
              sessionCommissionInputRef.current?.focus();
              break;
            case 'group':
              groupInputRef.current?.focus();
              // Open dropdown for select fields
              setTimeout(() => {
                if (groupInputRef.current) {
                  groupInputRef.current.click();
                }
              }, 50);
              break;
        }
      } else {
        // Last field - submit the form
        handleSave();
      }
    }
  };

  // Handle focus on select fields to auto-open dropdown
  const handleSelectFocus = (field: 'role' | 'commission_type' | 'session_commission_type' | 'group') => {
    setTimeout(() => {
      if (field === 'role' && roleInputRef.current) {
        roleInputRef.current.click();
      } else if (field === 'commission_type' && commissionTypeInputRef.current) {
        commissionTypeInputRef.current.click();
      } else if (field === 'session_commission_type' && sessionCommissionTypeInputRef.current) {
        sessionCommissionTypeInputRef.current.click();
      } else if (field === 'group' && groupInputRef.current) {
        groupInputRef.current.click();
      }
    }, 50);
  };
  
  // Group options for dropdown
  const groupOptions = [
    { value: '', label: '--SELECT--' },
    ...groups.map((group) => ({
      value: String(group.id),
      label: group.name,
    })),
  ];

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
    if (!formData.session_commission_type) {
      newErrors.session_commission_type = 'Session commission type is required';
    }
    
    // Session Commission is required if session_commission_type is not 'no_commission'
    if (formData.session_commission_type !== 'no_commission') {
      if (!formData.session_commission.trim()) {
        newErrors.session_commission = 'Session commission is required';
      } else if (isNaN(Number(formData.session_commission)) || Number(formData.session_commission) < 0 || Number(formData.session_commission) > 100) {
        newErrors.session_commission = 'Session commission must be a number between 0 and 100';
      }
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
      console.error(firstError, { duration: 3000 });
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
          session_commission?: number;
          session_commission_type?: 'no_commission' | 'profit_loss' | 'entrywise';
          group_id?: number | null;
          mark_as_cut?: 'no' | 'yes';
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
        if (formData.session_commission_type !== editingUser.session_commission_type) {
          updatePayload.session_commission_type = formData.session_commission_type as 'no_commission' | 'profit_loss' | 'entrywise';
          if (formData.session_commission_type === 'no_commission') {
            updatePayload.session_commission = 0;
          } else {
            // Always send session_commission when type is not no_commission
            // Use form value if provided, otherwise keep existing value or default to 0
            updatePayload.session_commission = formData.session_commission.trim() 
              ? Number(formData.session_commission) 
              : (editingUser.session_commission || 0);
          }
        } else if (formData.session_commission_type !== 'no_commission' && formData.session_commission.trim() && Number(formData.session_commission) !== (editingUser.session_commission || 0)) {
          updatePayload.session_commission = Number(formData.session_commission);
        }
        
        // Handle group_id - check if it changed
        const currentGroupId = editingUser.group_id ?? null;
        const newGroupId = formData.group_id ? parseInt(formData.group_id) : null;
        // Normalize both to numbers or null for comparison
        const currentGroupIdNum = currentGroupId !== null ? Number(currentGroupId) : null;
        const newGroupIdNum = newGroupId !== null ? Number(newGroupId) : null;
        if (currentGroupIdNum !== newGroupIdNum) {
          updatePayload.group_id = newGroupIdNum;
        }
        
        // Handle mark_as_cut - check if it changed
        const currentMarkAsCut = editingUser.mark_as_cut ?? 'no';
        if (formData.mark_as_cut !== currentMarkAsCut) {
          updatePayload.mark_as_cut = formData.mark_as_cut as 'no' | 'yes';
        }

        if (Object.keys(updatePayload).length > 0) {
          await updateUserMutation.mutateAsync({
            id: editingUser.id,
            payload: updatePayload,
          });
        } else {
          console.log('No changes to save');
        }
      } else {
        // Create mode - ensure all required fields are present
        // After validation, we know session_commission_type is not empty
        const sessionCommissionType: 'no_commission' | 'profit_loss' | 'entrywise' = formData.session_commission_type as 'no_commission' | 'profit_loss' | 'entrywise';
        const commissionType: 'no_commission' | 'profit_loss' | 'entrywise' = formData.commission_type as 'no_commission' | 'profit_loss' | 'entrywise';
        
        const payload: CreateUserPayload = {
          name: formData.name.trim(),
          role: formData.role,
          commission: commissionType === 'no_commission' ? 0 : (formData.commission ? Number(formData.commission) : 0),
          partnership: Number(formData.partnership),
          commission_type: commissionType,
          session_commission: sessionCommissionType === 'no_commission' ? 0 : (formData.session_commission && formData.session_commission.trim() ? Number(formData.session_commission) : 0),
          session_commission_type: sessionCommissionType,
          group_id: formData.group_id ? parseInt(formData.group_id) : null,
          mark_as_cut: formData.mark_as_cut as 'yes' | 'no',
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
    console.log('Form reset', { duration: 2000 });
  };

  const handleEdit = (user: typeof transformedUsers[0]) => {
    const originalUser = users.find((u) => u.id === user.id);
    if (!originalUser) {
      console.error('User not found', { duration: 2000 });
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
      session_commission: (originalUser.session_commission || 0).toString(),
      session_commission_type: originalUser.session_commission_type || '',
      group_id: originalUser.group_id ? String(originalUser.group_id) : '',
      mark_as_cut: originalUser.mark_as_cut ?? 'no',
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
      session_commission: '',
      session_commission_type: '',
      group_id: '',
      mark_as_cut: 'no',
    });
    setErrors({});
  };

  // Transform users data for DataTable display
  const transformedUsers = users.map((user) => {
    const groupName = user.groups && user.groups.length > 0 
      ? user.groups[0].name 
      : '-';
    
    return {
      id: user.id,
      userRole: user.role.charAt(0).toUpperCase() + user.role.slice(1),
      name: user.name,
      markAsCut: user.mark_as_cut ?? 'no',
      commission: `${user.commission}%`,
      partnership: `${user.partnership}%`,
      commissionType: user.commission_type
        ? user.commission_type
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : '-',
      sessionCommission: `${user.session_commission || 0}%`,
      sessionCommissionType: user.session_commission_type
        ? user.session_commission_type
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : '-',
      groupName: groupName,
      status: user.status === 'active' ? 'Active' : 'Inactive',
    };
  });

  // DataTable columns configuration
  const columns: Column<typeof transformedUsers[0]>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span>{value}</span>
          {row.markAsCut === 'yes' && (
            <span className="inline-block px-2 py-0.5 bg-orange-200 text-orange-800 rounded text-xs font-semibold">
              CT
            </span>
          )}
        </div>
      ),
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
      key: 'sessionCommission',
      label: 'Session Commission',
      sortable: true,
    },
    {
      key: 'sessionCommissionType',
      label: 'Session Commission Type',
      sortable: true,
      render: (value) => (
        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">
          {value}
        </span>
      ),
    },
    {
      key: 'groupName',
      label: 'Group',
      sortable: true,
      render: (value) => (
        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
          {value}
        </span>
      ),
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
      console.error('User not found', { duration: 2000 });
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
    <div className="space-y-2">
      <Card>
        <form className="space-y-6">
          {/* First Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
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
            </div>
            <div className="md:col-span-3">
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
            </div>
            <div className="md:col-span-3">
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
            </div>
            {formData.commission_type !== 'no_commission' && (
              <div className="md:col-span-3">
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
              </div>
            )}
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
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
            </div>
            <div className="md:col-span-3">
              <Select
                ref={groupInputRef}
                label="Group"
                id="group"
                value={formData.group_id}
                onChange={(e) => handleInputChange('group_id', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'group')}
                onFocus={() => handleSelectFocus('group')}
                options={groupOptions}
                disabled={isLoadingGroups}
              />
            </div>
            <div className="md:col-span-3">
              <Select
                ref={sessionCommissionTypeInputRef}
                label="Session Commission Type*"
                id="session_commission_type"
                value={formData.session_commission_type}
                onChange={(e) => handleInputChange('session_commission_type', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'session_commission_type')}
                onFocus={() => handleSelectFocus('session_commission_type')}
                options={sessionCommissionTypeOptions}
                error={errors.session_commission_type}
              />
            </div>
            {formData.session_commission_type !== 'no_commission' && (
              <div className="md:col-span-3">
                <Input
                  ref={sessionCommissionInputRef}
                  type="text"
                  label="Session Commission*"
                  id="session_commission"
                  value={formData.session_commission}
                  onChange={(e) => handleInputChange('session_commission', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'session_commission')}
                  error={errors.session_commission}
                />
              </div>
            )}
          </div>

          {/* Action Buttons - Right Aligned */}
          <div className="flex justify-end items-center gap-4">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium transition-colors ${formData.mark_as_cut === 'no' ? 'text-retro-dark' : 'text-gray-400'}`}>
                No
              </span>
              <button
                type="button"
                onClick={() => {
                  const newValue = formData.mark_as_cut === 'yes' ? 'no' : 'yes';
                  handleInputChange('mark_as_cut', newValue === 'yes');
                }}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-retro-accent focus:ring-offset-2 ${
                  formData.mark_as_cut === 'yes' ? 'bg-green-700' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={formData.mark_as_cut === 'yes'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.mark_as_cut === 'yes' ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium transition-colors ${formData.mark_as_cut === 'yes' ? 'text-retro-dark' : 'text-gray-400'}`}>
                Yes
              </span>
              <span className="text-sm font-semibold text-retro-dark ml-2">Mark as cut</span>
            </div>
            {isEditMode && (
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
              onClick={handleSave}
              disabled={isEditMode ? updateUserMutation.isPending : createUserMutation.isPending}
              className="px-4 py-1.5 bg-green-700 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="px-4 py-1.5 bg-red-500 text-white font-bold text-sm rounded hover:opacity-90 transition-opacity"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </Card>

      {/* DataTable below the form */}
      <Card>
        <div className="p-2">
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

