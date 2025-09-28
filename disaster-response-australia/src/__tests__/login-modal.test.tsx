import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginModal from '@/app/components/LoginModal';
import { signInWithEmailAndPassword } from 'firebase/auth';

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

describe('LoginModal', () => {
  const mockedSignIn = jest.mocked(signInWithEmailAndPassword);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSignIn.mockReset();
    const cookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
    cookieDescriptor?.get?.mockReturnValue('');
    cookieDescriptor?.set?.mockClear();
  });

  it('signs in console users and redirects to console page', async () => {
    const getIdTokenMock = jest.fn().mockResolvedValue('token-console');
    mockedSignIn.mockResolvedValueOnce({
      user: { getIdToken: getIdTokenMock },
    } as any);

    render(<LoginModal onClose={jest.fn()} setIsLogIn={jest.fn()} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email address/i), 'console.user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Passw0rd!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockedSignIn).toHaveBeenCalledWith(expect.any(Object), 'console.user@example.com', 'Passw0rd!');
      expect(pushMock).toHaveBeenCalledWith('/console');
    });

    expect(getIdTokenMock).toHaveBeenCalled();
    const cookieSetter = Object.getOwnPropertyDescriptor(document, 'cookie')?.set as jest.Mock | undefined;
    expect(cookieSetter).toHaveBeenCalledWith(expect.stringContaining('drau_id_token=token-console'));
  });

  it('signs in management users and redirects to management page', async () => {
    const getIdTokenMock = jest.fn().mockResolvedValue('token-management');
    mockedSignIn.mockResolvedValueOnce({
      user: { getIdToken: getIdTokenMock },
    } as any);

    const onClose = jest.fn();
    const setIsLogIn = jest.fn();

    render(<LoginModal onClose={onClose} setIsLogIn={setIsLogIn} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email address/i), 'management.lead@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/management');
      expect(setIsLogIn).toHaveBeenCalledWith(true);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('redirects general users to dashboard', async () => {
    const getIdTokenMock = jest.fn().mockResolvedValue('token-general');
    mockedSignIn.mockResolvedValueOnce({
      user: { getIdToken: getIdTokenMock },
    } as any);

    const onClose = jest.fn();
    const setIsLogIn = jest.fn();

    render(<LoginModal onClose={onClose} setIsLogIn={setIsLogIn} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email address/i), 'member@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
      expect(setIsLogIn).toHaveBeenCalledWith(true);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('shows error message when sign in fails', async () => {
    mockedSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));
    const setIsLogIn = jest.fn();

    render(<LoginModal onClose={jest.fn()} setIsLogIn={setIsLogIn} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(setIsLogIn).toHaveBeenCalledWith(false);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/login failed/i);
    const cookieSetter = Object.getOwnPropertyDescriptor(document, 'cookie')?.set as jest.Mock | undefined;
    expect(cookieSetter).toHaveBeenCalledWith('drau_id_token=; path=/; max-age=0');
  });

  it('falls back to empty strings when form data is missing', async () => {
    const originalFormData = global.FormData;
    class MockFormData {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_form: HTMLFormElement) {}
      get() {
        return null;
      }
    }

    (global as unknown as { FormData: typeof FormData }).FormData = MockFormData as unknown as typeof FormData;

    const getIdTokenMock = jest.fn().mockResolvedValue('token-fallback');
    mockedSignIn.mockResolvedValueOnce({
      user: { getIdToken: getIdTokenMock },
    } as any);

    try {
      render(<LoginModal onClose={jest.fn()} setIsLogIn={jest.fn()} />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const form = submitButton.closest('form');
      expect(form).not.toBeNull();
      fireEvent.submit(form as HTMLFormElement);

      await waitFor(() => {
        expect(mockedSignIn).toHaveBeenCalledWith(expect.any(Object), '', '');
      });
    } finally {
      (global as unknown as { FormData: typeof FormData }).FormData = originalFormData;
    }
  });
});
