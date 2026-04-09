import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiBadge } from './AiBadge';

describe('AiBadge', () => {
  it('renders AI text', () => {
    render(<AiBadge />);
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('uses small size by default', () => {
    const { container } = render(<AiBadge />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-[10px]');
  });

  it('uses medium size when specified', () => {
    const { container } = render(<AiBadge size="md" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-xs');
  });
});
