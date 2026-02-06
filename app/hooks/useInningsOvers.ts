'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

export interface InningsOver {
  id: number;
  inning: number;
  over: number;
  created_at: string;
  updated_at: string;
}

interface CreateInningsOverPayload {
  inning: number;
  over: number;
}

interface UpdateInningsOverPayload {
  inning?: number;
  over?: number;
}

// Query key factory
export const inningsOverKeys = {
  all: ['innings-overs'] as const,
  lists: () => [...inningsOverKeys.all, 'list'] as const,
  list: () => [...inningsOverKeys.lists()] as const,
  details: () => [...inningsOverKeys.all, 'detail'] as const,
  detail: (id: number) => [...inningsOverKeys.details(), id] as const,
};

// Fetch all innings/overs
export function useInningsOvers() {
  return useQuery({
    queryKey: inningsOverKeys.list(),
    queryFn: async (): Promise<InningsOver[]> => {
      try {
        const response = await api.get('/v1/admin/innings-overs', {
          timeout: 10000,
        });
        
        console.log('Innings/Overs API Response:', response.data);
        
        if (response.data.success) {
          const inningsOvers = response.data.data || [];
          console.log('Innings/Overs data:', inningsOvers);
          return inningsOvers;
        }
        
        return [];
      } catch (error) {
        console.error('Failed to fetch innings/overs:', error);
        return [];
      }
    },
  });
}

// Create innings/over mutation
export function useCreateInningsOver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInningsOverPayload): Promise<InningsOver> => {
      try {
        const response = await api.post('/v1/admin/innings-overs', payload);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error(response.data.message || 'Failed to create innings/over');
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        
        throw new Error(axiosError.response?.data?.message || 'Failed to create innings/over');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch innings/overs list
      queryClient.invalidateQueries({ queryKey: inningsOverKeys.list() });
      toast.success('Innings/Over created successfully!');
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create innings/over');
    },
  });
}

// Update innings/over mutation
export function useUpdateInningsOver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateInningsOverPayload }): Promise<InningsOver> => {
      try {
        const response = await api.put(`/v1/admin/innings-overs/${id}`, payload);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error(response.data.message || 'Failed to update innings/over');
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        
        throw new Error(axiosError.response?.data?.message || 'Failed to update innings/over');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch innings/overs list
      queryClient.invalidateQueries({ queryKey: inningsOverKeys.list() });
      toast.success('Innings/Over updated successfully!');
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update innings/over');
    },
  });
}

// Delete innings/over mutation
export function useDeleteInningsOver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      try {
        const response = await api.delete(`/v1/admin/innings-overs/${id}`);
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete innings/over');
        }
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(axiosError.response?.data?.message || 'Failed to delete innings/over');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch innings/overs list
      queryClient.invalidateQueries({ queryKey: inningsOverKeys.list() });
      toast.success('Innings/Over deleted successfully!');
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete innings/over');
    },
  });
}

