import { Page, Text, View, Document, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import React from 'react';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#FF4500',
    padding: 24,
    marginBottom: 24,
    borderRadius: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#FF4500',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF4500',
  },
  kpiTitle: {
    fontSize: 9,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  kpiDelta: {
    fontSize: 9,
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: '6 8',
    borderRadius: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '5 8',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableCell: {
    fontSize: 9,
    color: '#1A1A1A',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
});

interface ReportData {
  agencyName: string;
  agencyLogo?: string;
  clientName: string;
  dateRange: { from: string; to: string };
  modules: string[];
  kpis?: { title: string; value: string; delta?: string; positive?: boolean }[];
  budgets?: { channel: string; budget: number; spent: number }[];
  keywords?: { keyword: string; rank: number; delta: number; url: string }[];
}

function KPICard({ title, value, delta, positive }: { title: string; value: string; delta?: string; positive?: boolean }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {delta && (
        <Text style={[styles.kpiDelta, { color: positive ? '#22C55E' : '#EF4444' }]}>
          {positive ? '▲' : '▼'} {delta}
        </Text>
      )}
    </View>
  );
}

function ReportDocument({ data }: { data: ReportData }) {
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{data.agencyName.toUpperCase()}</Text>
          <Text style={styles.headerSubtitle}>Marketing Performance Report</Text>
          <Text style={[styles.headerSubtitle, { marginTop: 8, fontWeight: 'bold' }]}>
            {data.clientName} | {data.dateRange.from} — {data.dateRange.to}
          </Text>
          <Text style={[styles.headerSubtitle, { marginTop: 4 }]}>
            Generated: {generatedDate}
          </Text>
        </View>

        {/* KPIs */}
        {data.kpis && data.kpis.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Overview</Text>
            {data.kpis.reduce((rows: React.ReactElement[], kpi, i) => {
              if (i % 3 === 0) {
                rows.push(
                  <View key={i} style={styles.kpiRow}>
                    {data.kpis!.slice(i, i + 3).map((k, j) => (
                      <KPICard key={j} title={k.title} value={k.value} delta={k.delta} positive={k.positive} />
                    ))}
                  </View>
                );
              }
              return rows;
            }, [])}
          </View>
        )}

        {/* Budgets */}
        {data.modules.includes('budgets') && data.budgets && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Summary</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Channel</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Budget</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Spent</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Usage</Text>
            </View>
            {data.budgets.map((b, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{b.channel}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>${b.budget.toLocaleString()}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>${b.spent.toLocaleString()}</Text>
                <Text style={[styles.tableCell, { flex: 1, color: b.spent / b.budget > 0.9 ? '#EF4444' : '#22C55E' }]}>
                  {Math.round((b.spent / b.budget) * 100)}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Keywords */}
        {data.modules.includes('rank-tracker') && data.keywords && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Keyword Rankings</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Keyword</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Rank</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Change</Text>
            </View>
            {data.keywords.map((kw, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>{kw.keyword}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{kw.rank}</Text>
                <Text style={[styles.tableCell, { flex: 1, color: kw.delta < 0 ? '#22C55E' : '#EF4444' }]}>
                  {kw.delta > 0 ? `▼ ${kw.delta}` : kw.delta < 0 ? `▲ ${Math.abs(kw.delta)}` : '—'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{data.agencyName} — Confidential</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateReport(data: ReportData): Promise<Buffer> {
  const doc = React.createElement(ReportDocument, { data }) as unknown as React.ReactElement<import('@react-pdf/renderer').DocumentProps>;
  const pdfInstance = pdf(doc);
  const blob = await pdfInstance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
