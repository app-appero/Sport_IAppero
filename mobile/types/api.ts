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

/**
 * In-progress snapshot of a match: tennis fills games per set, current game and server;
 * football can fill `minute`. Every field beyond `is_live` is optional for the live feed.
 */
export interface LiveState {
  is_live: boolean;
  /** Football: elapsed minute (e.g. 63). */
  minute?: number | null;
  /** Games per set as [home, away], in play order. */
  sets: number[][];
  current_game: string | null;
  server: 'home' | 'away' | null;
  status_detail: string | null;
}

export interface Event {
  id: string;
  name: string;
  competition: Competition | null;
  start_time: string | null;
  calendar_date?: string | null;
  /** Provider clock "HH:MM", no timezone: only for ordering matches of the same day. */
  local_time?: string | null;
  participants: Participant[];
  status: string | null;
  score?: EventScore | null;
  live?: LiveState | null;
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
  /** True when the provider flags the prediction as less reliable. */
  low_reliability?: boolean | null;
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

export type UserRole = 'user' | 'admin' | 'super_admin';
export type AdminPermission = 'view_users' | 'refresh_data' | 'free_access';

export interface AuthUser {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  /** Absent on sessions saved by older app versions: treated as "user". */
  role?: UserRole;
  permissions?: AdminPermission[];
}

export interface AdminUser {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  role: UserRole;
  permissions: AdminPermission[];
}

export interface AdminUserList {
  total: number;
  limit: number;
  offset: number;
  items: AdminUser[];
}

export interface AdminPermissionInfo {
  key: AdminPermission;
  label: string;
}

export interface AdminPermissionList {
  permissions: AdminPermissionInfo[];
}

export type RefreshStartState = 'started' | 'error';

/** Result of "Aggiorna partita" (super admin): `partial` = the engine updated what it could and reported errors. */
export interface AdminEventRefreshResponse {
  sport: string;
  event_id: string;
  state: 'ok' | 'partial';
  completed: boolean | null;
  errors: Record<string, string>;
}

export interface AdminRefreshResponse {
  started_at: string;
  results: Partial<
    Record<
      SportId,
      { state: RefreshStartState; ref: string | null; message: string | null; code?: string | null }
    >
  >;
}

export type RefreshRunState = 'queued' | 'running' | 'success' | 'failed' | 'unknown';

export type AdminRefreshStatus = Partial<
  Record<SportId, { state: RefreshRunState; detail: string | null; progress?: number | null }>
>;

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

/** Yellow-card ("gialli") market: same shape as scorers, `booked` instead of `scored`. */
export interface BookingPlayer {
  player_id: number | string;
  name: string;
  team_id: number;
  team: string;
  position: ScorerPosition;
  /** Probability of getting at least one yellow card, 0..1. */
  probability: number;
  /** Final result: true/false once the match is over, null before. */
  booked: boolean | null;
}

export interface BookingTeam {
  team_id: number;
  team: string;
  top: BookingPlayer[];
  players: BookingPlayer[];
}

export interface EventBookingsResponse {
  event_id: string;
  available: boolean;
  status?: ScorersStatus;
  note: string;
  kickoff: string | null;
  model_version: string | null;
  lineup_type: string | null;
  teams: BookingTeam[];
}
