import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function StocksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Live Stocks — coming in PASO 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, color: '#666' },
});
