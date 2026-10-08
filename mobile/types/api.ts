export type SportId = 'football' | 'tennis';

export interface Competition {
  id: string | null;
  name: string;
}

export interface Participant {
  id: string | null;
  name: string;
  role: string | null;
}

export interface Event {
  id: string;
  name: string;
  competition: Competition | null;
  start_time: string | null;
  participants: Participant[];
  status: string | null;
}

export interface Selection {
  id: string | null;
  name: string;
}

export interface PredictionValue {
  type: string;
  selection: Selection;
  confidence: number | null;
}

export interface Probability {
  key: string;
  label: string;
  value: number;
}

export interface ProviderMetadata {
  name: string;
  version: string | null;
}

export interface UnifiedPrediction {
  id: string;
  sport: SportId | string;
  event: Event;
  prediction: PredictionValue;
  probabilities: Probability[];
  provider: ProviderMetadata;
  oracle_score: number | null;
  generated_at: string | null;
}

export interface ListMeta {
  count: number;
  sport: string;
  provider: string;
  provider_status: string;
}

export interface PredictionListResponse {
  items: UnifiedPrediction[];
  meta: ListMeta;
}

export interface EventListResponse {
  items: Event[];
  meta: ListMeta;
}

export interface CompetitionListResponse {
  items: Competition[];
  meta: ListMeta;
}

export interface MarketInfo {
  key: string;
  name: string;
  sport: string;
  provider: string;
}

export interface MarketListResponse {
  items: MarketInfo[];
  meta: ListMeta;
}

export interface SportInfo {
  id: SportId | string;
  name: string;
  provider: string;
  enabled: boolean;
}
