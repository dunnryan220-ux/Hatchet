import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchKeywordRank } from '@/lib/integrations/semrush';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const user = session.user as any;

  let client;
  if (user.role === 'OWNER') {
    client = await prisma.client.findFirst({
      where: clientId ? { id: clientId, agencyId: user.agencyId } : { agencyId: user.agencyId },
    });
  } else {
    const access = await prisma.clientAccess.findFirst({
      where: clientId ? { userId: user.id, clientId } : { userId: user.id },
      include: { client: true },
    });
    client = access?.client;
  }

  if (!client) return NextResponse.json({ keywords: [] });

  const keywords = await prisma.trackedKeyword.findMany({
    where: { clientId: client.id },
    include: {
      rankHistory: {
        orderBy: { recordedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ keywords });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { keyword, targetUrl, group, clientId: requestedClientId } = await req.json();
  if (!keyword || !targetUrl) return NextResponse.json({ error: 'keyword and targetUrl required' }, { status: 400 });

  const user = session.user as any;
  const client = await prisma.client.findFirst({
    where: requestedClientId ? { id: requestedClientId, agencyId: user.agencyId } : { agencyId: user.agencyId },
  });

  if (!client) return NextResponse.json({ error: 'No client found' }, { status: 404 });

  // Try to fetch initial rank
  let initialRank: number | undefined;
  try {
    if (client.website) {
      const rankData = await fetchKeywordRank(keyword, client.website);
      initialRank = rankData?.position || undefined;
    }
  } catch (e) {
    console.warn('Could not fetch initial rank:', e);
  }

  const trackedKeyword = await prisma.trackedKeyword.create({
    data: {
      clientId: client.id,
      keyword,
      targetUrl,
      group,
      currentRank: initialRank,
    },
  });

  if (initialRank) {
    await prisma.rankHistory.create({
      data: {
        trackedKeywordId: trackedKeyword.id,
        rank: initialRank,
      },
    });
  }

  return NextResponse.json({ keyword: trackedKeyword }, { status: 201 });
}
