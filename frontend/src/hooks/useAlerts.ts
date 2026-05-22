import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../services/api';

export interface Alert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  active: boolean;
  createdAt: string;
}

export function useAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAll() as Promise<Alert[]>,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { symbol: string; targetPrice: number; condition: 'above' | 'below' }) =>
      alertsApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
