import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from './UserMenu';

const mockSignOut = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: mockSignOut,
    },
  })),
}));

const mockUseUser = vi.fn();
vi.mock('@/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

beforeEach(() => {
  mockSignOut.mockReset();
  mockSignOut.mockResolvedValue({});
  mockUseUser.mockReturnValue({ authUser: null, profile: null, loading: false });
  Object.defineProperty(window, 'location', {
    value: { href: '/' },
    writable: true,
  });
});

describe('UserMenu', () => {
  it('shows loading skeleton when loading', () => {
    mockUseUser.mockReturnValue({ authUser: null, profile: null, loading: true });
    const { container } = render(<UserMenu />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('returns null when not loading and no profile', () => {
    mockUseUser.mockReturnValue({ authUser: null, profile: null, loading: false });
    const { container } = render(<UserMenu />);
    expect(container.firstChild).toBeNull();
  });

  it('shows user initial when profile exists without avatar', () => {
    mockUseUser.mockReturnValue({
      authUser: { id: 'user-1' },
      profile: { username: 'testuser', avatar_url: null },
      loading: false,
    });
    render(<UserMenu />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('shows avatar image when profile has avatar_url', () => {
    mockUseUser.mockReturnValue({
      authUser: { id: 'user-1' },
      profile: { username: 'testuser', avatar_url: 'https://example.com/avatar.jpg' },
      loading: false,
    });
    render(<UserMenu />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveAttribute('alt', 'testuser');
  });

  it('opens dropdown on click', async () => {
    mockUseUser.mockReturnValue({
      authUser: { id: 'user-1' },
      profile: { username: 'testuser', avatar_url: null },
      loading: false,
    });
    const user = userEvent.setup();
    render(<UserMenu />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows menu items when open', async () => {
    mockUseUser.mockReturnValue({
      authUser: { id: 'user-1' },
      profile: { username: 'testuser', avatar_url: null },
      loading: false,
    });
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getByRole('menuitem', { name: 'Your Stats' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeInTheDocument();
  });

  it('calls signOut on Sign Out click', async () => {
    mockUseUser.mockReturnValue({
      authUser: { id: 'user-1' },
      profile: { username: 'testuser', avatar_url: null },
      loading: false,
    });
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign Out' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('shows username in dropdown header', async () => {
    mockUseUser.mockReturnValue({
      authUser: { id: 'user-1' },
      profile: { username: 'testuser', avatar_url: null },
      loading: false,
    });
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
});
