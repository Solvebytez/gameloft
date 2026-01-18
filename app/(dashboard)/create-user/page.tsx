'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import DataTable, { Column } from '@/app/components/ui/DataTable';

const roleOptions = [
  { value: 'users', label: 'Users' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

interface User {
  id: number;
  userRole: string;
  name: string;
  mobile: string;
  commission: string;
  partnership: string;
  lastLogin: string;
  status: string;
}

export default function CreateUserPage() {
  const [formData, setFormData] = useState({
    role: 'users',
    name: '',
    email: '',
    mobile: '',
    password: '',
    commission: '',
    partnership: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sample data - In future, this will come from React TanStack Query
  const [users, setUsers] = useState<User[]>([
    {
      id: 11,
      userRole: 'User',
      name: '11',
      mobile: '235689741524',
      commission: '5%',
      partnership: '75%',
      lastLogin: '2026-01-08 13:43:24',
      status: 'Approved',
    },
    {
      id: 12,
      userRole: 'User',
      name: '12',
      mobile: '8956457896',
      commission: '5%',
      partnership: '50%',
      lastLogin: '2026-01-08 14:20:15',
      status: 'Approved',
    },
    {
      id: 14,
      userRole: 'User',
      name: '14',
      mobile: '9876543210',
      commission: '5%',
      partnership: '20%',
      lastLogin: '2026-01-08 15:30:45',
      status: 'Approved',
    },
    {
      id: 15,
      userRole: 'User',
      name: '15',
      mobile: '1234567890',
      commission: '5%',
      partnership: '00%',
      lastLogin: '2026-01-08 16:15:30',
      status: 'Approved',
    },
    {
      id: 17,
      userRole: 'User',
      name: '17',
      mobile: '5551234567',
      commission: '5%',
      partnership: '25%',
      lastLogin: '2026-01-08 17:45:12',
      status: 'Approved',
    },
    {
      id: 23,
      userRole: 'User',
      name: '23',
      mobile: '9998887776',
      commission: '5%',
      partnership: '60%',
      lastLogin: '2026-01-08 18:20:33',
      status: 'Approved',
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

  const handleSave = () => {
    const newErrors: Record<string, string> = {};

    // Validation - only mandatory fields
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }
    if (!formData.commission.trim()) {
      newErrors.commission = 'Commission is required';
    }
    if (!formData.partnership.trim()) {
      newErrors.partnership = 'Partnership is required';
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
    toast.success('User created successfully!', { duration: 3000 });
    
    // Add new user to the table (in future, this will be handled by TanStack Query mutation)
    const newUser: User = {
      id: Date.now(), // Temporary ID generation
      userRole: formData.role,
      name: formData.name,
      mobile: formData.mobile || '-',
      commission: formData.commission + '%',
      partnership: formData.partnership + '%',
      lastLogin: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 'Approved',
    };
    setUsers((prev) => [newUser, ...prev]);

    // Reset form after successful save
    setFormData({
      role: 'users',
      name: '',
      email: '',
      mobile: '',
      password: '',
      commission: '',
      partnership: '',
    });
    
    // Handle save logic here
    console.log('Form data:', formData);
  };

  const handleReset = () => {
    setFormData({
      role: 'users',
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

  // DataTable columns configuration
  const columns: Column<User>[] = [
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
        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
          {value}
        </span>
      ),
    },
  ];

  const handleEdit = (user: User) => {
    toast.success(`Editing user: ${user.name}`, { duration: 2000 });
    // Handle edit logic here - in future will navigate to edit page or open modal
    console.log('Edit user:', user);
  };

  const handleDelete = (user: User) => {
    if (confirm(`Are you sure you want to delete user ${user.name}?`)) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success(`User ${user.name} deleted successfully`, { duration: 2000 });
    }
  };

  const handleRowSelect = (selectedRows: User[]) => {
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
              label="Email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
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
          </div>
        </form>
      </Card>

      {/* DataTable below the form */}
      <Card>
        <div className="p-4">
          <DataTable
            title="List"
            data={users}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRowSelect={handleRowSelect}
            entriesPerPageOptions={[10, 25, 50, 100]}
            defaultEntriesPerPage={100}
          />
        </div>
      </Card>
    </div>
  );
}

