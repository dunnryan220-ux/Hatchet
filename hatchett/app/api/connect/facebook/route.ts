import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/connect/facebook/callback`;
const SCOPES = 'ads_read,ads_management,pages_read_engagement,instagram_basic,pages_show_list,business_management';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'OWNER') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  const { searchParams } = new URL(req.url);
  const isCallback = searchParams.has('code');

  if (!isCallback) {
    const clientId = searchParams.get('clientId') || '';
    const url = `https://www.facebook.com/dialog/oauth?` +
      `client_id=${META_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${SCOPES}&` +
      `state=${clientId}&` +
      `response_type=code`;
    return NextResponse.redirect(url);
  }

  // Callback handling
  const code = searchParams.get('code');
  const state = searchParams.get('state') || '';
  if (!code) return NextResponse.redirect(new URL('/dashboard/facebook-ads?error=no_code', req.url));

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `code=${code}`,
    );
    const tokenData = await tokenRes.json();

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${META_APP_ID}&` +
      `client_secret=${META_APP_SECRET}&` +
      `fb_exchange_token=${tokenData.access_token}`,
    );
    const longLivedData = await longLivedRes.json();

    // Get user pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedData.access_token}`,
    );
    const pagesData = await pagesRes.json();
    const firstPage = pagesData.data?.[0];

    // Get ad accounts
    const adAccountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&access_token=${longLivedData.access_token}`,
    );
    const adAccountsData = await adAccountsRes.json();
    const firstAdAccount = adAccountsData.data?.[0];

    // Get IG account from page
    let igAccountId;
    if (firstPage?.id) {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${firstPage.id}?fields=instagram_business_account&access_token=${longLivedData.access_token}`,
      );
      const igData = await igRes.json();
      igAccountId = igData.instagram_business_account?.id;
    }

    const expiresAt = longLivedData.expires_in
      ? new Date(Date.now() + longLivedData.expires_in * 1000)
      : null;

    if (state) {
      await prisma.client.update({
        where: { id: state, agencyId: (session.user as any).agencyId },
        data: {
          fbAccessToken: longLivedData.access_token,
          fbTokenExpiresAt: expiresAt,
          fbAdAccountId: firstAdAccount?.id?.replace('act_', ''),
          fbPageId: firstPage?.id,
          igAccountId,
        },
      });
    }

    return NextResponse.redirect(new URL('/dashboard/facebook-ads?connected=true', req.url));
  } catch (error) {
    console.error('Facebook connect error:', error);
    return NextResponse.redirect(new URL('/dashboard/facebook-ads?error=connect_failed', req.url));
  }
}
