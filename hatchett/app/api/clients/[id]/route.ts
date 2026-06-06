import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;

  if (user.role !== 'OWNER') {
    const access = await prisma.clientAccess.findFirst({
      where: { clientId: params.id, userId: user.id },
    });
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const client = await prisma.client.findFirst({
    where: { id: params.id, agencyId: user.agencyId },
  });

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await prisma.client.findFirst({
    where: { id: params.id, agencyId: (session.user as any).agencyId },
  });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data = await req.json();
  const allowedFields = ['name', 'website', 'googleAdsCustomerId', 'ga4PropertyId', 'gbpLocationId', 'fbAdAccountId', 'fbPageId', 'igAccountId'];
  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) updates[field] = data[field];
  }

  const updated = await prisma.client.update({ where: { id: params.id }, data: updates });
  return NextResponse.json({ client: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await prisma.client.findFirst({
    where: { id: params.id, agencyId: (session.user as any).agencyId },
  });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete all related data
  await prisma.$transaction([
    prisma.clientAccess.deleteMany({ where: { clientId: params.id } }),
    prisma.budgetHistory.deleteMany({ where: { budget: { clientId: params.id } } }),
    prisma.budget.deleteMany({ where: { clientId: params.id } }),
    prisma.rankHistory.deleteMany({ where: { keyword: { clientId: params.id } } }),
    prisma.trackedKeyword.deleteMany({ where: { clientId: params.id } }),
    prisma.spendHistory.deleteMany({ where: { clientId: params.id } }),
    prisma.reportSchedule.deleteMany({ where: { clientId: params.id } }),
    prisma.client.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ success: true });
}
