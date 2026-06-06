import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = session.user.agencyId;
  if (!agencyId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const keyword = await prisma.trackedKeyword.findFirst({
    where: {
      id: params.id,
      client: { agencyId },
    },
  });

  if (!keyword) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.trackedKeyword.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
