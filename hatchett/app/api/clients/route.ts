import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;

  if (user.role === 'OWNER') {
    const clients = await prisma.client.findMany({
      where: { agencyId: user.agencyId },
      include: {
        clientAccess: { include: { user: { select: { id: true, email: true } } } },
        _count: { select: { budgets: true, keywords: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ clients });
  }

  // CLIENT role: return only accessible clients
  const accesses = await prisma.clientAccess.findMany({
    where: { userId: user.id },
    include: { client: true },
  });

  return NextResponse.json({ clients: accesses.map(a => a.client) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  const { name, website, googleAdsCustomerId, ga4PropertyId, gbpLocationId, fbAdAccountId, fbPageId, igAccountId } = data;

  if (!name) return NextResponse.json({ error: 'Client name is required' }, { status: 400 });

  const client = await prisma.client.create({
    data: {
      agencyId: (session.user as any).agencyId,
      name,
      website,
      googleAdsCustomerId,
      ga4PropertyId,
      gbpLocationId,
      fbAdAccountId,
      fbPageId,
      igAccountId,
    },
  });

  return NextResponse.json({ client }, { status: 201 });
}
