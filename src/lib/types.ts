export interface User {
  id: number;
  name?: string | null;
  email: string;
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCode {
  id: number;
  userId: number;
  code: string;
  expiresAt: string;
  usedAt?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface UserSession {
  id: number;
  userId: number;
  sessionToken: string;
  expiresAt: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface MonitoredRoute {
  id: number;
  userId: number;
  origin: string;
  destination: string;
  flightDate: string;
  returnDate?: string | null;
  tripType?: "one_way" | "round_trip";
  passengers: number; // adults (12+ years)
  children?: number; // children (2-11 years)
  infantsInLap?: number; // infants in lap (< 2 years)
  targetPrice: number;
  intervalHours?: number;
  onlyDirect?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // User info (optional joined fields)
  userName?: string | null;
  userEmail?: string | null;
  // Computed / aggregated fields
  latestPrice?: number | null;
  lowestHistoricalPrice?: number | null;
  lastSearchedAt?: string | null;
  lastAirline?: string | null;
  lastFlightNumber?: string | null;
  lastStops?: number | null;
  lastBookingLink?: string | null;
  lastError?: string | null;
  latestDirectPrice?: number | null;
  latestDirectAirline?: string | null;
  latestStopPrice?: number | null;
  latestStopAirline?: string | null;
  latestStopCount?: number | null;
  totalSearches?: number;
}

export interface FlightHistoryEntry {
  id: number;
  searchedAt: string;
  origin: string;
  destination: string;
  flightDate: string;
  returnDate?: string | null;
  tripType?: "one_way" | "round_trip";
  passengers?: number;
  children?: number;
  infantsInLap?: number;
  lowestPrice: number;
  currency: string;
  routeId: number | null;
  airline?: string | null;
  flightNumber?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  stops?: number | null;
  durationMinutes?: number | null;
  bookingLink?: string | null;
  lowestDirectPrice?: number | null;
  directAirline?: string | null;
  lowestStopPrice?: number | null;
  stopAirline?: string | null;
  stopCount?: number | null;
}

export interface HistoricalPricePoint {
  date: string; // YYYY-MM-DD
  timestampMs?: number;
  price: number;
  currency?: string;
  source?: string;
}

export interface BackfillResult {
  success: boolean;
  routeId: number;
  origin: string;
  destination: string;
  flightDate: string;
  importedCount: number;
  message: string;
  points?: HistoricalPricePoint[];
}

export interface FlightOption {
  origin: string;
  destination: string;
  flightDate: string;
  returnDate?: string | null;
  tripType?: "one_way" | "round_trip";
  passengers?: number;
  children?: number;
  infantsInLap?: number;
  price: number;
  currency: string;
  airline?: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationMinutes?: number;
  stops?: number;
  provider?: string;
  bookingLink?: string;
}

export interface AppSettings {
  scheduleHours: string; // e.g. "00:00,03:00,06:00,09:00,12:00,15:00,18:00,21:00"
  searchProvider: "auto" | "scraper" | "serpapi";
  serpApiKey?: string;
  ntfyTopic?: string;
  autoNotify: boolean;
}

export interface SchedulerStatus {
  running: boolean;
  scheduleHours: string[];
  nextRun?: string | null;
  lastRun?: string | null;
  lastRunStatus?: "success" | "error" | "running" | "idle";
  lastRunSummary?: string | null;
}

export type DealLevel = "NORMAL" | "OPORTUNIDADE" | "IMPERDIVEL";

export interface FlightPriceRecord {
  id: number;
  origin: string;
  destination: string;
  departureDate: string;
  price: number;
  recordedAt: string;
}

export interface PriceAnalysisResult {
  sampleSize: number;
  mean: number | null;
  stdDev: number | null;
  zScore: number | null;
  dealLevel: DealLevel;
  isDeal: boolean;
  discountPercent: number | null;
  message: string;
}

export type LogLevel = "INFO" | "SUCCESS" | "WARN" | "ERROR";
export type LogCategory = "SCHEDULER" | "SCRAPER" | "SCANNER" | "NOTIFICATION" | "API" | "SYSTEM";

export interface AppLog {
  id: number;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: string | null;
  routeId?: number | null;
}

export interface LogStats {
  total: number;
  info: number;
  success: number;
  warn: number;
  error: number;
}

export interface OnlineUserItem {
  id: number;
  name: string | null;
  email: string;
  lastSeenAt: string;
  createdAt: string;
  minutesAgo: number;
}

export interface OnlineUserStats {
  onlineUsersCount: number;
  activeSessionsCount: number;
  totalUsers: number;
  recentUsers: OnlineUserItem[];
}

export interface LogFilterOptions {
  level?: LogLevel | "ALL";
  category?: LogCategory | "ALL";
  search?: string;
  routeId?: number;
  limit?: number;
  offset?: number;
}

export interface ScanResult {
  success: boolean;
  routeId: number;
  origin: string;
  destination: string;
  flightDate: string;
  returnDate?: string | null;
  tripType?: "one_way" | "round_trip";
  passengers?: number;
  children?: number;
  infantsInLap?: number;
  lowestPrice?: number;
  currency?: string;
  targetPrice: number;
  isBelowTarget: boolean;
  notified: boolean;
  foundOptions: FlightOption[];
  providerUsed?: string;
  searchedAt: string;
  error?: string;
}
