import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactionBar } from './ReactionBar';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('ReactionBar', () => {
  it('renders three reaction buttons', () => {
    render(<ReactionBar pitchId="p1" myReaction={null} />);
    expect(screen.getByLabelText('Clever')).toBeInTheDocument();
    expect(screen.getByLabelText('Funny')).toBeInTheDocument();
    expect(screen.getByLabelText('Surprising')).toBeInTheDocument();
  });

  it('highlights the current reaction', () => {
    render(<ReactionBar pitchId="p1" myReaction="laugh" />);
    expect(screen.getByLabelText('Funny')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Clever')).toHaveAttribute('aria-pressed', 'false');
  });

  it('selects a reaction and sends POST', async () => {
    const user = userEvent.setup();
    render(<ReactionBar pitchId="p1" myReaction={null} />);

    await user.click(screen.getByLabelText('Funny'));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/pitches/p1/reactions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reaction_type: 'laugh' }),
      })
    );
    expect(screen.getByLabelText('Funny')).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles off when clicking the same reaction', async () => {
    const user = userEvent.setup();
    render(<ReactionBar pitchId="p1" myReaction="laugh" />);

    await user.click(screen.getByLabelText('Funny'));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/pitches/p1/reactions',
      expect.objectContaining({
        body: JSON.stringify({ reaction_type: 'laugh' }),
      })
    );
    expect(screen.getByLabelText('Funny')).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches directly from one reaction to another', async () => {
    const user = userEvent.setup();
    render(<ReactionBar pitchId="p1" myReaction="smile" />);

    expect(screen.getByLabelText('Clever')).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByLabelText('Funny'));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/pitches/p1/reactions',
      expect.objectContaining({
        body: JSON.stringify({ reaction_type: 'laugh' }),
      })
    );
    expect(screen.getByLabelText('Funny')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Clever')).toHaveAttribute('aria-pressed', 'false');
  });

  it('reverts on API failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const user = userEvent.setup();
    render(<ReactionBar pitchId="p1" myReaction="smile" />);

    await user.click(screen.getByLabelText('Funny'));

    expect(screen.getByLabelText('Clever')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Funny')).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables buttons while loading', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<ReactionBar pitchId="p1" myReaction={null} />);

    await user.click(screen.getByLabelText('Funny'));

    expect(screen.getByLabelText('Clever')).toBeDisabled();
    expect(screen.getByLabelText('Funny')).toBeDisabled();
    expect(screen.getByLabelText('Surprising')).toBeDisabled();
  });

  it('calls onChange after successful reaction', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ReactionBar pitchId="p1" myReaction={null} onChange={onChange} />);

    await user.click(screen.getByLabelText('Funny'));

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
