import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginButton } from './LoginButton';

vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return { ...actual, createPortal: (node: any) => node };
});

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: vi.fn(),
    },
  })),
}));

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(() => ({ current: null })),
}));

beforeEach(() => {
  mockSignInWithPassword.mockReset();
  mockSignUp.mockReset();
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockSignUp.mockResolvedValue({ error: null });
  // Mock window.location.href setter
  Object.defineProperty(window, 'location', {
    value: { href: '/', origin: 'http://localhost' },
    writable: true,
  });
});

describe('LoginButton', () => {
  it('renders "Sign In" button initially', () => {
    render(<LoginButton />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows modal form when "Sign In" is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginButton />);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('toggles from login to signup mode', async () => {
    const user = userEvent.setup();
    render(<LoginButton />);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Sign In');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Create Account');
  });

  it('toggles from signup back to login mode', async () => {
    const user = userEvent.setup();
    render(<LoginButton />);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Sign In');
  });

  it('calls supabase signInWithPassword on login submit', async () => {
    const user = userEvent.setup();
    render(<LoginButton />);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    await user.type(screen.getByPlaceholderText('Email'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In', hidden: true }));
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123',
    });
  });

  it('shows error on auth failure', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid credentials' },
    });
    const user = userEvent.setup();
    render(<LoginButton />);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    await user.type(screen.getByPlaceholderText('Email'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword');
    // Click the submit button inside the form (not the initial button)
    const submitBtn = screen.getAllByRole('button').find(
      (b) => b.getAttribute('type') === 'submit'
    );
    await user.click(submitBtn!);
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('closes modal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginButton />);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal on Escape key', async () => {
    const user = userEvent.setup();
    render(<LoginButton />);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
