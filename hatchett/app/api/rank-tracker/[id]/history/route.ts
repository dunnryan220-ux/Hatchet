import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;

  const keyword = await prisma.trackedKeyword.findFirst({
    where: user.role === 'OWNER'
      ? { id: params.id, client: { agencyId: user.agencyId } }
      : { id: params.id, client: { clientAccess: { some: { userId: user.id } } } },
    include: {
      rankHistory: {
        orderBy: { recordedAt: 'asc' },
      },
    },
  });

  if (!keyword) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ history: keyword.rankHistory });
}
