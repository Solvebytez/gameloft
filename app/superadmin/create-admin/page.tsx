'use client';

import { useState, useRef, useEffect } from 'react';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import { useAdmins, useCreateAdmin, useUpdateAdmin, useDeleteAdmin, useUpdateAdminStatus, Admin } from '@/app/hooks/useAdmins';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

const roleOptions = [
  { value: '', label: 'Select Role' },
  { value: 'admin', label: 'Admin' },
];

// Three-dot dropdown component for actions
function AdminActionsDropdown({
  admin,
  onEdit,
  onDelete,
  onStatusChange,
  isUpdatingStatus,
}: {
  admin: Admin;
  onEdit: (admin: Admin) => void;
  onDelete: (admin: Admin) => void;
  onStatusChange: (status: 'active' | 'inactive') => void;
  isUpdatingStatus: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Actions"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                onEdit(admin);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                onStatusChange(admin.status === 'active' ? 'inactive' : 'active');
                setIsOpen(false);
              }}
              disabled={isUpdatingStatus}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingStatus
                ? 'Updating...'
                : admin.status === 'active'
                ? 'Set Inactive'
                : 'Set Active'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Are you sure you want to delete admin "${admin.name}"?`)) {
                  onDelete(admin);
                }
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface FormData {
  role: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
}

export default function CreateAdminPage() {
  const [formData, setFormData] = useState<FormData>({
    role: '',
    name: '',
    email: '',
    mobile: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // TanStack Query hooks
  const { data: admins = [], isLoading, error } = useAdmins();
  const createMutation = useCreateAdmin();
  const updateMutation = useUpdateAdmin();
  const deleteMutation = useDeleteAdmin();
  const statusMutation = useUpdateAdminStatus();

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation - mandatory fields
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!editingAdmin && !formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Set errors and return validation result
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingAdmin) {
        // Update existing admin
        const updatePayload: { name?: string; email?: string; mobile?: string | null; password?: string } = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile: formData.mobile.trim() || null,
        };
        
        if (formData.password.trim()) {
          updatePayload.password = formData.password;
        }

        await updateMutation.mutateAsync({
          id: editingAdmin.id,
          ...updatePayload,
        });

        setEditingAdmin(null);
      } else {
        // Create new admin
        await createMutation.mutateAsync({
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile: formData.mobile.trim() || null,
          password: formData.password,
          role: formData.role,
        });
      }

      // Reset form after successful save
      setFormData({
        role: '',
        name: '',
        email: '',
        mobile: '',
        password: '',
      });
      setErrors({});
    } catch (error: unknown) {
      console.error('Error saving admin:', error);
      
      // Log full error details
      if (error instanceof AxiosError) {
        console.error('Error response data:', error.response?.data);
        console.error('Error response status:', error.response?.status);
      }
      
      // Handle validation errors from backend
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'errors' in error.response.data
      ) {
        const backendErrors = error.response.data.errors as Record<string, string | string[]>;
        const errorMessages: Record<string, string> = {};
        
        Object.keys(backendErrors).forEach((key) => {
          errorMessages[key] = Array.isArray(backendErrors[key]) 
            ? backendErrors[key][0] 
            : String(backendErrors[key]);
        });
        
        setErrors(errorMessages);
        toast.error(Object.values(errorMessages)[0] || 'Validation failed', { duration: 3000 });
      } else if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save admin. Please try again.';
        toast.error(errorMessage, { duration: 3000 });
      } else if (error instanceof Error) {
        toast.error(error.message, { duration: 3000 });
      } else {
        toast.error('Failed to save admin. Please try again.', { duration: 3000 });
      }
    }
  };

  const handleReset = () => {
    setFormData({
      role: '',
      name: '',
      email: '',
      mobile: '',
      password: '',
    });
    setErrors({});
    setEditingAdmin(null);
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      role: admin.role,
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile || '',
      password: '', // Don't prefill password
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (admin: Admin) => {
    if (confirm(`Are you sure you want to delete admin "${admin.name}"?`)) {
      await deleteMutation.mutateAsync(admin.id);
      // Error is handled by the mutation
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // DataTable columns configuration
  const columns: Column<Admin>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'mobile',
      label: 'Mobile',
      sortable: true,
      render: (value) => value || '-',
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value) => (
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => {
        const isActive = value === 'active';
        return (
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Created At',
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        const date = new Date(value);
        return date.toLocaleString();
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">
        {editingAdmin ? 'EDIT ADMIN' : 'CREATE ADMIN'}
      </h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Row 1 */}
            <Select
              label="Role*"
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              options={roleOptions}
              error={errors.role}
              disabled={!!editingAdmin} // Disable role when editing
            />
            <Input
              type="text"
              label="Name*"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              required
            />
            <Input
              type="email"
              label="Email*"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
              required
            />

            {/* Row 2 */}
            <Input
              type="tel"
              label="Mobile"
              id="mobile"
              value={formData.mobile}
              onChange={(e) => handleInputChange('mobile', e.target.value)}
              error={errors.mobile}
            />
            {/* Password Input with Show/Hide Toggle */}
            <div className="col-span-1">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[#2d2d2d] mb-2 uppercase"
              >
                {editingAdmin ? 'Password (leave blank to keep current)' : 'Password*'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required={!editingAdmin}
                  minLength={6}
                  className={`w-full px-4 py-3 pr-12 bg-white border-[3px] border-retro-dark text-retro-dark font-bold text-lg rounded focus:outline-none focus:ring-2 focus:ring-retro-accent disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.password ? 'border-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-retro-dark hover:text-retro-accent focus:outline-none focus:text-retro-accent transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            {/* Action Buttons - Same Row, Right Aligned */}
            <div className="col-span-1 flex justify-end gap-4 items-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? 'Saving...'
                  : editingAdmin
                  ? 'Update'
                  : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
                className="px-6 py-3 bg-red-500 text-white font-bold text-lg rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingAdmin ? 'Cancel' : 'Reset'}
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* DataTable below the form */}
      <Card>
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-lg text-gray-600">Loading admins...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-lg text-red-600">
                Error loading admins: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Please check the browser console for more details.
              </p>
            </div>
          ) : (
            <DataTable
              title="Admin List"
              data={admins}
              columns={columns}
              renderActions={(admin) => (
                <AdminActionsDropdown
                  admin={admin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={(status) => statusMutation.mutate({ id: admin.id, status })}
                  isUpdatingStatus={statusMutation.isPending}
                />
              )}
              entriesPerPageOptions={[10, 25, 50, 100]}
              defaultEntriesPerPage={25}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
