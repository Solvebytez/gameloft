'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/app/lib/api';

export interface CurrentSuperAdmin {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
  role: string;
  commission: number | null;
  partnership: number | null;
}

export function useCurrentSuperAdmin() {
  return useQuery({
    queryKey: ['currentSuperAdmin'],
    queryFn: async (): Promise<CurrentSuperAdmin> => {
      try {
        console.log('🔍 Fetching current superadmin from /v1/superadmin/me');
        const response = await api.get('/v1/superadmin/me');
        console.log('📥 Current superadmin response:', response.data);
        if (response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch current superadmin');
      } catch (error: unknown) {
        console.error('❌ Error fetching current superadmin:', error);
        if (
          error &&
          typeof error === 'object' &&
          'response' in error &&
          error.response &&
          typeof error.response === 'object' &&
          'data' in error.response &&
          error.response.data &&
          typeof error.response.data === 'object' &&
          'message' in error.response.data
        ) {
          throw new Error(String(error.response.data.message));
        }
        throw error instanceof Error ? error : new Error('Failed to fetch current superadmin');
      }
    },
    retry: false, // Don't retry on 401 errors
  });
}

