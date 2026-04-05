import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Header } from './Header';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

const mockUseUser = vi.fn();
vi.mock('@/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

vi.mock('@/components/auth/LoginButton', () => ({
  LoginButton: () => <button data-testid="login-button">Sign In</button>,
}));

vi.mock('@/components/auth/UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu">UserMenu</div>,
}));

beforeEach(() => {
  mockUseUser.mockReturnValue({ authUser: null, profile: null, loading: false });
});

describe('Header', () => {
  it('renders "Writers Room" link', () => {
    render(<Header />);
    expect(screen.getByText('Writers Room')).toBeInTheDocument();
  });

  it('shows only public nav items when not authenticated (before mount)', () => {
    render(<Header />);
    // Before mount (SSR state), only non-auth items shown
    // Closed Topics and Leaderboard are authOnly: false
    expect(screen.getByText('Closed Topics')).toBeInTheDocument();
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    // Open Topics and Stats are authOnly: true — not shown before mount
    expect(screen.queryByText('Open Topics')).not.toBeInTheDocument();
    expect(screen.queryByText('Stats')).not.toBeInTheDocument();
  });

  it('shows all nav items when authenticated after mount', async () => {
    mockUseUser.mockReturnValue({
      authUser: { id: 'user-1', email: 'test@test.com' },
      profile: { username: 'testuser', avatar_url: null },
      loading: false,
    });
    render(<Header />);
    // After mount effect fires
    await act(async () => {});
    expect(screen.getByText('Open Topics')).toBeInTheDocument();
    expect(screen.getByText('Closed Topics')).toBeInTheDocument();
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
  });

  it('highlights active nav item based on pathname', async () => {
    const { usePathname } = await import('next/navigation');
    vi.mocked(usePathname).mockReturnValue('/closed');

    render(<Header />);
    await act(async () => {});

    const closedLink = screen.getByText('Closed Topics');
    expect(closedLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not highlight non-active nav items', async () => {
    const { usePathname } = await import('next/navigation');
    vi.mocked(usePathname).mockReturnValue('/closed');

    render(<Header />);
    await act(async () => {});

    const leaderboardLink = screen.getByText('Leaderboard');
    expect(leaderboardLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('shows LoginButton when not authenticated (after mount)', async () => {
    render(<Header />);
    await act(async () => {});
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  it('shows UserMenu when authenticated (after mount)', async () => {
    mockUseUser.mockReturnValue({
      authUser: { id: 'user-1', email: 'test@test.com' },
      profile: { username: 'testuser', avatar_url: null },
      loading: false,
    });
    render(<Header />);
    await act(async () => {});
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  it('shows nothing in auth slot when loading', async () => {
    mockUseUser.mockReturnValue({ authUser: null, profile: null, loading: true });
    render(<Header />);
    await act(async () => {});
    expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
  });
});
