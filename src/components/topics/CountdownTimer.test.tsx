import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountdownTimer } from './CountdownTimer';

// Mock IntersectionObserver to immediately trigger visibility
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {
    // Simulate element being visible immediately
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('CountdownTimer', () => {
  it('shows hours and minutes when more than 1 hour remains', () => {
    const closesAt = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();
    render(<CountdownTimer closesAt={closesAt} />);
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('shows minutes and seconds when less than 1 hour remains', () => {
    const closesAt = new Date(Date.now() + 5 * 60 * 1000 + 45 * 1000).toISOString();
    render(<CountdownTimer closesAt={closesAt} />);
    expect(screen.getByText('5m 45s')).toBeInTheDocument();
  });

  it('shows only seconds when less than 1 minute remains', () => {
    const closesAt = new Date(Date.now() + 30 * 1000).toISOString();
    render(<CountdownTimer closesAt={closesAt} />);
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  it('shows "Closed" when time has already passed', () => {
    const closesAt = new Date(Date.now() - 60 * 1000).toISOString();
    render(<CountdownTimer closesAt={closesAt} />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('calls onExpired when timer reaches 0', () => {
    const onExpired = vi.fn();
    const closesAt = new Date(Date.now() + 2000).toISOString();
    render(<CountdownTimer closesAt={closesAt} onExpired={onExpired} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('updates display as time passes', () => {
    const closesAt = new Date(Date.now() + 65 * 1000).toISOString();
    render(<CountdownTimer closesAt={closesAt} />);
    expect(screen.getByText('1m 5s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('1m 0s')).toBeInTheDocument();
  });

  it('shows "Closed" after timer expires', () => {
    const closesAt = new Date(Date.now() + 2000).toISOString();
    render(<CountdownTimer closesAt={closesAt} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Closed')).toBeInTheDocument();
  });
});
