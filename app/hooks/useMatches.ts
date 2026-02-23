'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

export interface Match {
  id: number;
  team1_id: number;
  team2_id: number;
  team1: {
    id: number;
    name: string;
    logo: string | null;
  };
  team2: {
    id: number;
    name: string;
    logo: string | null;
  };
  match_between: string;
  match_date: string;
  winner_id: number | null;
  winner: {
    id: number;
    name: string;
  } | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface CreateMatchPayload {
  team1_id: number;
  team2_id: number;
  match_date: string; // Format: YYYY-MM-DD
}

interface UpdateMatchPayload {
  team1_id?: number;
  team2_id?: number;
  match_date?: string; // Format: YYYY-MM-DD
}

// Query key factory
export const matchKeys = {
  all: ['matches'] as const,
  lists: () => [...matchKeys.all, 'list'] as const,
  list: () => [...matchKeys.lists()] as const,
  listByDate: (date: string) => [...matchKeys.lists(), 'date', date] as const,
  details: () => [...matchKeys.all, 'detail'] as const,
  detail: (id: number) => [...matchKeys.details(), id] as const,
};

// Fetch all matches
export function useMatches() {
  return useQuery({
    queryKey: matchKeys.list(),
    queryFn: async (): Promise<Match[]> => {
      try {
        const response = await api.get('/v1/admin/matches', {
          timeout: 10000,
        });
        
        if (response.data.success) {
          return response.data.data || [];
        }
        
        return [];
      } catch (error) {
        console.error('Failed to fetch matches:', error);
        return [];
      }
    },
  });
}

// Fetch matches by date
export function useMatchesByDate(date: string | null) {
  return useQuery({
    queryKey: matchKeys.listByDate(date || ''),
    queryFn: async (): Promise<Match[]> => {
      if (!date) {
        return [];
      }
      
      try {
        // Convert dd-mm-yyyy to yyyy-mm-dd for API
        const [day, month, year] = date.split('-');
        const apiDate = `${year}-${month}-${day}`;
        
        const response = await api.get('/v1/admin/matches', {
          params: { date: apiDate },
          timeout: 10000,
        });
        
        if (response.data.success) {
          return response.data.data || [];
        }
        
        return [];
      } catch (error) {
        console.error('Failed to fetch matches by date:', error);
        return [];
      }
    },
    enabled: !!date, // Only run query if date is provided
  });
}

// Fetch a single match by ID
export function useMatch(id: number | string | null) {
  return useQuery({
    queryKey: matchKeys.detail(Number(id)),
    queryFn: async (): Promise<Match | null> => {
      if (!id) {
        return null;
      }
      
      try {
        const response = await api.get(`/v1/admin/matches/${id}`, {
          timeout: 10000,
        });
        
        if (response.data.success) {
          return response.data.data;
        }
        
        return null;
      } catch (error) {
        console.error('Failed to fetch match:', error);
        const axiosError = error as AxiosError<{ message?: string }>;
        if (axiosError.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!id, // Only run query if id is provided
  });
}

// Create match mutation
export function useCreateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateMatchPayload): Promise<Match> => {
      try {
        const response = await api.post('/v1/admin/matches', payload);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error(response.data.message || 'Failed to create match');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        
        throw new Error(axiosError.response?.data?.message || 'Failed to create match');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch matches list
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
      toast.success('Match created successfully!');
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create match');
    },
  });
}

// Update match mutation
export function useUpdateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateMatchPayload }): Promise<Match> => {
      try {
        const response = await api.put(`/v1/admin/matches/${id}`, payload);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error(response.data.message || 'Failed to update match');
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
        
        if (axiosError.response?.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        
        throw new Error(axiosError.response?.data?.message || 'Failed to update match');
      }
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update match');
    },
    onSuccess: () => {
      // Invalidate and refetch matches list
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
      toast.success('Match updated successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
    },
  });
}

// Delete match mutation
export function useDeleteMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      try {
        const response = await api.delete(`/v1/admin/matches/${id}`);
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete match');
        }
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(axiosError.response?.data?.message || 'Failed to delete match');
      }
    },
    onError: (err: Error) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete match');
    },
    onSuccess: () => {
      // Invalidate and refetch matches list
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
      toast.success('Match deleted successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
    },
  });
}

