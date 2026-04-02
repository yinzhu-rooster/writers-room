interface RawPitch {
  id: string;
  prompt_id: string;
  body: string;
  user_id: string;
  created_at: string;
  edited_at: string | null;
  laugh_count: number;
  smile_count: number;
  surprise_count: number;
  total_reaction_count: number;
  rank: number | null;
  is_revealed: boolean;
  users: unknown;
  reactions: unknown;
}

interface SerializeOptions {
  currentUserId: string | null;
  isOpen: boolean;
  closesAt: string;
}

export function serializePitch(pitch: RawPitch, opts: SerializeOptions) {
  const { currentUserId, isOpen, closesAt } = opts;
  const isOwn = currentUserId === pitch.user_id;

  const myReaction = currentUserId
    ? (pitch.reactions as { reaction_type: string; user_id: string }[])?.find(
        (r) => r.user_id === currentUserId
      )?.reaction_type ?? null
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
        new Date(pitch.created_at).getTime() + 5 * 60 * 1000,
        new Date(closesAt).getTime()
      )
    ).toISOString();

    return {
      ...base,
      user_id: isOwn ? pitch.user_id : null,
      username: null,
      laugh_count: null,
      smile_count: null,
      surprise_count: null,
      total_reaction_count: null,
      rank: null,
      is_revealed: false,
      edit_deadline: isOwn ? editDeadline : null,
    };
  }

  const pitchUser = pitch.users as { username: string } | null;
  return {
    ...base,
    user_id: pitch.is_revealed || isOwn ? pitch.user_id : null,
    username: pitch.is_revealed || isOwn ? pitchUser?.username ?? null : null,
    laugh_count: pitch.laugh_count,
    smile_count: pitch.smile_count,
    surprise_count: pitch.surprise_count,
    total_reaction_count: pitch.total_reaction_count,
    rank: pitch.rank,
    is_revealed: pitch.is_revealed,
    edit_deadline: null,
  };
}
