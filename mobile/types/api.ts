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
  calendar_date?: string | null;
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

export interface PricingInfo {
  odds_decimal?: number | null;
  expected_value?: number | null;
  probability_edge?: number | null;
  fair_odds?: number | null;
  bookmakers_count?: number | null;
}

export interface DecisionInfo {
  code?: string | null;
  reason?: string | null;
  policy_version?: string | null;
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
  pricing?: PricingInfo | null;
  decision?: DecisionInfo | null;
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

export type SettlementStatus = 'won' | 'lost' | 'void' | 'pending' | 'not_placed' | 'unknown';

export interface HistoryCounts {
  won: number;
  lost: number;
  void: number;
  pending: number;
  not_placed: number;
  unknown: number;
  total: number;
  /** won + lost: the declared denominator of win_rate. */
  decided: number;
  win_rate: number | null;
}

export interface HistoryGroup extends HistoryCounts {
  sport: string;
  market: string;
  model_name: string | null;
  model_version: string | null;
}

export interface HistoryStats {
  scope: string;
  filters: Record<string, string | null>;
  totals: HistoryCounts;
  groups: HistoryGroup[];
  excluded_not_pre_match: number;
  notes: string[];
}

export interface HistoryPrediction {
  revision_id: number;
  source_ref: string | null;
  sport: string;
  event_id: string;
  event_name: string | null;
  market: string;
  line: string | null;
  selection: string;
  probability: number | null;
  odds: number | null;
  model_name: string | null;
  model_version: string | null;
  decision: string | null;
  kickoff_at: string | null;
  published_at: string | null;
  pre_match: boolean | null;
  settlement: {
    status: SettlementStatus;
    source_status: string | null;
    settled_at: string | null;
    actual_outcome: string | null;
    pnl: number | null;
  };
}

export interface HistoryPredictionList {
  items: HistoryPrediction[];
  limit: number;
  offset: number;
  count: number;
}

export interface AuthUser {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: AuthUser;
}

export type ScorerPosition = 'F' | 'M' | 'D' | string;

export interface ScorerPlayer {
  player_id: number | string;
  name: string;
  team_id: number;
  team: string;
  position: ScorerPosition;
  /** Probability of scoring at least one goal, 0..1. */
  probability: number;
  /** Final result: true/false once the match is over, null before. */
  scored: boolean | null;
}

export interface ScorerTeam {
  team_id: number;
  team: string;
  expected_scorers: number;
  top: ScorerPlayer[];
  players: ScorerPlayer[];
}

export type ScorersStatus = 'ready' | 'lineup_pending' | 'unsupported';

export interface EventScorersResponse {
  event_id: string;
  available: boolean;
  /** `unsupported` = competizione fuori dal mercato marcatori: la sezione non va mostrata. */
  status?: ScorersStatus;
  note: string;
  kickoff: string | null;
  model_version: string | null;
  lineup_type: string | null;
  teams: ScorerTeam[];
}
