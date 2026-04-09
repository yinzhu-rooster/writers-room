import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlagButton } from './FlagButton';

const mockShowToast = vi.fn();

vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: vi.fn(() => ({ showToast: mockShowToast })),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockShowToast.mockReset();
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
});

describe('FlagButton', () => {
  it('renders "Flag" button', () => {
    render(<FlagButton type="pitch" targetId="pitch-1" />);
    expect(screen.getByRole('button', { name: 'Flag' })).toBeInTheDocument();
  });

  it('shows FlagReasonPicker when clicked', async () => {
    const user = userEvent.setup();
    render(<FlagButton type="pitch" targetId="pitch-1" />);
    await user.click(screen.getByRole('button', { name: 'Flag' }));
    expect(screen.getByRole('menu', { name: 'Flag reason' })).toBeInTheDocument();
  });

  it('hides FlagReasonPicker initially', () => {
    render(<FlagButton type="pitch" targetId="pitch-1" />);
    expect(screen.queryByRole('menu', { name: 'Flag reason' })).not.toBeInTheDocument();
  });

  it('calls fetch on reason selection for pitch', async () => {
    const user = userEvent.setup();
    render(<FlagButton type="pitch" targetId="pitch-1" />);
    await user.click(screen.getByRole('button', { name: 'Flag' }));
    await user.click(screen.getByRole('menuitem', { name: 'Offensive' }));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/pitches/pitch-1/flags',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'offensive' }),
      })
    );
  });

  it('calls fetch on reason selection for prompt', async () => {
    const user = userEvent.setup();
    render(<FlagButton type="prompt" targetId="prompt-1" />);
    await user.click(screen.getByRole('button', { name: 'Flag' }));
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/topics/prompt-1/flags',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'duplicate' }),
      })
    );
  });

  it('shows "Flagged" after successful flag', async () => {
    const user = userEvent.setup();
    render(<FlagButton type="pitch" targetId="pitch-1" />);
    await user.click(screen.getByRole('button', { name: 'Flag' }));
    await user.click(screen.getByRole('menuitem', { name: 'Plagiarized' }));
    expect(screen.getByText('Flagged')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Flag' })).not.toBeInTheDocument();
  });

  it('shows "Flagged" on 409 conflict (already flagged)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({}) });
    const user = userEvent.setup();
    render(<FlagButton type="pitch" targetId="pitch-1" />);
    await user.click(screen.getByRole('button', { name: 'Flag' }));
    await user.click(screen.getByRole('menuitem', { name: 'Offensive' }));
    expect(screen.getByText('Flagged')).toBeInTheDocument();
  });

  it('shows toast on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const user = userEvent.setup();
    render(<FlagButton type="pitch" targetId="pitch-1" />);
    await user.click(screen.getByRole('button', { name: 'Flag' }));
    await user.click(screen.getByRole('menuitem', { name: 'Offensive' }));
    expect(mockShowToast).toHaveBeenCalledWith('Failed to flag content', 'error');
  });

  it('does not show "Flagged" on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const user = userEvent.setup();
    render(<FlagButton type="pitch" targetId="pitch-1" />);
    await user.click(screen.getByRole('button', { name: 'Flag' }));
    await user.click(screen.getByRole('menuitem', { name: 'Offensive' }));
    expect(screen.queryByText('Flagged')).not.toBeInTheDocument();
  });
});
