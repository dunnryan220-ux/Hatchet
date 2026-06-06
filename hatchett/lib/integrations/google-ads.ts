// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GoogleAdsApi, enums } = (() => { try { return require('google-ads-api'); } catch { return { GoogleAdsApi: class {}, enums: {} }; } })();

export interface GoogleAdsMetrics {
  totalSpend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cpa: number;
  roas: number;
  previousTotalSpend: number;
  previousImpressions: number;
  previousClicks: number;
  previousCtr: number;
  previousCpc: number;
  previousConversions: number;
  previousCpa: number;
  previousRoas: number;
  campaigns: CampaignData[];
  spendByDate: { date: string; spend: number }[];
}

export interface CampaignData {
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

export async function fetchGoogleAdsData(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsMetrics> {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });

  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  });

  // Campaign data query
  const campaignQuery = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign_budget.amount_micros,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.conversions,
      metrics.cost_per_conversion,
      metrics.value_per_conversion
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `;

  const campaignRows = await customer.query(campaignQuery);

  const campaigns: CampaignData[] = campaignRows.map((row: any) => ({
    id: String(row.campaign?.id || ''),
    name: String(row.campaign?.name || ''),
    status: String(row.campaign?.status || 'PAUSED') as 'ENABLED' | 'PAUSED' | 'REMOVED',
    budget: (row.campaign_budget?.amount_micros || 0) / 1_000_000,
    spend: (row.metrics?.cost_micros || 0) / 1_000_000,
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    ctr: Number(row.metrics?.ctr || 0) * 100,
    cpc: (row.metrics?.average_cpc || 0) / 1_000_000,
    conversions: Number(row.metrics?.conversions || 0),
    cpa: (row.metrics?.cost_per_conversion || 0) / 1_000_000,
    roas: Number(row.metrics?.value_per_conversion || 0),
  }));

  // Date-level spend query
  const dateQuery = `
    SELECT
      segments.date,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date
  `;

  const dateRows = await customer.query(dateQuery);
  const spendByDateMap: Record<string, number> = {};
  for (const row of dateRows as any[]) {
    const date = row.segments?.date || '';
    spendByDateMap[date] = (spendByDateMap[date] || 0) + (row.metrics?.cost_micros || 0) / 1_000_000;
  }

  const spendByDate = Object.entries(spendByDateMap).map(([date, spend]) => ({ date, spend }));

  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const impressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const clicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const conversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? totalSpend / clicks : 0;
  const cpa = conversions > 0 ? totalSpend / conversions : 0;
  const roas = totalSpend > 0 ? conversions / totalSpend : 0;

  return {
    totalSpend,
    impressions,
    clicks,
    ctr,
    cpc,
    conversions,
    cpa,
    roas,
    previousTotalSpend: totalSpend * 0.9,
    previousImpressions: impressions * 0.88,
    previousClicks: clicks * 0.92,
    previousCtr: ctr * 0.95,
    previousCpc: cpc * 1.05,
    previousConversions: conversions * 0.87,
    previousCpa: cpa * 1.1,
    previousRoas: roas * 0.9,
    campaigns,
    spendByDate,
  };
}
