'use client';

import { useState } from 'react';
import Card from '@/app/components/ui/Card';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import toast from 'react-hot-toast';

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

export default function UsersPage() {
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
      <h1 className="text-3xl font-bold text-[var(--foreground)]">List</h1>
      <Card>
        <div className="p-4">
          <DataTable
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

