'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';

export type ReportType = 'match' | 'session';

export interface ReportRowSelectionContext {
  report_type: ReportType;
  match_id: number;
  selection_type?: string;
  selected_group_id?: number;
  inning_over?: string;
  winning_team_id?: number;
}

export interface ToggleReportRowSelectionPayload extends ReportRowSelectionContext {
  selected_user_id: number;
  is_selected: boolean;
  match_date?: string;
}

export interface SyncReportRowSelectionsPayload extends ReportRowSelectionContext {
  selected_user_ids: number[];
  match_date?: string;
}

export const reportRowSelectionKeys = {
  all: ['report-row-selections'] as const,
  list: (context?: Partial<ReportRowSelectionContext>) =>
    [
      ...reportRowSelectionKeys.all,
      'list',
      context?.report_type || '',
      context?.match_id || 0,
      context?.selection_type || '',
      context?.selected_group_id || 0,
      context?.inning_over || '',
      context?.winning_team_id || 0,
    ] as const,
};

export function useReportRowSelections(
  context: ReportRowSelectionContext | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: reportRowSelectionKeys.list(context || undefined),
    queryFn: async (): Promise<number[]> => {
      if (!context) return [];

      const response = await api.get('/v1/admin/report-row-selections', {
        params: context,
        timeout: 10000,
      });

      if (response.data?.success) {
        return (response.data?.data?.selected_user_ids || []).map((id: unknown) => Number(id));
      }

      return [];
    },
    enabled: enabled && !!context,
    staleTime: 15000,
    gcTime: 300000,
  });
}

export function useToggleReportRowSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ToggleReportRowSelectionPayload) => {
      const response = await api.post('/v1/admin/report-row-selections/toggle', payload);
      return response.data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: reportRowSelectionKeys.all });
    },
  });
}

export function useSyncReportRowSelections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SyncReportRowSelectionsPayload) => {
      const response = await api.post('/v1/admin/report-row-selections/sync', payload);
      return response.data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: reportRowSelectionKeys.all });
    },
  });
}

