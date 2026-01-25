'use client';

import { useEffect } from 'react';
import { useLogout } from '@/app/hooks/useLogout';
import Card from '@/app/components/ui/Card';

export default function LogoutPage() {
  const logout = useLogout(true); // true = isSuperAdmin

  useEffect(() => {
    // Automatically logout when page loads
    logout.mutate();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-retro-dark mx-auto"></div>
          <p className="text-lg font-semibold text-retro-dark">Logging out...</p>
          <p className="text-sm text-gray-600">Please wait while we log you out.</p>
        </div>
      </Card>
    </div>
  );
}
