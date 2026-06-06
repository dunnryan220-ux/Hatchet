import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const user = session.user as any;

  let allowed = false;
  if (user.role === 'OWNER') {
    const client = await prisma.client.findFirst({ where: { id: clientId, agencyId: user.agencyId } });
    allowed = !!client;
  } else {
    const access = await prisma.clientAccess.findFirst({ where: { userId: user.id, clientId } });
    allowed = !!access;
  }

  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const schedules = await prisma.reportSchedule.findMany({ where: { clientId } });
  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { clientId, frequency, recipients, enabled } = await req.json();
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const user = session.user as any;
  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId: user.agencyId } });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existing = await prisma.reportSchedule.findFirst({ where: { clientId, frequency } });
  if (existing) {
    const updated = await prisma.reportSchedule.update({
      where: { id: existing.id },
      data: { recipients, enabled: enabled ?? true },
    });
    return NextResponse.json({ schedule: updated });
  }

  const schedule = await prisma.reportSchedule.create({
    data: { clientId, frequency, recipients: recipients || [], enabled: enabled ?? true },
  });
  return NextResponse.json({ schedule }, { status: 201 });
}
