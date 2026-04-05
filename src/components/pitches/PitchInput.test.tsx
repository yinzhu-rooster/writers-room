import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PitchInput } from './PitchInput';

vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('PitchInput', () => {
  it('renders textarea and submit button', () => {
    render(<PitchInput promptId="prompt-1" onSubmitted={vi.fn()} />);
    expect(screen.getByPlaceholderText('Write your pitch...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('submit button is disabled when input is empty', () => {
    render(<PitchInput promptId="prompt-1" onSubmitted={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('submit button is enabled after typing', async () => {
    const user = userEvent.setup();
    render(<PitchInput promptId="prompt-1" onSubmitted={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Write your pitch...'), 'My pitch');
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });

  it('calls fetch on submit with correct body', async () => {
    const user = userEvent.setup();
    render(<PitchInput promptId="prompt-1" onSubmitted={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Write your pitch...'), 'My pitch');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/prompts/prompt-1/pitches',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'My pitch' }),
      })
    );
  });

  it('shows error on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Something went wrong' }),
    });
    const user = userEvent.setup();
    render(<PitchInput promptId="prompt-1" onSubmitted={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Write your pitch...'), 'My pitch');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('clears input on success', async () => {
    const user = userEvent.setup();
    render(<PitchInput promptId="prompt-1" onSubmitted={vi.fn()} />);
    const textarea = screen.getByPlaceholderText('Write your pitch...');
    await user.type(textarea, 'My pitch');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(textarea).toHaveValue('');
  });

  it('calls onSubmitted on success', async () => {
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    render(<PitchInput promptId="prompt-1" onSubmitted={onSubmitted} />);
    await user.type(screen.getByPlaceholderText('Write your pitch...'), 'My pitch');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it('does not call onSubmitted on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error' }),
    });
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    render(<PitchInput promptId="prompt-1" onSubmitted={onSubmitted} />);
    await user.type(screen.getByPlaceholderText('Write your pitch...'), 'My pitch');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});
