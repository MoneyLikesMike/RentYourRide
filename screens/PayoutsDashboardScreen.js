import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Polyline, Line, Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useAuth } from '../context/AuthContext';
import { payoutsSummary } from '../services/payoutsApi';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const CHART_HEIGHT = 168 * scale;
const CHART_PAD = { left: 8 * scale, right: 8 * scale, top: 12 * scale, bottom: 28 * scale };

const DATA = {
  monthly: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    potential: [1200, 1450, 1320, 2100, 1900, 2350],
    completed: [820, 980, 910, 1520, 1180, 1820],
  },
  yearly: {
    labels: ['2021', '2022', '2023', '2024'],
    potential: [8200, 12400, 15800, 22100],
    completed: [5100, 9200, 11200, 16400],
  },
};

function formatMoney(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

function BarChart({ values, color, chartWidth }) {
  const innerW = chartWidth - CHART_PAD.left - CHART_PAD.right;
  const innerH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const max = Math.max(...values, 1);
  const n = values.length;
  const slot = innerW / n;
  const barW = Math.min(slot * 0.55, 22 * scale);

  return (
    <Svg width={chartWidth} height={CHART_HEIGHT}>
      <Line
        x1={CHART_PAD.left}
        y1={CHART_HEIGHT - CHART_PAD.bottom}
        x2={chartWidth - CHART_PAD.right}
        y2={CHART_HEIGHT - CHART_PAD.bottom}
        stroke="rgb(235,235,235)"
        strokeWidth={1}
      />
      {values.map((v, i) => {
        const h = (v / max) * innerH;
        const x = CHART_PAD.left + i * slot + (slot - barW) / 2;
        const y = CHART_HEIGHT - CHART_PAD.bottom - h;
        return <Rect key={i} x={x} y={y} width={barW} height={h} rx={3 * scale} fill={color} />;
      })}
    </Svg>
  );
}

function LineChart({ values, color, chartWidth }) {
  const innerW = chartWidth - CHART_PAD.left - CHART_PAD.right;
  const innerH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const max = Math.max(...values, 1);
  const n = values.length;
  const step = n > 1 ? innerW / (n - 1) : 0;

  const points = values
    .map((v, i) => {
      const x = CHART_PAD.left + (n === 1 ? innerW / 2 : i * step);
      const y = CHART_HEIGHT - CHART_PAD.bottom - (v / max) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  const pts = values.map((v, i) => {
    const x = CHART_PAD.left + (n === 1 ? innerW / 2 : i * step);
    const y = CHART_HEIGHT - CHART_PAD.bottom - (v / max) * innerH;
    return { x, y };
  });

  return (
    <Svg width={chartWidth} height={CHART_HEIGHT}>
      <Line
        x1={CHART_PAD.left}
        y1={CHART_HEIGHT - CHART_PAD.bottom}
        x2={chartWidth - CHART_PAD.right}
        y2={CHART_HEIGHT - CHART_PAD.bottom}
        stroke="rgb(235,235,235)"
        strokeWidth={1}
      />
      {pts.map((p, i) => (
        <Rect
          key={i}
          x={p.x - 4 * scale}
          y={p.y - 4 * scale}
          width={8 * scale}
          height={8 * scale}
          rx={4 * scale}
          fill={color}
        />
      ))}
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5 * scale} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

export default function PayoutsDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isReady } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [stripeBalance, setStripeBalance] = useState(null);
  const chartWidth = SCREEN_WIDTH - 40 * scale;

  const dataset = DATA[period === 'monthly' ? 'monthly' : 'yearly'];

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!isAuthenticated || !isReady) {
        setStripeBalance(null);
        return undefined;
      }
      (async () => {
        try {
          const data = await payoutsSummary();
          if (!cancelled && data && typeof data.pendingAmount === 'number') {
            setStripeBalance({
              pendingAmount: data.pendingAmount,
              currency: typeof data.currency === 'string' ? data.currency : 'cad',
            });
          }
        } catch {
          if (!cancelled) setStripeBalance(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, isReady]),
  );

  const summary = useMemo(() => {
    const p = dataset.potential.reduce((a, b) => a + b, 0);
    const c = dataset.completed.reduce((a, b) => a + b, 0);
    return { potentialTotal: p, completedTotal: c };
  }, [dataset]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path
              d="M31 8L17 24L31 40"
              stroke={COLORS.MANGO_TWO}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.headerText}>PAYOUTS</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 * scale }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Track potential and completed earnings. Switch between monthly and yearly views.
        </Text>

        {stripeBalance && isAuthenticated ? (
          <View style={styles.apiBanner}>
            <Text style={styles.apiBannerLabel}>Stripe Connect · pending balance</Text>
            <Text style={styles.apiBannerValue}>
              ${stripeBalance.pendingAmount.toFixed(2)} {stripeBalance.currency.toUpperCase()}
            </Text>
          </View>
        ) : null}

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.togglePill, period === 'monthly' && styles.togglePillActive]}
            onPress={() => setPeriod('monthly')}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, period === 'monthly' && styles.toggleTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.togglePill, period === 'yearly' && styles.togglePillActive]}
            onPress={() => setPeriod('yearly')}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, period === 'yearly' && styles.toggleTextActive]}>Yearly</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatMoney(summary.potentialTotal)}</Text>
            <Text style={styles.summaryLabel}>Potential (period)</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: COLORS.MANGO_TWO }]}>{formatMoney(summary.completedTotal)}</Text>
            <Text style={styles.summaryLabel}>Completed (period)</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Potential earnings</Text>
          <Text style={styles.cardHint}>Projected from active and upcoming trips</Text>
          <BarChart values={dataset.potential} color={COLORS.GREENY_BLUE_TWO} chartWidth={chartWidth} />
          <View style={styles.xLabels}>
            {dataset.labels.map((lab, i) => (
              <Text key={lab + i} style={styles.xLabel} numberOfLines={1}>
                {lab}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Completed earnings</Text>
          <Text style={styles.cardHint}>Paid out for completed rentals</Text>
          <LineChart values={dataset.completed} color={COLORS.GREENY_BLUE} chartWidth={chartWidth} />
          <View style={styles.xLabels}>
            {dataset.labels.map((lab, i) => (
              <Text key={lab + i} style={styles.xLabel} numberOfLines={1}>
                {lab}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12 * scale,
    paddingHorizontal: 20 * scale,
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
    justifyContent: 'center',
  },
  headerTextFlexWrapper: {
    flex: 1,
    marginLeft: 39,
    marginRight: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightSpacer: {
    width: 39,
  },
  headerText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 20 * scale,
    paddingTop: 8 * scale,
  },
  lead: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 19 * scale,
    color: 'rgb(140, 140, 140)',
    marginBottom: 18 * scale,
  },
  apiBanner: {
    backgroundColor: 'rgb(250, 250, 250)',
    borderRadius: 12 * scale,
    padding: 14 * scale,
    marginBottom: 16 * scale,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgb(235, 235, 235)',
  },
  apiBannerLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgb(140, 140, 140)',
    marginBottom: 6 * scale,
    letterSpacing: 0.2,
  },
  apiBannerValue: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 18 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  toggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: 20 * scale,
    backgroundColor: 'rgb(245, 245, 245)',
    borderRadius: 22 * scale,
    padding: 4 * scale,
  },
  togglePill: {
    paddingVertical: 10 * scale,
    paddingHorizontal: 22 * scale,
    borderRadius: 18 * scale,
  },
  togglePillActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: 'rgb(140, 140, 140)',
  },
  toggleTextActive: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12 * scale,
    marginBottom: 22 * scale,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgb(250, 250, 250)',
    borderRadius: 12 * scale,
    padding: 14 * scale,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgb(235, 235, 235)',
  },
  summaryValue: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 20 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 4 * scale,
  },
  summaryLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgb(140, 140, 140)',
    letterSpacing: 0.2,
  },
  card: {
    marginBottom: 24 * scale,
    paddingBottom: 8 * scale,
  },
  cardTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: COLORS.BLACK,
    marginBottom: 4 * scale,
  },
  cardHint: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(160, 160, 160)',
    marginBottom: 12 * scale,
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6 * scale,
    paddingHorizontal: 4 * scale,
  },
  xLabel: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 9 * scale,
    color: 'rgb(140, 140, 140)',
    textAlign: 'center',
  },
});
