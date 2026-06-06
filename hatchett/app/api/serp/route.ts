import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchSERPResults } from '@/lib/integrations/semrush';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword');
  const device = (searchParams.get('device') || 'desktop') as 'desktop' | 'mobile';
  const database = searchParams.get('database') || 'us';

  if (!keyword) return NextResponse.json({ error: 'keyword is required' }, { status: 400 });

  try {
    const results = await fetchSERPResults(keyword, database, device);
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('SERP error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
