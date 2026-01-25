'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

export interface Admin {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
  role: string;
  status: 'active' | 'inactive';
  commission: number | null;
  partnership: number | null;
  created_at: string;
  updated_at: string;
}

interface CreateAdminPayload {
  name: string;
  email: string;
  mobile?: string | null;
  password: string;
  role: string;
}

interface UpdateAdminPayload {
  name?: string;
  email?: string;
  mobile?: string | null;
  password?: string;
}

// Query key factory
export const adminKeys = {
  all: ['admins'] as const,
  lists: () => [...adminKeys.all, 'list'] as const,
  list: () => [...adminKeys.lists()] as const,
  details: () => [...adminKeys.all, 'detail'] as const,
  detail: (id: number) => [...adminKeys.details(), id] as const,
};

// Fetch all admins
export function useAdmins() {
  return useQuery({
    queryKey: adminKeys.list(),
    queryFn: async (): Promise<Admin[]> => {
      try {
        console.log('🔍 Attempting to fetch admins from:', `${api.defaults.baseURL}/v1/superadmin/admins`);
        
        const response = await api.get('/v1/superadmin/admins', {
          timeout: 10000, // 10 second timeout
        });
        
        console.log('📥 Admins API Response:', response.data);
        console.log('📥 Response status:', response.status);
        
        if (response.data.success) {
          // Return empty array if data is null/undefined, otherwise return the data array
          return Array.isArray(response.data.data) ? response.data.data : [];
        }
        
        // If success is false, check if it's an empty result or actual error
        if (response.status === 200 && response.data.data === null) {
          return [];
        }
        
        throw new Error(response.data.message || 'Failed to fetch admins');
      } catch (error: unknown) {
        console.error('❌ Error fetching admins:', error);
        
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
        
        throw error instanceof Error ? error : new Error('Failed to fetch admins');
      }
    },
  });
}

// Create admin mutation with optimistic update
export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAdminPayload): Promise<Admin> => {
      try {
        console.log('🔍 Creating admin with payload:', payload);
        const response = await api.post('/v1/superadmin/create-admin', payload);
        console.log('📥 Create admin response:', response.data);
        if (response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to create admin');
      } catch (error: unknown) {
        console.error('❌ Error creating admin:', error);
        if (error instanceof AxiosError) {
          console.error('❌ Error response data:', error.response?.data);
          console.error('❌ Error response status:', error.response?.status);
        }
        throw error;
      }
    },
    onMutate: async (newAdmin) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminKeys.list() });

      // Snapshot previous value
      const previousAdmins = queryClient.getQueryData<Admin[]>(adminKeys.list());

      // Optimistically update cache
      const optimisticAdmin: Admin = {
        id: Date.now(), // Temporary ID
        name: newAdmin.name,
        email: newAdmin.email,
        mobile: newAdmin.mobile || null,
        role: newAdmin.role,
        status: 'active', // Default status
        commission: null,
        partnership: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Admin[]>(adminKeys.list(), (old = []) => [
        optimisticAdmin,
        ...old,
      ]);

      return { previousAdmins };
    },
    onError: (err, newAdmin, context) => {
      // Rollback on error
      if (context?.previousAdmins) {
        queryClient.setQueryData(adminKeys.list(), context.previousAdmins);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create admin');
    },
    onSuccess: () => {
      toast.success('Admin created successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: adminKeys.list() });
    },
  });
}

// Update admin mutation with optimistic update
export function useUpdateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & UpdateAdminPayload): Promise<Admin> => {
      const response = await api.put(`/v1/superadmin/admins/${id}`, payload);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to update admin');
    },
    onMutate: async ({ id, ...updatedFields }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminKeys.list() });

      // Snapshot previous value
      const previousAdmins = queryClient.getQueryData<Admin[]>(adminKeys.list());

      // Optimistically update cache
      queryClient.setQueryData<Admin[]>(adminKeys.list(), (old = []) =>
        old.map((admin) =>
          admin.id === id
            ? {
                ...admin,
                ...updatedFields,
                updated_at: new Date().toISOString(),
              }
            : admin
        )
      );

      return { previousAdmins };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousAdmins) {
        queryClient.setQueryData(adminKeys.list(), context.previousAdmins);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update admin');
    },
    onSuccess: () => {
      toast.success('Admin updated successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: adminKeys.list() });
    },
  });
}

// Delete admin mutation with optimistic update
export function useDeleteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await api.delete(`/v1/superadmin/admins/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete admin');
      }
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminKeys.list() });

      // Snapshot previous value
      const previousAdmins = queryClient.getQueryData<Admin[]>(adminKeys.list());

      // Optimistically remove from cache
      queryClient.setQueryData<Admin[]>(adminKeys.list(), (old = []) =>
        old.filter((admin) => admin.id !== id)
      );

      return { previousAdmins };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousAdmins) {
        queryClient.setQueryData(adminKeys.list(), context.previousAdmins);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete admin');
    },
    onSuccess: () => {
      toast.success('Admin deleted successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: adminKeys.list() });
    },
  });
}

// Update admin status
export function useUpdateAdminStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'active' | 'inactive' }) => {
      const response = await api.patch(`/v1/superadmin/admins/${id}/status`, { status });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update admin status');
      }
      return response.data.data;
    },
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminKeys.list() });

      // Snapshot previous value
      const previousAdmins = queryClient.getQueryData<Admin[]>(adminKeys.list());

      // Optimistically update cache
      queryClient.setQueryData<Admin[]>(adminKeys.list(), (old = []) =>
        old.map((admin) => (admin.id === id ? { ...admin, status } : admin))
      );

      return { previousAdmins };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousAdmins) {
        queryClient.setQueryData(adminKeys.list(), context.previousAdmins);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update admin status');
    },
    onSuccess: (data, variables) => {
      toast.success(`Admin status updated to ${variables.status}!`);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: adminKeys.list() });
    },
  });
}

