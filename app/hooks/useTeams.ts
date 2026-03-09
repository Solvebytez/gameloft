'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import { AxiosError } from 'axios';

export interface Team {
  id: number;
  name: string;
  logo: string | null;
  status?: 'active' | 'inactive';
  logo_image?: {
    id: number;
    file_path: string;
    file_name: string;
    mime_type: string;
    file_size: number;
    url: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface CreateTeamPayload {
  name: string;
  logo: File;
}

interface UpdateTeamPayload {
  name?: string;
  logo?: File;
}

// Query key factory
export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: () => [...teamKeys.lists()] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: number) => [...teamKeys.details(), id] as const,
};

// Fetch all teams
export function useTeams() {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: async (): Promise<Team[]> => {
      try {
        console.log('🔍 Attempting to fetch teams from:', `${api.defaults.baseURL}/v1/admin/teams`);
        
        const response = await api.get('/v1/admin/teams', {
          timeout: 10000, // 10 second timeout
        });
        
        console.log('📥 Teams API Response:', response.data);
        console.log('📥 Response status:', response.status);
        
        if (response.data.success) {
          // Return empty array if data is null/undefined, otherwise return the data array
          return Array.isArray(response.data.data) ? response.data.data : [];
        }
        
        // If success is false, check if it's an empty result or actual error
        if (response.status === 200 && response.data.data === null) {
          return [];
        }
        
        throw new Error(response.data.message || 'Failed to fetch teams');
      } catch (error: unknown) {
        console.error('❌ Error fetching teams:', error);
        
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
        
        throw error instanceof Error ? error : new Error('Failed to fetch teams');
      }
    },
  });
}

// Create team mutation with file upload
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTeamPayload): Promise<Team> => {
      try {
        console.log('🔍 Creating team with payload:', { name: payload.name, logo: payload.logo.name });
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('name', payload.name);
        formData.append('logo', payload.logo);
        
        const response = await api.post('/v1/admin/teams', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        console.log('📥 Create team response:', response.data);
        if (response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to create team');
      } catch (error: unknown) {
        console.error('❌ Error creating team:', error);
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
    onMutate: async (newTeam) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: teamKeys.list() });

      // Snapshot previous value
      const previousTeams = queryClient.getQueryData<Team[]>(teamKeys.list());

      // Optimistically update cache
      const optimisticTeam: Team = {
        id: Date.now(), // Temporary ID
        name: newTeam.name,
        logo: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Team[]>(teamKeys.list(), (old = []) => [
        optimisticTeam,
        ...old,
      ]);

      return { previousTeams };
    },
    onError: (err, newTeam, context) => {
      // Rollback on error
      if (context?.previousTeams) {
        queryClient.setQueryData(teamKeys.list(), context.previousTeams);
      }
      console.error(err instanceof Error ? err.message : 'Failed to create team');
    },
    onSuccess: () => {
      console.log('Team created successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  });
}

// Update team mutation
export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateTeamPayload }): Promise<Team> => {
      try {
        console.log('🔍 Updating team:', id, payload);
        
        // Create FormData for file upload if logo is provided
        const formData = new FormData();
        
        if (payload.name) {
          formData.append('name', payload.name);
        }
        if (payload.logo && payload.logo instanceof File) {
          formData.append('logo', payload.logo);
        }
        
        // Use POST with _method=PUT for file uploads (Laravel method spoofing)
        // PUT requests don't work with multipart/form-data in PHP/Laravel
        formData.append('_method', 'PUT');
        
        const response = await api.post(`/v1/admin/teams/${id}`, formData);
        
        console.log('📥 Update team response:', response.data);
        if (response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to update team');
      } catch (error: unknown) {
        console.error('❌ Error updating team:', error);
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
    onError: (err) => {
      console.error(err instanceof Error ? err.message : 'Failed to update team');
    },
    onSuccess: () => {
      console.log('Team updated successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  });
}

// Delete team mutation
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      try {
        console.log('🔍 Deleting team:', id);
        const response = await api.delete(`/v1/admin/teams/${id}`);
        console.log('📥 Delete team response:', response.data);
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete team');
        }
      } catch (error: unknown) {
        console.error('❌ Error deleting team:', error);
        if (error instanceof AxiosError) {
          console.error('❌ Error response data:', error.response?.data);
          console.error('❌ Error response status:', error.response?.status);
        }
        throw error;
      }
    },
    onError: (err) => {
      console.error(err instanceof Error ? err.message : 'Failed to delete team');
    },
    onSuccess: () => {
      console.log('Team deleted successfully!');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  });
}

// Update team status mutation
interface UpdateTeamStatusPayload {
  teamId: number;
  status: 'active' | 'inactive';
}

export function useUpdateTeamStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateTeamStatusPayload): Promise<Team> => {
      try {
        console.log('🔍 Updating team status:', payload);
        const response = await api.patch(`/v1/admin/teams/${payload.teamId}/status`, {
          status: payload.status,
        });
        console.log('📥 Update team status response:', response.data);
        if (response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to update team status');
      } catch (error: unknown) {
        console.error('❌ Error updating team status:', error);
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
      await queryClient.cancelQueries({ queryKey: teamKeys.list() });

      // Snapshot previous value
      const previousTeams = queryClient.getQueryData<Team[]>(teamKeys.list());

      // Optimistically update cache
      queryClient.setQueryData<Team[]>(teamKeys.list(), (old = []) =>
        old.map((team) =>
          team.id === payload.teamId
            ? { ...team, status: payload.status }
            : team
        )
      );

      return { previousTeams };
    },
    onError: (err, payload, context) => {
      // Rollback on error
      if (context?.previousTeams) {
        queryClient.setQueryData(teamKeys.list(), context.previousTeams);
      }
      console.error(err instanceof Error ? err.message : 'Failed to update team status');
    },
    onSuccess: (data, payload) => {
      console.log(`Team status changed to ${payload.status} successfully!`);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  });
}

