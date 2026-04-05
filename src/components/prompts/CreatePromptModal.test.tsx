import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePromptModal } from './CreatePromptModal';

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
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'new-prompt' }) });
});

describe('CreatePromptModal', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <CreatePromptModal open={false} onClose={vi.fn()} onCreated={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders form when open', () => {
    render(<CreatePromptModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write your comedy prompt...')).toBeInTheDocument();
  });

  it('submit button is disabled when body is empty', () => {
    render(<CreatePromptModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('submit button is enabled after typing', async () => {
    const user = userEvent.setup();
    render(<CreatePromptModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Write your comedy prompt...'), 'My prompt');
    expect(screen.getByRole('button', { name: 'Create' })).not.toBeDisabled();
  });

  it('calls fetch POST on submit', async () => {
    const user = userEvent.setup();
    render(<CreatePromptModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Write your comedy prompt...'), 'My prompt');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/prompts',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'My prompt', prompt_type: 'evergreen', duration_hours: 24 }),
      })
    );
  });

  it('shows error on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Creation failed' }),
    });
    const user = userEvent.setup();
    render(<CreatePromptModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Write your comedy prompt...'), 'My prompt');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('Creation failed')).toBeInTheDocument();
  });

  it('resets and calls callbacks on success', async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CreatePromptModal open={true} onClose={onClose} onCreated={onCreated} />);
    await user.type(screen.getByPlaceholderText('Write your comedy prompt...'), 'My prompt');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CreatePromptModal open={true} onClose={onClose} onCreated={vi.fn()} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CreatePromptModal open={true} onClose={onClose} onCreated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
