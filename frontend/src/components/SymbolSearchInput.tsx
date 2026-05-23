import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { stocksApi, SymbolResult } from '../services/api';

interface Props {
  value: string;
  onSelect: (symbol: string) => void;
  testID?: string;
}

export default function SymbolSearchInput({ value, onSelect, testID }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const search = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await stocksApi.searchSymbols(text.trim());
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleSelect = (item: SymbolResult) => {
    setQuery(item.symbol);
    setOpen(false);
    setResults([]);
    onSelect(item.symbol);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Search symbol…"
          autoCapitalize="characters"
          value={query}
          onChangeText={search}
          testID={testID}
        />
        {loading && <ActivityIndicator style={styles.spinner} size="small" />}
      </View>

      {open && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.symbol}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={results.length > 4}
            style={{ maxHeight: 220 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.resultSymbol}>{item.symbol}</Text>
                <Text style={styles.resultDesc} numberOfLines={1}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, zIndex: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    paddingRight: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 15,
  },
  spinner: { marginLeft: 4 },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 100,
  },
  resultItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resultSymbol: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  resultDesc: { fontSize: 12, color: '#888', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#f0f0f0' },
});
