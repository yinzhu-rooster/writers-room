import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomNav } from './BottomNav';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

const mockUseUser = vi.fn();
vi.mock('@/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

beforeEach(() => {
  mockUsePathname.mockReturnValue('/');
  mockUseUser.mockReturnValue({ authUser: null, profile: null, loading: false });
});

describe('BottomNav', () => {
  it('shows only public items when not authenticated', () => {
    render(<BottomNav />);
    // Closed and Leaderboard/Board are authOnly: false
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('Board')).toBeInTheDocument();
    // Open and Stats are authOnly: true
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
    expect(screen.queryByText('Stats')).not.toBeInTheDocument();
  });

  it('shows all items when authenticated', () => {
    mockUseUser.mockReturnValue({
      authUser: { id: 'user-1', email: 'test@test.com' },
      profile: { username: 'testuser', avatar_url: null },
      loading: false,
    });
    render(<BottomNav />);
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
  });

  it('highlights active item based on pathname', () => {
    mockUsePathname.mockReturnValue('/closed');
    render(<BottomNav />);
    const closedLink = screen.getByText('Closed').closest('a');
    expect(closedLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not highlight inactive items', () => {
    mockUsePathname.mockReturnValue('/closed');
    render(<BottomNav />);
    const boardLink = screen.getByText('Board').closest('a');
    expect(boardLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('highlights the root path "/" exactly (not prefix match)', () => {
    mockUsePathname.mockReturnValue('/closed');
    mockUseUser.mockReturnValue({
      authUser: { id: 'user-1' },
      profile: null,
      loading: false,
    });
    render(<BottomNav />);
    // "/" item (Open) should not be active on /closed
    const openLink = screen.queryByText('Open')?.closest('a');
    if (openLink) {
      expect(openLink).not.toHaveAttribute('aria-current', 'page');
    }
  });

  it('highlights the leaderboard item when on /leaderboard', () => {
    mockUsePathname.mockReturnValue('/leaderboard');
    render(<BottomNav />);
    const boardLink = screen.getByText('Board').closest('a');
    expect(boardLink).toHaveAttribute('aria-current', 'page');
  });
});
