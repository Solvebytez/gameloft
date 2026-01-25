'use client';

import { useEffect } from 'react';
import { useLogout } from '@/app/hooks/useLogout';
import Card from '@/app/components/ui/Card';

export default function LogoutPage() {
  const logoutMutation = useLogout(false); // false = admin logout

  useEffect(() => {
    logoutMutation.mutate();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Logging out...</h1>
        {logoutMutation.isError && (
          <p className="text-red-500 mt-2">
            Error during logout: {logoutMutation.error?.message || 'Unknown error'}
          </p>
        )}
      </Card>
    </div>
  );
}

