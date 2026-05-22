import { create } from 'zustand';

interface StockState {
  prices: Record<string, number>;
  updatePrice: (symbol: string, price: number) => void;
}

export const useStockStore = create<StockState>((set) => ({
  prices: {},
  // Zustand batches this update — each StockCard reads only its symbol via selector,
  // so only the card whose price changed actually re-renders.
  updatePrice: (symbol, price) =>
    set((state) => ({ prices: { ...state.prices, [symbol]: price } })),
}));
