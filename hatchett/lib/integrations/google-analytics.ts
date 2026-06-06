// eslint-disable-next-line @typescript-eslint/no-require-imports
const { analyticsdata_v1beta } = require('@googleapis/analyticsdata');

type GA4Client = {
  runReport: (req: Record<string, unknown>) => Promise<[{ dimensionHeaders?: any[]; metricHeaders?: any[]; rows?: any[]; rowCount?: number }]>;
};

let client: GA4Client | null = null;

function getClient(): GA4Client {
  if (!client) {
    const keyJson = process.env.GA4_SERVICE_ACCOUNT_KEY;
    if (!keyJson) throw new Error('GA4_SERVICE_ACCOUNT_KEY not set');
    const credentials = JSON.parse(keyJson);
    client = new analyticsdata_v1beta.Analyticsdata({ auth: credentials });
  }
  return client as GA4Client;
}

export interface GA4MetricsResponse {
  sessions: number;
  users: number;
  newUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions: number;
  totalRevenue: number;
  previousSessions: number;
  previousUsers: number;
  previousNewUsers: number;
  previousBounceRate: number;
  previousAvgSessionDuration: number;
  previousConversions: number;
  previousTotalRevenue: number;
  sessionsByDate: { date: string; sessions: number }[];
  conversionsByDate: { date: string; conversions: number }[];
  sessionsByChannel: { channel: string; sessions: number }[];
  topPages: { page: string; pageviews: number; sessions: number }[];
}

export async function fetchGA4Data(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<GA4MetricsResponse> {
  const analyticsClient = getClient();
  const property = `properties/${propertyId}`;

  // Calculate previous period
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - duration);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // Fetch current and previous period summary
  const [summaryResponse] = await analyticsClient.runReport({
    property,
    dateRanges: [
      { startDate, endDate },
      { startDate: formatDate(prevStart), endDate: formatDate(prevEnd) },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'conversions' },
      { name: 'totalRevenue' },
    ],
  });

  // Extract metrics from response
  const currentRow = summaryResponse.rows?.find((r: any) => r.dimensionValues?.[0]?.value === 'date_range_0') || summaryResponse.rows?.[0];
  const prevRow = summaryResponse.rows?.find((r: any) => r.dimensionValues?.[0]?.value === 'date_range_1') || summaryResponse.rows?.[1];

  const getMetric = (row: typeof currentRow, index: number) =>
    parseFloat(row?.metricValues?.[index]?.value || '0');

  // Fetch sessions by date
  const [dateResponse] = await analyticsClient.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }, { name: 'conversions' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  // Fetch sessions by channel
  const [channelResponse] = await analyticsClient.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  });

  // Fetch top pages
  const [pagesResponse] = await analyticsClient.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 10,
  });

  const sessionsByDate = (dateResponse.rows || []).map((row: any) => ({
    date: row.dimensionValues?.[0]?.value || '',
    sessions: parseInt(row.metricValues?.[0]?.value || '0'),
  }));

  const conversionsByDate = (dateResponse.rows || []).map((row: any) => ({
    date: row.dimensionValues?.[0]?.value || '',
    conversions: parseInt(row.metricValues?.[1]?.value || '0'),
  }));

  const sessionsByChannel = (channelResponse.rows || []).map((row: any) => ({
    channel: row.dimensionValues?.[0]?.value || 'Unknown',
    sessions: parseInt(row.metricValues?.[0]?.value || '0'),
  }));

  const topPages = (pagesResponse.rows || []).map((row: any) => ({
    page: row.dimensionValues?.[0]?.value || '/',
    pageviews: parseInt(row.metricValues?.[0]?.value || '0'),
    sessions: parseInt(row.metricValues?.[1]?.value || '0'),
  }));

  return {
    sessions: getMetric(currentRow, 0),
    users: getMetric(currentRow, 1),
    newUsers: getMetric(currentRow, 2),
    bounceRate: getMetric(currentRow, 3),
    avgSessionDuration: getMetric(currentRow, 4),
    conversions: getMetric(currentRow, 5),
    totalRevenue: getMetric(currentRow, 6),
    previousSessions: getMetric(prevRow, 0),
    previousUsers: getMetric(prevRow, 1),
    previousNewUsers: getMetric(prevRow, 2),
    previousBounceRate: getMetric(prevRow, 3),
    previousAvgSessionDuration: getMetric(prevRow, 4),
    previousConversions: getMetric(prevRow, 5),
    previousTotalRevenue: getMetric(prevRow, 6),
    sessionsByDate,
    conversionsByDate,
    sessionsByChannel,
    topPages,
  };
}
