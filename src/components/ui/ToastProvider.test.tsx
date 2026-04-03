import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './ToastProvider';

function TestComponent() {
  const { showToast } = useToast();
  return (
    <>
      <button onClick={() => showToast('Success toast')}>Show Success</button>
      <button onClick={() => showToast('Error toast', 'error')}>Show Error</button>
    </>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows toast when showToast is called', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success toast')).toBeInTheDocument();
  });

  it('shows error toast with correct type', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Error'));
    const toast = screen.getByText('Error toast');
    expect(toast.closest('[role="status"]')?.className).toContain('bg-red-600');
  });

  it('removes toast after timeout', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success toast')).toBeInTheDocument();

    // Wait for toast to auto-dismiss (3s + 300ms fade)
    act(() => { vi.advanceTimersByTime(3300); });
    expect(screen.queryByText('Success toast')).not.toBeInTheDocument();
  });
});
