import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AlertsScreen from '../AlertsScreen';
import * as alertsHooks from '../../../hooks/useAlerts';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../hooks/useAlerts');

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockAlerts = [
  { id: 'a1', symbol: 'AAPL', targetPrice: 200, condition: 'above' as const, active: true, createdAt: '2026-05-23' },
  { id: 'a2', symbol: 'TSLA', targetPrice: 150, condition: 'below' as const, active: true, createdAt: '2026-05-23' },
];

const mockDeleteMutate = jest.fn();
const mockCreateMutate = jest.fn();

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AlertsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (alertsHooks.useAlerts as jest.Mock).mockReturnValue({
      data: mockAlerts,
      isLoading: false,
    });

    (alertsHooks.useCreateAlert as jest.Mock).mockReturnValue({
      mutate: mockCreateMutate,
      isPending: false,
    });

    (alertsHooks.useDeleteAlert as jest.Mock).mockReturnValue({
      mutate: mockDeleteMutate,
    });
  });

  it('renders the list of alerts from the query', () => {
    const { getByTestId } = renderWithQuery(<AlertsScreen />);
    expect(getByTestId('alert-item-a1')).toBeTruthy();
    expect(getByTestId('alert-item-a2')).toBeTruthy();
  });

  it('renders the correct symbol and condition for each alert', () => {
    const { getByText } = renderWithQuery(<AlertsScreen />);
    expect(getByText('AAPL')).toBeTruthy();
    expect(getByText('TSLA')).toBeTruthy();
    expect(getByText('↑ $200')).toBeTruthy();
    expect(getByText('↓ $150')).toBeTruthy();
  });

  it('calls deleteAlert mutation when delete button is pressed', async () => {
    const { getByTestId } = renderWithQuery(<AlertsScreen />);
    fireEvent.press(getByTestId('delete-alert-a1'));

    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledWith('a1');
    });
  });

  it('shows empty message when no alerts exist', () => {
    (alertsHooks.useAlerts as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    const { getByText } = renderWithQuery(<AlertsScreen />);
    expect(getByText('No active alerts yet.')).toBeTruthy();
  });

  it('shows loading indicator while fetching', () => {
    (alertsHooks.useAlerts as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    const { UNSAFE_getByType } = renderWithQuery(<AlertsScreen />);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('calls createAlert mutation with correct payload when form is submitted', async () => {
    const { getByTestId } = renderWithQuery(<AlertsScreen />);

    fireEvent.changeText(getByTestId('symbol-input'), 'MSFT');
    fireEvent.changeText(getByTestId('price-input'), '350');
    fireEvent.press(getByTestId('condition-below'));
    fireEvent.press(getByTestId('create-alert-button'));

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledWith(
        { symbol: 'MSFT', targetPrice: 350, condition: 'below' },
        expect.any(Object),
      );
    });
  });
});
