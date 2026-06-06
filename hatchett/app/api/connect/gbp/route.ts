import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'openid',
  'email',
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GBP_CLIENT_ID,
    process.env.GBP_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/connect/gbp/callback`,
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  const { searchParams } = new URL(req.url);
  const isCallback = searchParams.has('code');

  if (!isCallback) {
    const oauth2Client = getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: searchParams.get('clientId') || '',
    });
    return NextResponse.redirect(url);
  }

  // Handle callback
  const code = searchParams.get('code');
  const clientId = searchParams.get('state') || '';
  if (!code) return NextResponse.redirect(new URL('/dashboard/google-business?error=no_code', req.url));

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (clientId) {
      await prisma.client.update({
        where: { id: clientId, agencyId: (session.user as any).agencyId },
        data: { gbpRefreshToken: tokens.refresh_token },
      });
    }

    return NextResponse.redirect(new URL('/dashboard/google-business?connected=true', req.url));
  } catch (error) {
    console.error('GBP connect error:', error);
    return NextResponse.redirect(new URL('/dashboard/google-business?error=connect_failed', req.url));
  }
}
