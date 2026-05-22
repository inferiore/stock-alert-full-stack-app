import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../../navigation/RootNavigator';
import { useStockSocket } from '../../hooks/useStockSocket';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/RootNavigator';
import StockCard from '../../components/StockCard';

type Props = BottomTabScreenProps<TabParamList, 'Stocks'>;

const WATCHLIST = ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN', 'NVDA'];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function StocksScreen(_props: Props) {
  useStockSocket(WATCHLIST);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <View style={styles.container}>
      <FlatList
        data={WATCHLIST}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <StockCard
            symbol={item}
            onPress={() => navigation.navigate('StockDetail', { symbol: item })}
          />
        )}
        ListHeaderComponent={
          <Text style={styles.header}>Live Prices</Text>
        }
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity style={styles.logoutBtn} onPress={clearAuth}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { paddingVertical: 12, paddingBottom: 80 },
  header: { fontSize: 14, color: '#888', marginHorizontal: 16, marginBottom: 8 },
  logoutBtn: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 20,
  },
  logoutText: { color: '#fff', fontWeight: '600' },
});
