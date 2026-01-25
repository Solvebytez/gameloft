'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import { useUsers, useCreateUser, User } from '@/app/hooks/useUsers';

const roleOptions = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

export default function CreateUserPage() {
  const [formData, setFormData] = useState({
    role: 'user',
    name: '',
    email: '',
    mobile: '',
    password: '',
    commission: '',
    partnership: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch users from API
  const { data: users = [], isLoading, error } = useUsers();
  const createUserMutation = useCreateUser();

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

    // Validation - only mandatory fields
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
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.commission.trim()) {
      newErrors.commission = 'Commission is required';
    } else if (isNaN(Number(formData.commission)) || Number(formData.commission) < 0 || Number(formData.commission) > 100) {
      newErrors.commission = 'Commission must be a number between 0 and 100';
    }
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
      // Call the mutation
      await createUserMutation.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim() || null,
        password: formData.password,
        role: formData.role,
        commission: Number(formData.commission),
        partnership: Number(formData.partnership),
      });

      // Reset form after successful save
      setFormData({
        role: 'user',
        name: '',
        email: '',
        mobile: '',
        password: '',
        commission: '',
        partnership: '',
      });
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Error creating user:', error);
    }
  };

  const handleReset = () => {
    setFormData({
      role: 'user',
      name: '',
      email: '',
      mobile: '',
      password: '',
      commission: '',
      partnership: '',
    });
    setErrors({});
    toast.success('Form reset', { duration: 2000 });
  };

  // Transform users data for DataTable display
  const transformedUsers = users.map((user) => ({
    id: user.id,
    userRole: user.role.charAt(0).toUpperCase() + user.role.slice(1),
    name: user.name,
    mobile: user.mobile || '-',
    commission: `${user.commission}%`,
    partnership: `${user.partnership}%`,
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

  const handleEdit = (user: typeof transformedUsers[0]) => {
    toast.success(`Editing user: ${user.name}`, { duration: 2000 });
    // Handle edit logic here - in future will navigate to edit page or open modal
    console.log('Edit user:', user);
  };

  const handleDelete = (user: typeof transformedUsers[0]) => {
    if (confirm(`Are you sure you want to delete user ${user.name}?`)) {
      // TODO: Implement delete mutation when backend endpoint is available
      toast.error('Delete functionality not yet implemented', { duration: 2000 });
    }
  };

  const handleRowSelect = (selectedRows: typeof transformedUsers) => {
    console.log('Selected rows:', selectedRows);
    // Handle row selection logic here
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Users</h1>
        <p className="text-sm text-[var(--retro-dark)]/60 mt-1">Create</p>
      </div>
      <Card>
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Row 1 */}
            <Select
              label="Roles*"
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              options={roleOptions}
              error={errors.role}
            />
            <Input
              type="text"
              label="Name*"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
            />
            <Input
              type="email"
              label="Email*"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
            />

            {/* Row 2 */}
            <Input
              type="tel"
              label="Mobile"
              id="mobile"
              value={formData.mobile}
              onChange={(e) => handleInputChange('mobile', e.target.value)}
            />
            <Input
              type="password"
              label="Password*"
              id="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              error={errors.password}
            />
            <Input
              type="text"
              label="Commission*"
              id="commission"
              value={formData.commission}
              onChange={(e) => handleInputChange('commission', e.target.value)}
              error={errors.commission}
            />

            {/* Row 3 */}
            <Input
              type="text"
              label="Partnership*"
              id="partnership"
              value={formData.partnership}
              onChange={(e) => handleInputChange('partnership', e.target.value)}
              error={errors.partnership}
            />

            {/* Action Buttons - Same Row, Right Aligned */}
            <div className="col-span-2 flex justify-end gap-4 items-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={createUserMutation.isPending}
                className="px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createUserMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 bg-red-500 text-white font-bold text-lg rounded hover:opacity-90 transition-opacity"
              >
                Reset
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
              <p className="text-[var(--retro-dark)]/60">Loading users...</p>
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
              onRowSelect={handleRowSelect}
              entriesPerPageOptions={[10, 25, 50, 100]}
              defaultEntriesPerPage={100}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

