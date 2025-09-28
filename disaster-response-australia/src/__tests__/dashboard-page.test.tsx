import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '@/app/page';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
}));

jest.mock('@/app/firebase/client', () => ({
  auth: {},
}));

jest.mock('@/app/components/map', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'mock-map' }),
}));


describe('DashboardPage', () => {
  beforeEach(() => {
    document.cookie = '';
    jest.useFakeTimers();
    pushMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('shows sign-in prompt when user is logged out', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('button', { name: /sign in \/ sign up/i })).toBeInTheDocument();
  });

  it('shows dashboard actions when cookie is present', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    document.cookie = 'drau_id_token=token';
    render(<DashboardPage />);

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByText(/latest release/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/active disaster areas/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /test title/i }).length).toBeGreaterThan(0);
    randomSpy.mockRestore();
  });

  it('opens login modal when trigger is pressed', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<DashboardPage />);

    await user.click(screen.getByRole('button', { name: /sign in \/ sign up/i }));
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});
