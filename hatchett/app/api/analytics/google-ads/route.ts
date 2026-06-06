import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchGoogleAdsData } from '@/lib/integrations/google-ads';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
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

  if (!client) return NextResponse.json({ error: 'No client found' }, { status: 404 });
  if (!client.googleAdsCustomerId) return NextResponse.json({ error: 'Google Ads not connected', notConnected: true }, { status: 404 });

  try {
    const data = await fetchGoogleAdsData(client.googleAdsCustomerId, startDate, endDate);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Google Ads error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
