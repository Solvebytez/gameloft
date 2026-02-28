'use client';

import { useCurrentSuperAdmin } from '@/app/hooks/useSuperAdmin';

export default function SuperAdminPage() {
  const { data: currentAdmin, isLoading } = useCurrentSuperAdmin();
  const displayName = currentAdmin?.name || 'Super Admin';

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-[#2d2d2d]">
        Welcome to Dashboard, {isLoading ? '...' : displayName}
      </h2>
    </div>
  );
}

