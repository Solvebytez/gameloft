import { useMutation } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import toast from 'react-hot-toast';

interface LogoutResponse {
  success: boolean;
  message: string;
}

export function useLogout(isSuperAdmin: boolean = false) {

  return useMutation({
    mutationFn: async (): Promise<LogoutResponse> => {
      const endpoint = isSuperAdmin ? '/v1/superadmin/logout' : '/v1/admin/logout';
      const response = await api.post<LogoutResponse>(endpoint);
      return response.data;
    },
    onSuccess: () => {
      // Clear cookies on client side (backend already clears them)
      if (typeof document !== 'undefined') {
        // Delete cookies
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      
      toast.success('Logged out successfully');
      
      // Redirect to appropriate login page using window.location for full page reload
      const loginPath = isSuperAdmin ? '/superadmin-login' : '/login';
      setTimeout(() => {
        window.location.href = loginPath;
      }, 100);
    },
    onError: (error: unknown) => {
      console.error('Logout error:', error);
      
      // Even if logout fails, clear cookies and redirect
      if (typeof document !== 'undefined') {
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      
      const loginPath = isSuperAdmin ? '/superadmin-login' : '/login';
      // Even on error, redirect to login to prevent being stuck
      setTimeout(() => {
        window.location.href = loginPath;
      }, 100);
    },
  });
}

