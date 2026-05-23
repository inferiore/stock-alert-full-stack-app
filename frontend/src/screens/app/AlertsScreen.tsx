import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAlerts, useCreateAlert, useDeleteAlert } from '../../hooks/useAlerts';
import SymbolSearchInput from '../../components/SymbolSearchInput';

type Condition = 'above' | 'below';

export default function AlertsScreen() {
  const { data: alerts, isLoading } = useAlerts();
  const createAlert = useCreateAlert();
  const deleteAlert = useDeleteAlert();

  const [symbol, setSymbol] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<Condition>('above');

  const handleCreate = () => {
    const price = parseFloat(targetPrice);
    if (!symbol || isNaN(price) || price <= 0) {
      Alert.alert('Validation', 'Enter a valid symbol and price.');
      return;
    }
    createAlert.mutate(
      { symbol: symbol.toUpperCase(), targetPrice: price, condition },
      {
        onSuccess: () => {
          setSymbol('');
          setTargetPrice('');
        },
        onError: () => Alert.alert('Error', 'Could not create alert.'),
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Create form */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>New Alert</Text>
        <View style={styles.row}>
          <SymbolSearchInput
            value={symbol}
            onSelect={setSymbol}
            testID="symbol-input"
          />
          <TextInput
            style={[styles.input, styles.priceInput]}
            placeholder="Price"
            keyboardType="decimal-pad"
            value={targetPrice}
            onChangeText={setTargetPrice}
            testID="price-input"
          />
        </View>

        {/* Condition toggle */}
        <View style={styles.conditionRow}>
          {(['above', 'below'] as Condition[]).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.conditionBtn, condition === c && styles.conditionBtnActive]}
              onPress={() => setCondition(c)}
              testID={`condition-${c}`}
            >
              <Text style={[styles.conditionText, condition === c && styles.conditionTextActive]}>
                {c === 'above' ? '↑ Above' : '↓ Below'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleCreate}
          disabled={createAlert.isPending}
          testID="create-alert-button"
        >
          {createAlert.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>Create Alert</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Alerts list */}
      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No active alerts yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.alertCard} testID={`alert-item-${item.id}`}>
              <View style={styles.alertInfo}>
                <Text style={styles.alertSymbol}>{item.symbol}</Text>
                <Text style={styles.alertDetail}>
                  {item.condition === 'above' ? '↑' : '↓'} ${item.targetPrice}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteAlert.mutate(item.id)}
                testID={`delete-alert-${item.id}`}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  form: { backgroundColor: '#fff', padding: 16, margin: 16, borderRadius: 12, elevation: 2, zIndex: 10, overflow: 'visible' },
  formTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 15, backgroundColor: '#fafafa',
  },
  symbolInput: { flex: 1 },
  priceInput: { flex: 1.5 },
  conditionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  conditionBtn: {
    flex: 1, padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
  },
  conditionBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  conditionText: { fontWeight: '600', color: '#555' },
  conditionTextActive: { color: '#fff' },
  createBtn: {
    backgroundColor: '#007AFF', borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  loader: { marginTop: 32 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 24 },
  alertCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1,
  },
  alertInfo: { flex: 1 },
  alertSymbol: { fontSize: 17, fontWeight: '700' },
  alertDetail: { fontSize: 14, color: '#555', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 18, color: '#FF3B30', fontWeight: '700' },
});
