import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders message', () => {
    render(<EmptyState message="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    render(<EmptyState message="Empty" action={{ label: 'Add one', onClick: () => {} }} />);
    expect(screen.getByText('Add one')).toBeInTheDocument();
  });

  it('does not render button when no action', () => {
    render(<EmptyState message="Empty" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls onClick when action button clicked', async () => {
    const onClick = vi.fn();
    render(<EmptyState message="Empty" action={{ label: 'Click me', onClick }} />);
    await userEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
