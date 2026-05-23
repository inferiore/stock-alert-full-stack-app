import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { authApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../services/api', () => ({
  authApi: { login: jest.fn() },
}));

jest.mock('../../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockNavigation = {
  navigate: jest.fn(),
} as unknown as Parameters<typeof LoginScreen>[0]['navigation'];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginScreen', () => {
  const mockSetAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { setAuth: typeof mockSetAuth }) => unknown) =>
        selector({ setAuth: mockSetAuth }),
    );
  });

  it('renders email and password inputs', () => {
    const { getByTestId } = render(<LoginScreen navigation={mockNavigation} route={undefined as never} />);
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
  });

  it('calls authApi.login with entered credentials and calls setAuth on success', async () => {
    const fakeResponse = {
      data: { accessToken: 'jwt-token', user: { id: '1', email: 'test@example.com' } },
    };
    (authApi.login as jest.Mock).mockResolvedValue(fakeResponse);

    const { getByTestId } = render(<LoginScreen navigation={mockNavigation} route={undefined as never} />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockSetAuth).toHaveBeenCalledWith('jwt-token', { id: '1', email: 'test@example.com' });
    });
  });

  it('does not call authApi.login when fields are empty', async () => {
    const { getByTestId } = render(<LoginScreen navigation={mockNavigation} route={undefined as never} />);
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(authApi.login).not.toHaveBeenCalled();
    });
  });

  it('navigates to Register when link is pressed', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} route={undefined as never} />);
    fireEvent.press(getByText("Don't have an account? Register"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });
});
