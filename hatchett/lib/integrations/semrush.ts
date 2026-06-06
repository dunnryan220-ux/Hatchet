const SEMRUSH_BASE = 'https://api.semrush.com';

export interface KeywordRankResult {
  keyword: string;
  position: number;
  searchVolume: number;
  cpc: number;
  competition: number;
  url: string;
}

export interface SERPResult {
  position: number;
  title: string;
  url: string;
  description: string;
  favicon?: string;
}

export async function fetchKeywordRank(
  keyword: string,
  domain: string,
  database = 'us',
): Promise<KeywordRankResult | null> {
  const apiKey = process.env.SEMRUSH_API_KEY;
  if (!apiKey) throw new Error('SEMRUSH_API_KEY not set');

  const url = new URL(`${SEMRUSH_BASE}/`);
  url.searchParams.set('type', 'phrase_organic');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('phrase', keyword);
  url.searchParams.set('export_columns', 'Ph,Po,Nq,Cp,Co,Ur');
  url.searchParams.set('database', database);
  url.searchParams.set('domain', domain);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SEMrush API error: ${res.status}`);

  const text = await res.text();
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;

  const headers = lines[0].split(';');
  const values = lines[1].split(';');

  const data: Record<string, string> = {};
  headers.forEach((h, i) => { data[h] = values[i] || ''; });

  return {
    keyword: data['Keyword'] || keyword,
    position: parseInt(data['Position'] || '0'),
    searchVolume: parseInt(data['Search Volume'] || '0'),
    cpc: parseFloat(data['CPC'] || '0'),
    competition: parseFloat(data['Competition'] || '0'),
    url: data['URL'] || '',
  };
}

export async function fetchSERPResults(
  keyword: string,
  database = 'us',
  device: 'desktop' | 'mobile' = 'desktop',
): Promise<SERPResult[]> {
  const apiKey = process.env.SEMRUSH_API_KEY;
  if (!apiKey) throw new Error('SEMRUSH_API_KEY not set');

  const url = new URL(`${SEMRUSH_BASE}/`);
  url.searchParams.set('type', 'phrase_fullsearch');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('phrase', keyword);
  url.searchParams.set('export_columns', 'Po,Tt,Ur,Ds,Fv');
  url.searchParams.set('database', database);
  url.searchParams.set('device', device);
  url.searchParams.set('display_limit', '10');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SEMrush SERP API error: ${res.status}`);

  const text = await res.text();
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(';');

  return lines.slice(1).map(line => {
    const values = line.split(';');
    const data: Record<string, string> = {};
    headers.forEach((h, i) => { data[h] = values[i] || ''; });

    const rawUrl = data['URL'] || '';
    let favicon = '';
    try {
      const domain = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).hostname;
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {}

    return {
      position: parseInt(data['Position'] || '0'),
      title: data['Title'] || '',
      url: rawUrl,
      description: data['Description'] || '',
      favicon,
    };
  });
}
