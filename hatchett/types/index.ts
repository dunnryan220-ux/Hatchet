export type Role = 'OWNER' | 'CLIENT';

export interface User {
  id: string;
  email: string;
  role: Role;
  agencyId: string;
}

export interface Agency {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
}

export interface Client {
  id: string;
  agencyId: string;
  name: string;
  website?: string;
  googleAdsCustomerId?: string;
  ga4PropertyId?: string;
  gbpLocationId?: string;
  gbpRefreshToken?: string;
  fbAdAccountId?: string;
  fbAccessToken?: string;
  fbTokenExpiresAt?: Date;
  fbPageId?: string;
  igAccountId?: string;
  createdAt: Date;
}

export interface Budget {
  id: string;
  clientId: string;
  channel: string;
  amount: number;
  period: string;
  spentAmount: number;
  createdAt: Date;
  history?: BudgetHistory[];
}

export interface BudgetHistory {
  id: string;
  budgetId: string;
  changedBy: string;
  oldAmount: number;
  newAmount: number;
  changedAt: Date;
}

export interface TrackedKeyword {
  id: string;
  clientId: string;
  keyword: string;
  targetUrl: string;
  currentRank?: number;
  previousRank?: number;
  group?: string;
  updatedAt: Date;
  rankHistory?: RankHistory[];
}

export interface RankHistory {
  id: string;
  trackedKeywordId: string;
  rank: number;
  recordedAt: Date;
}

export interface SpendHistory {
  id: string;
  clientId: string;
  channel: string;
  spend: number;
  date: Date;
}

export interface KPIData {
  title: string;
  value: number | string;
  previousValue?: number | string;
  unit?: string;
  icon?: string;
  format?: 'number' | 'currency' | 'percent' | 'duration' | 'text';
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface GA4Data {
  sessions: number;
  users: number;
  newUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions: number;
  totalRevenue: number;
  previousSessions?: number;
  previousUsers?: number;
  previousNewUsers?: number;
  previousBounceRate?: number;
  previousAvgSessionDuration?: number;
  previousConversions?: number;
  previousTotalRevenue?: number;
  sessionsByDate: { date: string; sessions: number }[];
  conversionsByDate: { date: string; conversions: number }[];
  sessionsByChannel: { channel: string; sessions: number }[];
  topPages: { page: string; pageviews: number; sessions: number }[];
}

export interface GoogleAdsData {
  totalSpend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cpa: number;
  roas: number;
  previousTotalSpend?: number;
  previousImpressions?: number;
  previousClicks?: number;
  previousCtr?: number;
  previousCpc?: number;
  previousConversions?: number;
  previousCpa?: number;
  previousRoas?: number;
  campaigns: Campaign[];
  spendByDate: { date: string; spend: number }[];
}

export interface Campaign {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cpa: number;
  roas: number;
}

export interface GBPData {
  businessSearches: number;
  mapsImpressions: number;
  websiteClicks: number;
  directionRequests: number;
  phoneCalls: number;
  photoViews: number;
  previousBusinessSearches?: number;
  previousMapsImpressions?: number;
  previousWebsiteClicks?: number;
  previousDirectionRequests?: number;
  previousPhoneCalls?: number;
  previousPhotoViews?: number;
  metricsByDate: { date: string; [key: string]: number | string }[];
  searchTypeBreakdown: { type: string; count: number }[];
  reviews: GBPReview[];
  averageRating: number;
  totalReviews: number;
}

export interface GBPReview {
  reviewId: string;
  reviewer: string;
  starRating: number;
  comment: string;
  createTime: string;
}

export interface FBAdsData {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  roas: number;
  costPerResult: number;
  previousSpend?: number;
  previousImpressions?: number;
  previousClicks?: number;
  previousCtr?: number;
  previousCpc?: number;
  previousCpm?: number;
  previousConversions?: number;
  previousRoas?: number;
  previousCostPerResult?: number;
  campaigns: FBCampaign[];
  spendByDate: { date: string; spend: number }[];
  placementBreakdown: { placement: string; spend: number; impressions: number }[];
  demographicsAge: { age: string; spend: number; clicks: number }[];
  demographicsGender: { gender: string; spend: number; clicks: number }[];
}

export interface FBCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
}

export interface FBPageData {
  followers: number;
  followerGrowth: number;
  postReach: number;
  postImpressions: number;
  pageViews: number;
  engagements: number;
  engagementRate: number;
  previousFollowers?: number;
  previousFollowerGrowth?: number;
  previousPostReach?: number;
  previousPostImpressions?: number;
  previousPageViews?: number;
  previousEngagements?: number;
  previousEngagementRate?: number;
  followersByDate: { date: string; followers: number }[];
  topPosts: FBPost[];
  contentTypeBreakdown: { type: string; reach: number }[];
}

export interface FBPost {
  id: string;
  thumbnail?: string;
  type: string;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  createdAt: string;
}

export interface IGData {
  followers: number;
  followerGrowth: number;
  reach: number;
  impressions: number;
  profileVisits: number;
  websiteClicks: number;
  engagementRate: number;
  previousFollowers?: number;
  followersByDate: { date: string; followers: number }[];
  topPosts: IGPost[];
  contentTypeBreakdown: { type: string; reach: number }[];
}

export interface IGPost {
  id: string;
  thumbnail?: string;
  type: string;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  engagementRate: number;
  createdAt: string;
}

export interface SERPResult {
  position: number;
  title: string;
  url: string;
  description: string;
  favicon?: string;
}

export interface ClientAccessEntry {
  id: string;
  clientId: string;
  userId: string;
  grantedBy: string;
  grantedAt: Date;
  client: {
    name: string;
  };
  user: {
    email: string;
  };
}

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  agencyId: string;
}
