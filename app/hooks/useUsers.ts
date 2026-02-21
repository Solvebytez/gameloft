'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

export interface User {
  id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  role: string;
  commission: number;
  partnership: number;
  commission_type: 'no_commission' | 'profit_loss' | 'entrywise';
  session_commission?: number;
  session_commission_type?: 'no_commission' | 'profit_loss' | 'entrywise';
  last_login: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  group_id?: number | null;
  groups?: Array<{
    id: number;
    name: string;
  }>;
  mark_as_cut?: 'no' | 'yes';
}

export interface CreateUserPayload {
  name: string;
  role: string;
  commission: number;
  partnership: number;
  commission_type: 'no_commission' | 'profit_loss' | 'entrywise';
  session_commission: number;
  session_commission_type: 'no_commission' | 'profit_loss' | 'entrywise';
  group_id?: number | null;
  mark_as_cut?: 'no' | 'yes';
}

interface UpdateUserPayload {
  name?: string;
  role?: string;
  commission?: number;
  partnership?: number;
  commission_type?: 'no_commission' | 'profit_loss' | 'entrywise';
  session_commission?: number;
  session_commission_type?: 'no_commission' | 'profit_loss' | 'entrywise';
  group_id?: number | null;
  mark_as_cut?: 'no' | 'yes';
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
        email: null,
        mobile: null,
        role: newUser.role,
        commission: newUser.commission,
        partnership: newUser.partnership,
        commission_type: newUser.commission_type,
        session_commission: newUser.session_commission,
        session_commission_type: newUser.session_commission_type,
        last_login: null,
        status: 'active', // Default status
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mark_as_cut: newUser.mark_as_cut ?? 'no',
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

// Update user mutation
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateUserPayload }): Promise<User> => {
      try {
        console.log('🔍 Updating user:', id, payload);
        const response = await api.put(`/v1/admin/users/${id}`, payload);
        console.log('📥 Update user response:', response.data);
        if (response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to update user');
      } catch (error: unknown) {
        console.error('❌ Error updating user:', error);
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
    onMutate: async ({ id, payload }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.list() });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<User[]>(userKeys.list());

      // Optimistically update cache
      queryClient.setQueryData<User[]>(userKeys.list(), (old = []) =>
        old.map((user) =>
          user.id === id
            ? { ...user, ...payload }
            : user
        )
      );

      return { previousUsers };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.list(), context.previousUsers);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
    },
    onSuccess: (data) => {
      // Update cache with the returned data from server
      queryClient.setQueryData<User[]>(userKeys.list(), (old = []) =>
        old.map((user) =>
          user.id === data.id
            ? { ...user, ...data }
            : user
        )
      );
      toast.success('User updated successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.list() });
    },
  });
}

// Update user status mutation
interface UpdateUserStatusPayload {
  userId: number;
  status: 'active' | 'inactive';
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateUserStatusPayload): Promise<User> => {
      try {
        console.log('🔍 Updating user status:', payload);
        const response = await api.patch(`/v1/admin/users/${payload.userId}/status`, {
          status: payload.status,
        });
        console.log('📥 Update user status response:', response.data);
        if (response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to update user status');
      } catch (error: unknown) {
        console.error('❌ Error updating user status:', error);
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
    onMutate: async (payload) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.list() });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<User[]>(userKeys.list());

      // Optimistically update cache
      queryClient.setQueryData<User[]>(userKeys.list(), (old = []) =>
        old.map((user) =>
          user.id === payload.userId
            ? { ...user, status: payload.status }
            : user
        )
      );

      return { previousUsers };
    },
    onError: (err, payload, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.list(), context.previousUsers);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update user status');
    },
    onSuccess: (data, payload) => {
      toast.success(`User status changed to ${payload.status} successfully!`);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.list() });
    },
  });
}

// Delete user mutation
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number): Promise<void> => {
      try {
        console.log('🔍 Deleting user:', userId);
        const response = await api.delete(`/v1/admin/users/${userId}`);
        console.log('📥 Delete user response:', response.data);
        if (response.data.success) {
          return;
        }
        throw new Error(response.data.message || 'Failed to delete user');
      } catch (error: unknown) {
        console.error('❌ Error deleting user:', error);
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
    onMutate: async (userId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.list() });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<User[]>(userKeys.list());

      // Optimistically update cache by removing the user
      queryClient.setQueryData<User[]>(userKeys.list(), (old = []) =>
        old.filter((user) => user.id !== userId)
      );

      return { previousUsers };
    },
    onError: (err, userId, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.list(), context.previousUsers);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    },
    onSuccess: (data, userId) => {
      toast.success('User deleted successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.list() });
    },
  });
}

