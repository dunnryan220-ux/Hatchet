import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await prisma.client.findFirst({
    where: { id: params.id, agencyId: (session.user as any).agencyId },
  });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const access = await prisma.clientAccess.findMany({
    where: { clientId: params.id },
    include: { user: { select: { id: true, email: true, role: true } } },
  });

  return NextResponse.json({ access });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await prisma.client.findFirst({
    where: { id: params.id, agencyId: (session.user as any).agencyId },
  });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { id: userId, agencyId: (session.user as any).agencyId },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const existing = await prisma.clientAccess.findFirst({
    where: { clientId: params.id, userId },
  });
  if (existing) return NextResponse.json({ error: 'Access already exists' }, { status: 400 });

  const access = await prisma.clientAccess.create({
    data: { clientId: params.id, userId, grantedBy: session.user.id! },
  });

  return NextResponse.json({ access }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await req.json();
  await prisma.clientAccess.deleteMany({
    where: { clientId: params.id, userId },
  });

  return NextResponse.json({ success: true });
}
