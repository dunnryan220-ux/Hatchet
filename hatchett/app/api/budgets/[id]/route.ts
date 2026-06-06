import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const budget = await prisma.budget.findFirst({
    where: {
      id: params.id,
      client: { agencyId: (session.user as any).agencyId },
    },
  });

  if (!budget) return NextResponse.json({ error: 'Budget not found' }, { status: 404 });

  const body = await req.json();
  const updates: any = {};
  const historyData: any = null;

  if (body.amount !== undefined && body.amount !== budget.amount) {
    updates.amount = parseFloat(body.amount);
    await prisma.budgetHistory.create({
      data: {
        budgetId: budget.id,
        changedBy: session.user.email!,
        oldAmount: budget.amount,
        newAmount: updates.amount,
      },
    });
  }

  if (body.spentAmount !== undefined) {
    updates.spentAmount = parseFloat(body.spentAmount);
  }

  const updated = await prisma.budget.update({
    where: { id: params.id },
    data: updates,
    include: { history: { orderBy: { changedAt: 'desc' } } },
  });

  return NextResponse.json({ budget: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const budget = await prisma.budget.findFirst({
    where: {
      id: params.id,
      client: { agencyId: (session.user as any).agencyId },
    },
  });

  if (!budget) return NextResponse.json({ error: 'Budget not found' }, { status: 404 });

  await prisma.budgetHistory.deleteMany({ where: { budgetId: budget.id } });
  await prisma.budget.delete({ where: { id: budget.id } });

  return NextResponse.json({ success: true });
}
