import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  isFavorite,
  listFavorites,
  removeFavorite,
  toggleFavorite,
  type FavoritePrediction,
} from '@/services/favorites';
import type { UnifiedPrediction } from '@/types/api';

const LIST_KEY = ['favorites'] as const;

export function useFavorites() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: listFavorites,
  });
}

export function useIsFavorite(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => isFavorite(id),
    enabled: Boolean(id),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: UnifiedPrediction) => toggleFavorite(item),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeFavorite(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export type { FavoritePrediction };
