import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getClientId(session: any, requestedClientId?: string): Promise<string | null> {
  if (!session?.user) return null;

  if (session.user.role === 'OWNER') {
    // Owner can specify which client's data to retrieve
    if (requestedClientId) {
      const client = await prisma.client.findFirst({
        where: { id: requestedClientId, agencyId: session.user.agencyId },
      });
      return client?.id || null;
    }
    // Return first client if none specified
    const firstClient = await prisma.client.findFirst({
      where: { agencyId: session.user.agencyId },
    });
    return firstClient?.id || null;
  }

  // Client role: get first accessible client
  const access = await prisma.clientAccess.findFirst({
    where: { userId: session.user.id },
    include: { client: true },
  });
  return access?.clientId || null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const requestedClientId = searchParams.get('clientId') || undefined;

  const clientId = await getClientId(session, requestedClientId);
  if (!clientId) return NextResponse.json({ budgets: [] });

  const budgets = await prisma.budget.findMany({
    where: { clientId },
    include: { history: { orderBy: { changedAt: 'desc' } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ budgets });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { channel, amount, period, clientId: requestedClientId } = await req.json();
  if (!channel || !amount || !period) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const clientId = await getClientId(session as any, requestedClientId);
  if (!clientId) return NextResponse.json({ error: 'No client found' }, { status: 404 });

  const budget = await prisma.budget.create({
    data: { clientId, channel, amount: parseFloat(amount), period },
  });

  return NextResponse.json({ budget }, { status: 201 });
}
