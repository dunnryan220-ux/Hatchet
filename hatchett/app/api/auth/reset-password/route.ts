import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { token, password, email } = await req.json();
    if (!token || !password || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'Invalid reset link' }, { status: 400 });

    const resetTokens = await prisma.passwordResetToken.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    });

    let validToken = null;
    for (const rt of resetTokens) {
      const isValid = await bcrypt.compare(token, rt.token);
      if (isValid) { validToken = rt; break; }
    }

    if (!validToken) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { hashedPassword } }),
      prisma.passwordResetToken.update({ where: { id: validToken.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
