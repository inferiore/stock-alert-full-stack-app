import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { LineChart } from 'react-native-gifted-charts';
import { AppStackParamList } from '../../navigation/RootNavigator';
import { stocksApi, CandlePoint } from '../../services/api';
import { useStockStore } from '../../store/stockStore';

type Props = NativeStackScreenProps<AppStackParamList, 'StockDetail'>;

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function StockDetailScreen({ route }: Props) {
  const { symbol } = route.params;
  const livePrice = useStockStore((s) => s.prices[symbol]);

  const { data: candles, isLoading, isError } = useQuery<CandlePoint[]>({
    queryKey: ['candles', symbol],
    queryFn: () => stocksApi.getCandles(symbol),
    staleTime: 5 * 60 * 1000,
  });

  const chartData = candles?.map((c) => ({
    value: c.close,
    label: formatDate(c.timestamp),
    dataPointText: '',
  })) ?? [];

  const minPrice = candles ? Math.min(...candles.map((c) => c.close)) : 0;
  const maxPrice = candles ? Math.max(...candles.map((c) => c.close)) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Live price header */}
      <View style={styles.priceCard}>
        <Text style={styles.symbolText}>{symbol}</Text>
        <Text style={styles.livePrice}>
          {livePrice != null ? `$${livePrice.toFixed(2)}` : 'Waiting for price…'}
        </Text>
        <Text style={styles.liveLabel}>Live Price</Text>
      </View>

      {/* Historical chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>30-Day Close Price</Text>

        {isLoading && <ActivityIndicator style={styles.loader} />}

        {isError && (
          <Text style={styles.errorText}>
            Could not load historical data. Check your Finnhub API key.
          </Text>
        )}

        {!isLoading && !isError && chartData.length === 0 && (
          <Text style={styles.errorText}>No data available for this symbol.</Text>
        )}

        {chartData.length > 0 && (
          <LineChart
            data={chartData}
            width={SCREEN_WIDTH - 64}
            height={200}
            color="#007AFF"
            thickness={2}
            startFillColor="rgba(0,122,255,0.2)"
            endFillColor="rgba(0,122,255,0)"
            areaChart
            curved
            hideDataPoints
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
            noOfSections={4}
            maxValue={Math.ceil(maxPrice * 1.02)}
            yAxisLabelPrefix="$"
            showReferenceLine1
            referenceLine1Position={(maxPrice + minPrice) / 2}
            referenceLine1Config={{ color: '#ddd', dashWidth: 4, dashGap: 4 }}
          />
        )}

        {candles && candles.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>30d High</Text>
              <Text style={styles.statValue}>${maxPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>30d Low</Text>
              <Text style={styles.statValue}>${minPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Candles</Text>
              <Text style={styles.statValue}>{candles.length}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  priceCard: {
    backgroundColor: '#007AFF', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16,
  },
  symbolText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  livePrice: { color: '#fff', fontSize: 42, fontWeight: '700', marginTop: 4 },
  liveLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 16, color: '#333' },
  loader: { marginVertical: 40 },
  errorText: { textAlign: 'center', color: '#aaa', marginVertical: 32 },
  axisText: { fontSize: 10, color: '#aaa' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#aaa' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#333', marginTop: 2 },
});
