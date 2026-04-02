import Anthropic from '@anthropic-ai/sdk';
import type { PromptType } from '@/types/enums';

const PROMPT_TYPES: PromptType[] = ['headline', 'setup', 'format', 'topical', 'evergreen'];

interface GeneratedPrompt {
  body: string;
  prompt_type: PromptType;
}

export async function generatePrompts(): Promise<GeneratedPrompt[]> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Generate exactly 5 comedy writing prompts for a writers room. Each prompt should be a different type. Mix it up — include topical headlines needing jokes, setups needing punchlines, format constraints ("write a fake Yelp review for..."), and absurdist premises.

Types (use exactly one of each): headline, setup, format, topical, evergreen

Return ONLY valid JSON array, no markdown, no explanation:
[{"body": "prompt text here", "prompt_type": "headline"}, ...]`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse AI response');

  const parsed = JSON.parse(jsonMatch[0]) as Array<{ body: string; prompt_type: string }>;

  if (!Array.isArray(parsed) || parsed.length !== 5) {
    throw new Error(`Expected 5 prompts, got ${parsed?.length ?? 0}`);
  }

  return parsed.map((p, i) => ({
    body: p.body,
    prompt_type: PROMPT_TYPES.includes(p.prompt_type as PromptType)
      ? (p.prompt_type as PromptType)
      : PROMPT_TYPES[i % PROMPT_TYPES.length],
  }));
}
