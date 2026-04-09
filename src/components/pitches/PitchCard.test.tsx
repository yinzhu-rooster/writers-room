import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PitchCard } from './PitchCard';
import type { PitchData } from './PitchCard';

vi.mock('@/components/reactions/ReactionBar', () => ({
  ReactionBar: ({ pitchId }: { pitchId: string }) => (
    <div data-testid="reaction-bar" data-pitch-id={pitchId} />
  ),
}));

vi.mock('@/components/reactions/ReactionCounts', () => ({
  ReactionCounts: ({ laugh, smile, surprise }: { laugh: number; smile: number; surprise: number }) => (
    <div data-testid="reaction-counts" data-laugh={laugh} data-smile={smile} data-surprise={surprise} />
  ),
}));

const basePitch: PitchData = {
  id: 'pitch-1',
  prompt_id: 'prompt-1',
  body: 'This is my pitch body',
  user_id: 'user-1',
  username: 'testuser',
  created_at: '2024-01-01T00:00:00Z',
  edited_at: null,
  is_own: false,
  my_reaction: null,
  laugh_count: 0,
  smile_count: 0,
  surprise_count: 0,
  total_reaction_count: 0,
  rank: null,
  is_revealed: false,
  is_ai: false,
  edit_deadline: null,
};

describe('PitchCard', () => {
  it('renders pitch body', () => {
    render(<PitchCard pitch={basePitch} isOpen={true} />);
    expect(screen.getByText('This is my pitch body')).toBeInTheDocument();
  });

  it('shows "You" label when is_own', () => {
    render(<PitchCard pitch={{ ...basePitch, is_own: true }} isOpen={true} />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('does not show "You" label when not is_own', () => {
    render(<PitchCard pitch={basePitch} isOpen={true} />);
    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });

  it('shows "(edited)" when edited_at is set', () => {
    render(<PitchCard pitch={{ ...basePitch, edited_at: '2024-01-02T00:00:00Z' }} isOpen={true} />);
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });

  it('does not show "(edited)" when edited_at is null', () => {
    render(<PitchCard pitch={basePitch} isOpen={true} />);
    expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
  });

  it('shows username for closed revealed pitches (not own)', () => {
    render(
      <PitchCard
        pitch={{ ...basePitch, is_own: false, is_revealed: true, username: 'testuser' }}
        isOpen={false}
      />
    );
    expect(screen.getByText('by testuser')).toBeInTheDocument();
  });

  it('does not show username when is_own even if revealed and closed', () => {
    render(
      <PitchCard
        pitch={{ ...basePitch, is_own: true, is_revealed: true, username: 'testuser' }}
        isOpen={false}
      />
    );
    expect(screen.queryByText('by testuser')).not.toBeInTheDocument();
  });

  it('does not show username when not revealed on closed prompt', () => {
    render(
      <PitchCard
        pitch={{ ...basePitch, is_own: false, is_revealed: false, username: 'testuser' }}
        isOpen={false}
      />
    );
    expect(screen.queryByText('by testuser')).not.toBeInTheDocument();
  });

  it('shows action button when is_own and isOpen', async () => {
    render(<PitchCard pitch={{ ...basePitch, is_own: true }} isOpen={true} />);
    expect(screen.getByLabelText('Pitch actions')).toBeInTheDocument();
  });

  it('does not show action button when not is_own', () => {
    render(<PitchCard pitch={basePitch} isOpen={true} />);
    expect(screen.queryByLabelText('Pitch actions')).not.toBeInTheDocument();
  });

  it('does not show action button when closed', () => {
    render(<PitchCard pitch={{ ...basePitch, is_own: true }} isOpen={false} />);
    expect(screen.queryByLabelText('Pitch actions')).not.toBeInTheDocument();
  });

  it('calls onDelete when delete is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <PitchCard
        pitch={{ ...basePitch, is_own: true }}
        isOpen={true}
        onDelete={onDelete}
      />
    );
    await user.click(screen.getByLabelText('Pitch actions'));
    await user.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('pitch-1');
  });

  it('calls onEdit when edit is clicked within edit window', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const futureDeadline = new Date(Date.now() + 60000).toISOString();
    render(
      <PitchCard
        pitch={{ ...basePitch, is_own: true, edit_deadline: futureDeadline }}
        isOpen={true}
        onEdit={onEdit}
      />
    );
    await user.click(screen.getByLabelText('Pitch actions'));
    await user.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith('pitch-1', 'This is my pitch body');
  });

  it('does not show edit button when edit deadline has passed', async () => {
    const user = userEvent.setup();
    const pastDeadline = new Date(Date.now() - 60000).toISOString();
    render(
      <PitchCard
        pitch={{ ...basePitch, is_own: true, edit_deadline: pastDeadline }}
        isOpen={true}
      />
    );
    await user.click(screen.getByLabelText('Pitch actions'));
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('shows ReactionBar when isOpen and not own', () => {
    render(<PitchCard pitch={basePitch} isOpen={true} />);
    expect(screen.getByTestId('reaction-bar')).toBeInTheDocument();
  });

  it('does not show ReactionBar when is_own', () => {
    render(<PitchCard pitch={{ ...basePitch, is_own: true }} isOpen={true} />);
    expect(screen.queryByTestId('reaction-bar')).not.toBeInTheDocument();
  });

  it('shows ReactionCounts when closed', () => {
    render(<PitchCard pitch={basePitch} isOpen={false} />);
    expect(screen.getByTestId('reaction-counts')).toBeInTheDocument();
  });

  it('does not show ReactionCounts when open', () => {
    render(<PitchCard pitch={basePitch} isOpen={true} />);
    expect(screen.queryByTestId('reaction-counts')).not.toBeInTheDocument();
  });

  it('renders RankBadge when rank is not null', () => {
    render(<PitchCard pitch={{ ...basePitch, rank: 1 }} isOpen={false} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('does not render RankBadge when rank is null', () => {
    render(<PitchCard pitch={basePitch} isOpen={false} />);
    expect(screen.queryByText(/#\d/)).not.toBeInTheDocument();
  });

  it('shows AI badge next to username for AI comedians on closed prompts', () => {
    render(
      <PitchCard
        pitch={{ ...basePitch, is_own: false, is_revealed: true, username: 'DeadpanDave', is_ai: true }}
        isOpen={false}
      />
    );
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('does not show AI badge for non-AI users on closed prompts', () => {
    render(
      <PitchCard
        pitch={{ ...basePitch, is_own: false, is_revealed: true, username: 'humanwriter', is_ai: false }}
        isOpen={false}
      />
    );
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
  });
});
