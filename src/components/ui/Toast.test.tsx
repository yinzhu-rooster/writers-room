import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message', () => {
    render(<Toast message="Success!" onClose={() => {}} />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('has role="status" and aria-live for screen readers', () => {
    render(<Toast message="Hello" onClose={() => {}} />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('applies green background for success type', () => {
    render(<Toast message="OK" type="success" onClose={() => {}} />);
    const el = screen.getByRole('status');
    expect(el.className).toContain('bg-green-600');
  });

  it('applies red background for error type', () => {
    render(<Toast message="Fail" type="error" onClose={() => {}} />);
    const el = screen.getByRole('alert');
    expect(el).toHaveAttribute('aria-live', 'assertive');
    expect(el.className).toContain('bg-red-600');
  });

  it('calls onClose after timeout', () => {
    const onClose = vi.fn();
    render(<Toast message="Bye" onClose={onClose} />);

    // Fade out at 3s
    act(() => { vi.advanceTimersByTime(3000); });
    // onClose fires 300ms after fade
    act(() => { vi.advanceTimersByTime(300); });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
