import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PitchEditModal } from './PitchEditModal';

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(() => ({ current: null })),
}));

vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('PitchEditModal', () => {
  it('renders with initial body', () => {
    render(
      <PitchEditModal
        pitchId="pitch-1"
        initialBody="Original pitch text"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original pitch text')).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(
      <PitchEditModal
        pitchId="pitch-1"
        initialBody="Hello"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    expect(screen.getByText('5/1000')).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(
      <PitchEditModal
        pitchId="pitch-1"
        initialBody="Hi"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    const textarea = screen.getByDisplayValue('Hi');
    await user.type(textarea, ' there');
    expect(screen.getByText('8/1000')).toBeInTheDocument();
  });

  it('calls fetch PATCH on submit', async () => {
    const user = userEvent.setup();
    render(
      <PitchEditModal
        pitchId="pitch-1"
        initialBody="Original text"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/pitches/pitch-1',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'Original text' }),
      })
    );
  });

  it('shows error on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Edit failed' }),
    });
    const user = userEvent.setup();
    render(
      <PitchEditModal
        pitchId="pitch-1"
        initialBody="Original text"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Edit failed')).toBeInTheDocument();
  });

  it('calls onSaved and onClose on success', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <PitchEditModal
        pitchId="pitch-1"
        initialBody="Original text"
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <PitchEditModal
        pitchId="pitch-1"
        initialBody="Original text"
        onClose={onClose}
        onSaved={vi.fn()}
      />
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <PitchEditModal
        pitchId="pitch-1"
        initialBody="Original text"
        onClose={onClose}
        onSaved={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
