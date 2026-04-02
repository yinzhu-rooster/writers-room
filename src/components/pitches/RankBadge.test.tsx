import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankBadge } from './RankBadge';

describe('RankBadge', () => {
  it('renders rank number', () => {
    render(<RankBadge rank={1} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('uses gold colors for rank 1', () => {
    render(<RankBadge rank={1} />);
    const badge = screen.getByText('#1');
    expect(badge.className).toContain('bg-yellow-100');
    expect(badge.className).toContain('text-yellow-800');
  });

  it('uses silver colors for rank 2', () => {
    render(<RankBadge rank={2} />);
    const badge = screen.getByText('#2');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-700');
  });

  it('uses bronze colors for rank 3', () => {
    render(<RankBadge rank={3} />);
    const badge = screen.getByText('#3');
    expect(badge.className).toContain('bg-amber-100');
  });

  it('uses default colors for rank > 3', () => {
    render(<RankBadge rank={10} />);
    const badge = screen.getByText('#10');
    expect(badge.className).toContain('bg-gray-50');
    expect(badge.className).toContain('text-gray-500');
  });
});
