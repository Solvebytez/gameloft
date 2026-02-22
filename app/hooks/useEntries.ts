import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import toast from 'react-hot-toast';
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
      toast.success('Entry created successfully');
    },
    onError: (error: AxiosError<any>) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to create entry';
      toast.error(errorMessage);
      throw new Error(errorMessage);
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
      toast.success('Entry updated successfully');
    },
    onError: (error: AxiosError<any>) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to update entry';
      toast.error(errorMessage);
      throw new Error(errorMessage);
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
      toast.success('Entry deleted successfully');
    },
    onError: (error: AxiosError<any>) => {
      const errorMessage =
        error.response?.data?.message || 'Failed to delete entry';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    },
  });
}

