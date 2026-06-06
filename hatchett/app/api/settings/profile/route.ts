import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, agencyName } = await req.json();

  if (name !== undefined) {
    await prisma.user.update({ where: { id: session.user.id }, data: { name: name ?? null } });
  }

  const agencyId = session.user.agencyId;
  if (agencyName && agencyId) {
    await prisma.agency.update({ where: { id: agencyId }, data: { name: agencyName } });
  }

  return NextResponse.json({ success: true });
}
