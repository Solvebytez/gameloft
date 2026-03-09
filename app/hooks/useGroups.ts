'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import { AxiosError } from 'axios';

export interface Group {
  id: number;
  name: string;
  total_commission: number;
  created_by: number;
  creator: {
    id: number;
    name: string;
    email: string;
  } | null;
  users: Array<{
    id: number;
    name: string;
    role: string;
    status: string;
  }>;
  user_count?: number;
  created_at: string;
  updated_at: string;
}

interface CreateGroupPayload {
  name: string;
  user_ids?: number[];
}

interface UpdateGroupPayload {
  name?: string;
  user_ids?: number[];
}

// Query key factory
export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: () => [...groupKeys.lists()] as const,
  details: () => [...groupKeys.all, 'detail'] as const,
  detail: (id: number) => [...groupKeys.details(), id] as const,
};

// Fetch all groups
export function useGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: async (): Promise<Group[]> => {
      try {
        const response = await api.get('/v1/admin/groups', {
          timeout: 10000,
        });
        
        if (response.data.success) {
          const groups = response.data.data || [];
          return groups;
        }
        
        return [];
      } catch (error) {
        console.error('Failed to fetch groups:', error);
        return [];
      }
    },
  });
}

// Create group mutation
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGroupPayload): Promise<Group> => {
      try {
        const response = await api.post('/v1/admin/groups', payload);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error(response.data.message || 'Failed to create group');
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        
        throw new Error(axiosError.response?.data?.message || 'Failed to create group');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: groupKeys.list() });
      console.log('Group created successfully!');
    },
    onError: (err: Error) => {
      console.error(err instanceof Error ? err.message : 'Failed to create group');
    },
  });
}

// Update group mutation
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateGroupPayload }): Promise<Group> => {
      try {
        const response = await api.put(`/v1/admin/groups/${id}`, payload);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error(response.data.message || 'Failed to update group');
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        
        throw new Error(axiosError.response?.data?.message || 'Failed to update group');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: groupKeys.list() });
      console.log('Group updated successfully!');
    },
    onError: (err: Error) => {
      console.error(err instanceof Error ? err.message : 'Failed to update group');
    },
  });
}

// Delete group mutation
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      try {
        const response = await api.delete(`/v1/admin/groups/${id}`);
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete group');
        }
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(axiosError.response?.data?.message || 'Failed to delete group');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: groupKeys.list() });
      console.log('Group deleted successfully!');
    },
    onError: (err: Error) => {
      console.error(err instanceof Error ? err.message : 'Failed to delete group');
    },
  });
}

