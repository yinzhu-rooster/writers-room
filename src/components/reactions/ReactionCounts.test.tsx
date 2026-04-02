import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactionCounts } from './ReactionCounts';

describe('ReactionCounts', () => {
  it('shows "No reactions" when all counts are 0', () => {
    render(<ReactionCounts laugh={0} smile={0} surprise={0} />);
    expect(screen.getByText('No reactions')).toBeInTheDocument();
  });

  it('shows laugh count when non-zero', () => {
    render(<ReactionCounts laugh={5} smile={0} surprise={0} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('shows multiple counts', () => {
    render(<ReactionCounts laugh={3} smile={2} surprise={1} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });

  it('hides zero counts', () => {
    const { container } = render(<ReactionCounts laugh={5} smile={0} surprise={0} />);
    const spans = container.querySelectorAll('span');
    // Should only have the laugh span inside the div
    expect(spans).toHaveLength(1);
  });
});
