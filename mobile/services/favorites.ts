import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UnifiedPrediction } from '@/types/api';

const STORAGE_KEY = 'sport_iappero.favorites.v1';

export type FavoritePrediction = Pick<
  UnifiedPrediction,
  'id' | 'sport' | 'event' | 'prediction' | 'provider' | 'generated_at'
> & {
  saved_at: string;
};

async function readAll(): Promise<FavoritePrediction[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as FavoritePrediction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: FavoritePrediction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function listFavorites(): Promise<FavoritePrediction[]> {
  const items = await readAll();
  return items.sort((a, b) => b.saved_at.localeCompare(a.saved_at));
}

export async function isFavorite(id: string): Promise<boolean> {
  const items = await readAll();
  return items.some((item) => item.id === id);
}

export async function saveFavorite(item: UnifiedPrediction): Promise<void> {
  const items = await readAll();
  if (items.some((f) => f.id === item.id)) return;
  const next: FavoritePrediction = {
    id: item.id,
    sport: item.sport,
    event: item.event,
    prediction: item.prediction,
    provider: item.provider,
    generated_at: item.generated_at,
    saved_at: new Date().toISOString(),
  };
  await writeAll([next, ...items]);
}

export async function removeFavorite(id: string): Promise<void> {
  const items = await readAll();
  await writeAll(items.filter((item) => item.id !== id));
}

export async function toggleFavorite(item: UnifiedPrediction): Promise<boolean> {
  const exists = await isFavorite(item.id);
  if (exists) {
    await removeFavorite(item.id);
    return false;
  }
  await saveFavorite(item);
  return true;
}
