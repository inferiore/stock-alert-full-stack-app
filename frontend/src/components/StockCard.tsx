import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useStockStore } from '../store/stockStore';

interface Props {
  symbol: string;
  onPress: () => void;
}

// memo + isolated selector: only re-renders when THIS symbol's price changes
const StockCard = memo(function StockCard({ symbol, onPress }: Props) {
  const price = useStockStore((s) => s.prices[symbol]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} testID={`stock-card-${symbol}`}>
      <View style={styles.row}>
        <Text style={styles.symbol}>{symbol}</Text>
        <Text style={styles.price}>
          {price != null ? `$${price.toFixed(2)}` : '---'}
        </Text>
      </View>
      <Text style={styles.hint}>Tap for chart →</Text>
    </TouchableOpacity>
  );
});

export default StockCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  symbol: { fontSize: 20, fontWeight: '700' },
  price: { fontSize: 20, fontWeight: '600', color: '#007AFF' },
  hint: { fontSize: 12, color: '#aaa', marginTop: 4 },
});
