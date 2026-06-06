import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateReport } from '@/lib/export-pdf';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId, modules, dateRange, kpis, budgets, keywords } = await req.json();
  const user = session.user as any;

  let client;
  if (user.role === 'OWNER') {
    client = await prisma.client.findFirst({
      where: { id: clientId, agencyId: user.agencyId },
      include: { agency: true },
    });
  } else {
    const access = await prisma.clientAccess.findFirst({
      where: { userId: user.id, clientId },
      include: { client: { include: { agency: true } } },
    });
    client = access?.client;
  }

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const pdfBuffer = await generateReport({
      agencyName: client.agency.name,
      agencyLogo: client.agency.logo ?? undefined,
      clientName: client.name,
      dateRange: {
        from: dateRange?.from || new Date(Date.now() - 30 * 86400000).toLocaleDateString(),
        to: dateRange?.to || new Date().toLocaleDateString(),
      },
      modules: modules || ['overview'],
      kpis,
      budgets,
      keywords,
    });

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${client.name}-report.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
