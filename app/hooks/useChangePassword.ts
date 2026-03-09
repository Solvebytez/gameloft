'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import { AxiosError } from 'axios';

interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirmation_password: string;
}

// Change password mutation
export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload): Promise<void> => {
      try {
        const response = await api.post('/v1/admin/change-password', payload);
        
        if (response.data.success) {
          return;
        }
        
        throw new Error(response.data.message || 'Failed to change password');
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        
        throw new Error(axiosError.response?.data?.message || 'Failed to change password');
      }
    },
    onSuccess: () => {
      console.log('✅ Password changed successfully!');
    },
    onError: (err: Error) => {
      console.error('❌', err instanceof Error ? err.message : 'Failed to change password');
    },
  });
}

