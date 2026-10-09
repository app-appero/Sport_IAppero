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

export interface EventScore {
  home?: number | null;
  away?: number | null;
  display?: string | null;
}

export interface Event {
  id: string;
  name: string;
  competition: Competition | null;
  start_time: string | null;
  participants: Participant[];
  status: string | null;
  score?: EventScore | null;
  actual_totals?: Record<string, number | string | null> | null;
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
  correct?: boolean | null;
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

export interface FeedQuery {
  date: string | null;
  timezone: string;
  sports: string[];
  market: string | null;
  competition: string | null;
  sort: string;
  limit: number;
}

export interface FeedPage {
  limit: number;
  next_cursor: string | null;
}

export interface ProviderFeedStatus {
  provider: string;
  status: string;
  item_count: number;
  truncated: boolean;
}

export interface FeedMeta {
  status: string;
  is_complete: boolean;
  providers: ProviderFeedStatus[];
  warnings: string[];
}

export interface FeedItem {
  event: Event;
  predictions: UnifiedPrediction[];
  sport: string;
}

export interface FeedResponse {
  schema_version: string;
  snapshot_id: string;
  generated_at: string;
  query: FeedQuery;
  items: FeedItem[];
  page: FeedPage;
  meta: FeedMeta;
}
