import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import { AxiosError } from 'axios';

export interface Entry {
  id: number;
  match_id: number;
  user_scope: 'all' | 'customer';
  user_id: number | null;
  customer: string;
  favourite_team: 'team1' | 'team2';
  team1_rate: number | null;
  team1_amount: number | null;
  team2_rate: number | null;
  team2_amount: number | null;
  team1Fav: string;
  team1Nfav: string;
  team2Fav: string;
  team2Nfav: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  match_name?: string;
}

export interface CreateEntryPayload {
  match_id: number;
  user_scope: 'all' | 'customer';
  user_id?: number | null;
  favourite_team: 'team1' | 'team2';
  team1_rate?: number | null;
  team1_amount?: number | null;
  team2_rate?: number | null;
  team2_amount?: number | null;
}

export interface UpdateEntryPayload {
  user_id?: number | null;
  favourite_team?: 'team1' | 'team2';
  team1_rate?: number | null;
  team1_amount?: number | null;
  team2_rate?: number | null;
  team2_amount?: number | null;
}

/**
 * Fetch entries for a specific match
 * @param matchId - The match ID
 * @param userId - Optional user ID to filter entries. Pass 'all' or undefined to get all entries.
 */
export function useEntries(matchId: string | number | undefined, userId?: string | number | 'all') {
  return useQuery({
    queryKey: ['entries', matchId, userId],
    queryFn: async () => {
      if (!matchId) return { success: true, data: [] };

      // Build query URL with optional user_id parameter
      let url = `/v1/admin/matches/${matchId}/entries`;
      if (userId && userId !== 'all') {
        url += `?user_id=${userId}`;
      }

      const response = await api.get(url);

      if (response.data.success) {
        return response.data;
      }
      throw new Error('Failed to fetch entries');
    },
    enabled: !!matchId,
    staleTime: 30000, // Consider data fresh for 30 seconds to reduce unnecessary refetches
    gcTime: 300000, // Keep in cache for 5 minutes
  });
}

/**
 * Fetch a single entry by ID
 */
export function useEntry(entryId: string | number | undefined) {
  return useQuery({
    queryKey: ['entry', entryId],
    queryFn: async () => {
      if (!entryId) return null;

      const response = await api.get(`/v1/admin/entries/${entryId}`);

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch entry');
    },
    enabled: !!entryId,
  });
}

/**
 * Create a new entry
 */
export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateEntryPayload) => {
      const response = await api.post('/v1/admin/entries', payload);

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to create entry');
    },
    onSuccess: (data) => {
      // Invalidate entries query for the match (handle both string and number match_id)
      const matchId = data.match_id;
      queryClient.invalidateQueries({ queryKey: ['entries', String(matchId)] });
      queryClient.invalidateQueries({ queryKey: ['entries', matchId] });
      // Also refetch to ensure immediate update
      queryClient.refetchQueries({ queryKey: ['entries', String(matchId)] });
      queryClient.refetchQueries({ queryKey: ['entries', matchId] });
      console.log('✅ Entry created successfully');
    },
    onError: (error: AxiosError<any>) => {
      let errorMessage = 'Failed to create entry';
      
      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      }
      // Handle rate limiting
      else if (error.response?.status === 429) {
        errorMessage = error.response?.data?.message || 'Too many requests. Please wait a moment before trying again.';
      }
      // Handle network errors
      else if (error.code === 'ERR_NETWORK' || !error.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      // Handle authentication errors
      else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      }
      // Handle validation errors
      else if (error.response?.status === 422) {
        errorMessage = error.response?.data?.message || 'Validation failed. Please check your input.';
      }
      // Handle other errors
      else {
        errorMessage = error.response?.data?.message || error.message || 'Failed to create entry';
      }
      
      console.error('❌', errorMessage);
      // Don't throw - let React Query handle the error state properly
      console.error('Create entry error:', error);
    },
  });
}

/**
 * Update an entry
 */
export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateEntryPayload;
    }) => {
      const response = await api.put(`/v1/admin/entries/${id}`, payload);

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to update entry');
    },
    onSuccess: (data) => {
      // Invalidate entries query for the match (handle both string and number match_id)
      const matchId = data.match_id;
      queryClient.invalidateQueries({ queryKey: ['entries', String(matchId)] });
      queryClient.invalidateQueries({ queryKey: ['entries', matchId] });
      queryClient.invalidateQueries({ queryKey: ['entry', data.id] });
      // Also refetch to ensure immediate update
      queryClient.refetchQueries({ queryKey: ['entries', String(matchId)] });
      queryClient.refetchQueries({ queryKey: ['entries', matchId] });
      console.log('✅ Entry updated successfully');
    },
    onError: (error: AxiosError<any>) => {
      let errorMessage = 'Failed to update entry';
      
      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      }
      // Handle rate limiting
      else if (error.response?.status === 429) {
        errorMessage = error.response?.data?.message || 'Too many requests. Please wait a moment before trying again.';
      }
      // Handle network errors
      else if (error.code === 'ERR_NETWORK' || !error.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      // Handle authentication errors
      else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      }
      // Handle validation errors
      else if (error.response?.status === 422) {
        errorMessage = error.response?.data?.message || 'Validation failed. Please check your input.';
      }
      // Handle other errors
      else {
        errorMessage = error.response?.data?.message || error.message || 'Failed to update entry';
      }
      
      console.error('❌', errorMessage);
      // Don't throw - let React Query handle the error state properly
      console.error('Update entry error:', error);
    },
  });
}

/**
 * Delete an entry
 */
export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/v1/admin/entries/${id}`);

      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to delete entry');
    },
    onSuccess: () => {
      // Invalidate all entries queries
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      console.log('✅ Entry deleted successfully');
    },
    onError: (error: AxiosError<any>) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to delete entry';
      console.error('❌', errorMessage);
      throw new Error(errorMessage);
    },
  });
}

