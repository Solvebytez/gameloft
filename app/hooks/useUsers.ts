'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
  role: string;
  commission: number;
  partnership: number;
  last_login: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface CreateUserPayload {
  name: string;
  email: string;
  mobile?: string | null;
  password: string;
  role: string;
  commission: number;
  partnership: number;
}

// Query key factory
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: () => [...userKeys.lists()] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};

// Fetch all users
export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: async (): Promise<User[]> => {
      try {
        console.log('🔍 Attempting to fetch users from:', `${api.defaults.baseURL}/v1/admin/users`);
        
        const response = await api.get('/v1/admin/users', {
          timeout: 10000, // 10 second timeout
        });
        
        console.log('📥 Users API Response:', response.data);
        console.log('📥 Response status:', response.status);
        
        if (response.data.success) {
          // Return empty array if data is null/undefined, otherwise return the data array
          return Array.isArray(response.data.data) ? response.data.data : [];
        }
        
        // If success is false, check if it's an empty result or actual error
        if (response.status === 200 && response.data.data === null) {
          return [];
        }
        
        throw new Error(response.data.message || 'Failed to fetch users');
      } catch (error: unknown) {
        console.error('❌ Error fetching users:', error);
        
        // Log more details about the error
        if (error && typeof error === 'object') {
          if ('code' in error) {
            console.error('Error code:', error.code);
          }
          if ('message' in error) {
            console.error('Error message:', error.message);
          }
          if (error instanceof AxiosError && error.response) {
            console.error('Error response:', error.response);
            if (error.response.data) {
              console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
            }
          }
          if ('request' in error) {
            console.error('Error request URL:', (error.request as XMLHttpRequest)?.responseURL || 'unknown');
          }
        }
        
        // Handle network errors more gracefully
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'ERR_NETWORK'
        ) {
          throw new Error(
            'Cannot connect to backend server. Please ensure the Laravel backend is running on http://localhost:8000 and check browser console for CORS errors.'
          );
        }
        
        // Handle axios errors
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
        
        throw error instanceof Error ? error : new Error('Failed to fetch users');
      }
    },
  });
}

// Create user mutation with optimistic update
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserPayload): Promise<User> => {
      try {
        console.log('🔍 Creating user with payload:', payload);
        const response = await api.post('/v1/admin/users', payload);
        console.log('📥 Create user response:', response.data);
        if (response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to create user');
      } catch (error: unknown) {
        console.error('❌ Error creating user:', error);
        if (error instanceof AxiosError) {
          console.error('❌ Error response data:', error.response?.data);
          console.error('❌ Error response status:', error.response?.status);
          
          // Handle validation errors
          if (error.response?.status === 422 && error.response?.data?.errors) {
            const errors = error.response.data.errors;
            const firstError = Object.values(errors)[0];
            if (Array.isArray(firstError) && firstError.length > 0) {
              throw new Error(String(firstError[0]));
            }
          }
        }
        throw error;
      }
    },
    onMutate: async (newUser) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.list() });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<User[]>(userKeys.list());

      // Optimistically update cache
      const optimisticUser: User = {
        id: Date.now(), // Temporary ID
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile || null,
        role: newUser.role,
        commission: newUser.commission,
        partnership: newUser.partnership,
        last_login: null,
        status: 'active', // Default status
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<User[]>(userKeys.list(), (old = []) => [
        optimisticUser,
        ...old,
      ]);

      return { previousUsers };
    },
    onError: (err, newUser, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.list(), context.previousUsers);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    },
    onSuccess: () => {
      toast.success('User created successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.list() });
    },
  });
}

