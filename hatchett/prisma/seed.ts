import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create agency
  const agency = await prisma.agency.upsert({
    where: { id: 'agency-1' },
    update: {},
    create: {
      id: 'agency-1',
      name: 'Hatchett Agency',
      primaryColor: '#FF4500',
    },
  });

  // Create owner user
  const ownerPassword = await bcrypt.hash('hatchett123', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@hatchett.com' },
    update: {},
    create: {
      email: 'owner@hatchett.com',
      hashedPassword: ownerPassword,
      role: Role.OWNER,
      agencyId: agency.id,
    },
  });

  // Create client users
  const clientPassword = await bcrypt.hash('client123', 12);
  const clientUser1 = await prisma.user.upsert({
    where: { email: 'client1@acme.com' },
    update: {},
    create: {
      email: 'client1@acme.com',
      hashedPassword: clientPassword,
      role: Role.CLIENT,
      agencyId: agency.id,
    },
  });

  const clientUser2 = await prisma.user.upsert({
    where: { email: 'client2@beta.com' },
    update: {},
    create: {
      email: 'client2@beta.com',
      hashedPassword: clientPassword,
      role: Role.CLIENT,
      agencyId: agency.id,
    },
  });

  // Create client profiles
  const acmeCorp = await prisma.client.upsert({
    where: { id: 'client-acme-1' },
    update: {},
    create: {
      id: 'client-acme-1',
      agencyId: agency.id,
      name: 'Acme Corp',
      website: 'acme.com',
    },
  });

  const betaLLC = await prisma.client.upsert({
    where: { id: 'client-beta-1' },
    update: {},
    create: {
      id: 'client-beta-1',
      agencyId: agency.id,
      name: 'Beta LLC',
      website: 'beta.com',
    },
  });

  // Create ClientAccess
  await prisma.clientAccess.upsert({
    where: { id: 'access-1' },
    update: {},
    create: {
      id: 'access-1',
      clientId: acmeCorp.id,
      userId: clientUser1.id,
      grantedBy: owner.id,
    },
  });

  await prisma.clientAccess.upsert({
    where: { id: 'access-2' },
    update: {},
    create: {
      id: 'access-2',
      clientId: betaLLC.id,
      userId: clientUser2.id,
      grantedBy: owner.id,
    },
  });

  // Create Budgets for Acme Corp
  const acmeBudgets = [
    { id: 'budget-acme-1', channel: 'Google Ads', amount: 5000, spentAmount: 3750, period: 'Monthly' },
    { id: 'budget-acme-2', channel: 'Meta Ads', amount: 3000, spentAmount: 2100, period: 'Monthly' },
    { id: 'budget-acme-3', channel: 'SEO', amount: 2000, spentAmount: 2000, period: 'Monthly' },
  ];

  for (const budget of acmeBudgets) {
    await prisma.budget.upsert({
      where: { id: budget.id },
      update: {},
      create: {
        ...budget,
        clientId: acmeCorp.id,
      },
    });
  }

  // Create Budgets for Beta LLC
  const betaBudgets = [
    { id: 'budget-beta-1', channel: 'Google Ads', amount: 4000, spentAmount: 2800, period: 'Monthly' },
    { id: 'budget-beta-2', channel: 'Meta Ads', amount: 2500, spentAmount: 1900, period: 'Monthly' },
    { id: 'budget-beta-3', channel: 'SEO', amount: 1500, spentAmount: 750, period: 'Monthly' },
  ];

  for (const budget of betaBudgets) {
    await prisma.budget.upsert({
      where: { id: budget.id },
      update: {},
      create: {
        ...budget,
        clientId: betaLLC.id,
      },
    });
  }

  // Create BudgetHistory for Acme
  const budgetHistories = [
    { id: 'bh-1', budgetId: 'budget-acme-1', changedBy: owner.email, oldAmount: 4000, newAmount: 5000, changedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    { id: 'bh-2', budgetId: 'budget-acme-1', changedBy: owner.email, oldAmount: 3500, newAmount: 4000, changedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
    { id: 'bh-3', budgetId: 'budget-acme-2', changedBy: owner.email, oldAmount: 2500, newAmount: 3000, changedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
    { id: 'bh-4', budgetId: 'budget-beta-1', changedBy: owner.email, oldAmount: 3500, newAmount: 4000, changedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
    { id: 'bh-5', budgetId: 'budget-beta-2', changedBy: owner.email, oldAmount: 2000, newAmount: 2500, changedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
    { id: 'bh-6', budgetId: 'budget-beta-3', changedBy: owner.email, oldAmount: 1200, newAmount: 1500, changedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
  ];

  for (const bh of budgetHistories) {
    await prisma.budgetHistory.upsert({
      where: { id: bh.id },
      update: {},
      create: bh,
    });
  }

  // Create TrackedKeywords for Acme Corp
  const acmeKeywords = [
    { id: 'kw-acme-1', keyword: 'acme products online', targetUrl: 'https://acme.com/products', currentRank: 5, previousRank: 8, group: 'Product' },
    { id: 'kw-acme-2', keyword: 'acme corp solutions', targetUrl: 'https://acme.com/solutions', currentRank: 12, previousRank: 15, group: 'Brand' },
    { id: 'kw-acme-3', keyword: 'best acme services', targetUrl: 'https://acme.com/services', currentRank: 3, previousRank: 7, group: 'Service' },
    { id: 'kw-acme-4', keyword: 'acme pricing plans', targetUrl: 'https://acme.com/pricing', currentRank: 18, previousRank: 22, group: 'Commercial' },
    { id: 'kw-acme-5', keyword: 'acme customer support', targetUrl: 'https://acme.com/support', currentRank: 9, previousRank: 11, group: 'Support' },
  ];

  for (const kw of acmeKeywords) {
    await prisma.trackedKeyword.upsert({
      where: { id: kw.id },
      update: { currentRank: kw.currentRank, previousRank: kw.previousRank },
      create: { ...kw, clientId: acmeCorp.id },
    });
  }

  // Create TrackedKeywords for Beta LLC
  const betaKeywords = [
    { id: 'kw-beta-1', keyword: 'beta llc software', targetUrl: 'https://beta.com/software', currentRank: 7, previousRank: 10, group: 'Product' },
    { id: 'kw-beta-2', keyword: 'beta llc enterprise', targetUrl: 'https://beta.com/enterprise', currentRank: 15, previousRank: 20, group: 'Enterprise' },
    { id: 'kw-beta-3', keyword: 'beta api integration', targetUrl: 'https://beta.com/api', currentRank: 4, previousRank: 6, group: 'Technical' },
    { id: 'kw-beta-4', keyword: 'beta llc pricing', targetUrl: 'https://beta.com/pricing', currentRank: 25, previousRank: 30, group: 'Commercial' },
    { id: 'kw-beta-5', keyword: 'beta llc reviews', targetUrl: 'https://beta.com/reviews', currentRank: 11, previousRank: 13, group: 'Brand' },
  ];

  for (const kw of betaKeywords) {
    await prisma.trackedKeyword.upsert({
      where: { id: kw.id },
      update: { currentRank: kw.currentRank, previousRank: kw.previousRank },
      create: { ...kw, clientId: betaLLC.id },
    });
  }

  // Create 30 days of rank history for each keyword
  const allKeywordIds = [...acmeKeywords.map(k => k.id), ...betaKeywords.map(k => k.id)];
  const baseRanks: Record<string, number> = {};
  for (const kw of [...acmeKeywords, ...betaKeywords]) {
    baseRanks[kw.id] = kw.currentRank;
  }

  for (const kwId of allKeywordIds) {
    const baseRank = baseRanks[kwId];
    for (let daysBack = 29; daysBack >= 0; daysBack--) {
      const recordedAt = new Date();
      recordedAt.setDate(recordedAt.getDate() - daysBack);
      const fluctuation = Math.floor(Math.random() * 5) - 2;
      const rank = Math.max(1, baseRank + fluctuation + Math.floor(daysBack / 5));

      await prisma.rankHistory.create({
        data: {
          trackedKeywordId: kwId,
          rank,
          recordedAt,
        },
      });
    }
  }

  // SpendHistory for both clients
  for (let daysBack = 29; daysBack >= 0; daysBack--) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);

    await prisma.spendHistory.create({
      data: {
        clientId: acmeCorp.id,
        channel: 'Google Ads',
        spend: 150 + Math.random() * 50,
        date,
      },
    });
    await prisma.spendHistory.create({
      data: {
        clientId: acmeCorp.id,
        channel: 'Meta Ads',
        spend: 90 + Math.random() * 30,
        date,
      },
    });
    await prisma.spendHistory.create({
      data: {
        clientId: betaLLC.id,
        channel: 'Google Ads',
        spend: 120 + Math.random() * 40,
        date,
      },
    });
    await prisma.spendHistory.create({
      data: {
        clientId: betaLLC.id,
        channel: 'Meta Ads',
        spend: 75 + Math.random() * 25,
        date,
      },
    });
  }

  console.log('Database seeded successfully!');
  console.log('Owner: owner@hatchett.com / hatchett123');
  console.log('Client 1: client1@acme.com / client123');
  console.log('Client 2: client2@beta.com / client123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
