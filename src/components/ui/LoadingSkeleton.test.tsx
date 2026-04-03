import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders 3 skeleton items by default', () => {
    const { container } = render(<LoadingSkeleton />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items).toHaveLength(3);
  });

  it('renders custom count', () => {
    const { container } = render(<LoadingSkeleton count={5} />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items).toHaveLength(5);
  });

  it('applies custom height class', () => {
    const { container } = render(<LoadingSkeleton count={1} height="h-32" />);
    const item = container.querySelector('.animate-pulse');
    expect(item?.className).toContain('h-32');
  });

  it('applies default height h-20', () => {
    const { container } = render(<LoadingSkeleton count={1} />);
    const item = container.querySelector('.animate-pulse');
    expect(item?.className).toContain('h-20');
  });
});
