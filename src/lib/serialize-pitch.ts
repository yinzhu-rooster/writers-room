import type { PitchWithRelations } from '@/types/database';
import { EDIT_WINDOW_MS } from '@/lib/constants';

type RawPitch = PitchWithRelations;

interface SerializeOptions {
  currentUserId: string | null;
  isOpen: boolean;
  closesAt: string;
  minReactionsForReveal?: number;
}

export function serializePitch(pitch: RawPitch, opts: SerializeOptions) {
  const { currentUserId, isOpen, closesAt } = opts;
  const isOwn = currentUserId === pitch.user_id;

  const myReaction = currentUserId
    ? pitch.reactions?.find((r) => r.user_id === currentUserId)?.reaction_type ?? null
    : null;

  const base = {
    id: pitch.id,
    prompt_id: pitch.prompt_id,
    body: pitch.body,
    created_at: pitch.created_at,
    edited_at: pitch.edited_at,
    is_own: isOwn,
    my_reaction: myReaction,
  };

  if (isOpen) {
    const editDeadline = new Date(
      Math.min(
        new Date(pitch.created_at).getTime() + EDIT_WINDOW_MS,
        new Date(closesAt).getTime()
      )
    ).toISOString();

    return {
      ...base,
      user_id: isOwn ? pitch.user_id : null,
      username: null,
      is_ai: isOwn ? (pitch.users?.is_ai ?? false) : false,
      laugh_count: null,
      smile_count: null,
      surprise_count: null,
      total_reaction_count: null,
      rank: null,
      is_revealed: false,
      edit_deadline: isOwn ? editDeadline : null,
    };
  }

  const showByline = isOwn || pitch.total_reaction_count >= (opts.minReactionsForReveal ?? 3);
  return {
    ...base,
    user_id: showByline ? pitch.user_id : null,
    username: showByline ? pitch.users?.username ?? null : null,
    is_ai: showByline ? (pitch.users?.is_ai ?? false) : false,
    laugh_count: pitch.laugh_count,
    smile_count: pitch.smile_count,
    surprise_count: pitch.surprise_count,
    total_reaction_count: pitch.total_reaction_count,
    rank: pitch.rank,
    is_revealed: pitch.is_revealed,
    edit_deadline: null,
  };
}
