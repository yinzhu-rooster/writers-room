import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopicCard } from './TopicCard';
import type { Topic } from '@/types/database';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/topics/CountdownTimer', () => ({
  CountdownTimer: ({ closesAt }: { closesAt: string }) => (
    <div data-testid="countdown-timer" data-closes-at={closesAt} />
  ),
}));

const baseTopic: Topic & { unique_writers?: number; total_reactions?: number } = {
  id: 'prompt-1',
  body: 'Write a pitch about something funny',
  created_at: '2024-01-01T00:00:00Z',
  closes_at: '2024-01-02T00:00:00Z',
  opens_at: '2024-01-01T00:00:00Z',
  submission_count: 5,
  created_by: 'user-1',
  prompt_type: 'evergreen',
  is_system_generated: false,
  is_closed_processed: false,
};

describe('TopicCard', () => {
  it('renders prompt body', () => {
    render(<TopicCard topic={baseTopic} isOpen={true} />);
    expect(screen.getByText('Write a pitch about something funny')).toBeInTheDocument();
  });

  it('links to correct URL', () => {
    render(<TopicCard topic={baseTopic} isOpen={true} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/topics/prompt-1');
  });

  it('shows pitch count', () => {
    render(<TopicCard topic={baseTopic} isOpen={true} />);
    expect(screen.getByText('5 pitches')).toBeInTheDocument();
  });

  it('shows CountdownTimer when isOpen', () => {
    render(<TopicCard topic={baseTopic} isOpen={true} />);
    expect(screen.getByTestId('countdown-timer')).toBeInTheDocument();
  });

  it('does not show CountdownTimer when closed', () => {
    render(<TopicCard topic={baseTopic} isOpen={false} />);
    expect(screen.queryByTestId('countdown-timer')).not.toBeInTheDocument();
  });

  it('shows "Closed" text when not isOpen', () => {
    render(<TopicCard topic={baseTopic} isOpen={false} />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('does not show "Closed" text when isOpen', () => {
    render(<TopicCard topic={baseTopic} isOpen={true} />);
    expect(screen.queryByText('Closed')).not.toBeInTheDocument();
  });

  it('shows writer count for closed prompts when provided', () => {
    render(<TopicCard topic={{ ...baseTopic, unique_writers: 12 }} isOpen={false} />);
    expect(screen.getByText('12 writers')).toBeInTheDocument();
  });

  it('shows reaction count for closed prompts when provided', () => {
    render(<TopicCard topic={{ ...baseTopic, total_reactions: 42 }} isOpen={false} />);
    expect(screen.getByText('42 reactions')).toBeInTheDocument();
  });

  it('does not show writer count or reaction count for open prompts', () => {
    render(
      <TopicCard
        topic={{ ...baseTopic, unique_writers: 12, total_reactions: 42 }}
        isOpen={true}
      />
    );
    expect(screen.queryByText('12 writers')).not.toBeInTheDocument();
    expect(screen.queryByText('42 reactions')).not.toBeInTheDocument();
  });

  it('passes correct closesAt to CountdownTimer', () => {
    render(<TopicCard topic={baseTopic} isOpen={true} />);
    expect(screen.getByTestId('countdown-timer')).toHaveAttribute(
      'data-closes-at',
      '2024-01-02T00:00:00Z'
    );
  });

  it('shows creator byline for closed prompts', () => {
    render(
      <TopicCard
        topic={{ ...baseTopic, created_by_username: 'EddyEditor', created_by_is_ai: false }}
        isOpen={false}
      />
    );
    expect(screen.getByText('by EddyEditor')).toBeInTheDocument();
  });

  it('does not show creator byline for open prompts', () => {
    render(
      <TopicCard
        topic={{ ...baseTopic, created_by_username: 'EddyEditor', created_by_is_ai: false }}
        isOpen={true}
      />
    );
    expect(screen.queryByText('by EddyEditor')).not.toBeInTheDocument();
  });

  it('shows AI badge next to creator byline when creator is AI', () => {
    render(
      <TopicCard
        topic={{ ...baseTopic, created_by_username: 'EddyEditor', created_by_is_ai: true }}
        isOpen={false}
      />
    );
    expect(screen.getByText('by EddyEditor')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('does not show AI badge when creator is not AI', () => {
    render(
      <TopicCard
        topic={{ ...baseTopic, created_by_username: 'HumanWriter', created_by_is_ai: false }}
        isOpen={false}
      />
    );
    expect(screen.getByText('by HumanWriter')).toBeInTheDocument();
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
  });
});
