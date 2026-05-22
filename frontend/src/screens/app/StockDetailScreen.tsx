import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AppStackParamList, 'StockDetail'>;

export default function StockDetailScreen({ route }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{route.params.symbol} chart — coming in PASO 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, color: '#666' },
});
