'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

export interface Session {
  id: number;
  match_id: number;
  match_name: string | null;
  user_id: number;
  user_name: string | null;
  inning_over: string;
  entry_run: number;
  amount: number;
  is_yes: boolean;
  result: number | null;
  net_profit_loss: number;
  created_by: number;
  creator: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface CreateSessionPayload {
  match_id: number;
  user_id: number;
  inning_over: string;
  entry_run: number;
  amount: number;
  is_yes: boolean;
  result?: number | null;
}

interface UpdateSessionPayload {
  match_id?: number;
  user_id?: number;
  inning_over?: string;
  entry_run?: number;
  amount?: number;
  is_yes?: boolean;
  result?: number | null;
}

// Query key factory
export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (matchId?: number | null) => [...sessionKeys.lists(), matchId || 'all'] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (id: number) => [...sessionKeys.details(), id] as const,
};

// Fetch all sessions
export function useSessions(matchId?: number | null) {
  return useQuery({
    queryKey: sessionKeys.list(matchId),
    queryFn: async (): Promise<Session[]> => {
      try {
        const params: { match_id?: number } = {};
        if (matchId) {
          params.match_id = matchId;
        }
        
        const response = await api.get('/v1/admin/sessions', {
          params,
          timeout: 10000,
        });
        
        console.log('Sessions API Response:', response.data);
        
        if (response.data.success) {
          const sessions = response.data.data || [];
          console.log('Sessions data:', sessions);
          return sessions;
        }
        
        return [];
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        return [];
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    cacheTime: 0,
  });
}

// Create session mutation
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSessionPayload): Promise<Session> => {
      try {
        const response = await api.post('/v1/admin/sessions', payload);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error(response.data.message || 'Failed to create session');
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        
        throw new Error(axiosError.response?.data?.message || 'Failed to create session');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch sessions list
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      toast.success('Session entry created successfully!');
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create session entry');
    },
  });
}

// Update session mutation
export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateSessionPayload }): Promise<Session> => {
      try {
        const response = await api.put(`/v1/admin/sessions/${id}`, payload);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error(response.data.message || 'Failed to update session');
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        
        throw new Error(axiosError.response?.data?.message || 'Failed to update session');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch sessions list
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      toast.success('Session entry updated successfully!');
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update session entry');
    },
  });
}

// Delete session mutation
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      try {
        const response = await api.delete(`/v1/admin/sessions/${id}`);
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete session');
        }
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(axiosError.response?.data?.message || 'Failed to delete session');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch sessions list
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      toast.success('Session entry deleted successfully!');
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete session entry');
    },
  });
}

// Update result for all entries matching innings/over
export function useUpdateResultByInningsOver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { inning_over: string; result: number }): Promise<{ updated_count: number; updated_sessions: any[] }> => {
      try {
        const response = await api.post('/v1/admin/sessions/update-result', payload);
        
        if (response.data.success) {
          return {
            updated_count: response.data.data.updated_count,
            updated_sessions: response.data.data.updated_sessions,
          };
        }
        
        throw new Error(response.data.message || 'Failed to update result');
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        
        throw new Error(axiosError.response?.data?.message || 'Failed to update result');
      }
    },
    onSuccess: (data) => {
      // Invalidate and refetch sessions list to show updated results
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      toast.success(`Result updated successfully for ${data.updated_count} entry/entries!`);
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update result');
    },
  });
}

