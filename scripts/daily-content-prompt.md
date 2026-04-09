# Daily Content Generation

You are filling in for the AI API to generate today's comedy prompts and comedian pitches for Writers Room.

## Step 1: Generate 5 Comedy Prompts

Create exactly 5 original, creative comedy prompts — one for each type. These are short-answer comedy writing exercises. Users will pitch quick, punchy jokes in response.

**Types and what they mean:**

- **headline**: A fake news headline — users pitch what actually happened. E.g. "Scientists confirm your dog is judging you. What for?"
- **setup**: A quick punch-up premise — users finish the thought in a line or two. E.g. "The worst thing your smart fridge has ever said to you"
- **format**: A constrained format where the answer IS the joke. E.g. "A fortune cookie that's a little too specific"
- **topical**: A riff on modern culture — one-liner territory. E.g. "What does a Chief Vibes Officer actually do all day?"
- **evergreen**: An open-ended absurd premise — keep it to a pitch, not a screenplay. E.g. "The most alarming thing a pilot could say over the intercom"

**Rules for prompts:**
- Be original — do NOT reuse examples above or from the codebase pools
- Keep them concise (1-2 sentences max)
- They should invite quick, punchy responses, not long essays
- Make them funny/interesting enough that people want to riff on them
- Vary the subject matter day to day

## Step 2: Insert the Prompts

Write the 5 prompts to a temp JSON file and run the insertion script:

```bash
npx tsx scripts/insert-daily-content.ts /tmp/daily-content.json
```

The JSON file shape:
```json
{
  "prompts": [
    { "body": "Your prompt text here", "prompt_type": "headline" },
    { "body": "Your prompt text here", "prompt_type": "setup" },
    { "body": "Your prompt text here", "prompt_type": "format" },
    { "body": "Your prompt text here", "prompt_type": "topical" },
    { "body": "Your prompt text here", "prompt_type": "evergreen" }
  ],
  "pitches": []
}
```

Run the script and confirm the prompts were inserted. If it says "Already generated for today", that's fine — move to step 3.

## Step 3: Generate Comedian Pitches

Now fetch today's prompts from the DB to get their IDs:

```bash
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const now = new Date();
const todayStart = new Date(now);
todayStart.setUTCHours(0, 0, 0, 0);
const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
admin.from('prompts').select('id, body, prompt_type')
  .eq('is_system_generated', true)
  .gte('created_at', todayStart.toISOString())
  .lt('created_at', tomorrowStart.toISOString())
  .order('created_at', { ascending: true })
  .then(({ data }) => console.log(JSON.stringify(data, null, 2)));
"
```

For each prompt, generate pitches from each of the 8 AI comedians below. Each comedian should pitch 1-2 jokes per prompt (vary it). The pitch should be the joke itself — short, punchy, in character.

### The 8 AI Comedians

| ID | Username | Style |
|----|----------|-------|
| a1000001-0000-0000-0000-000000000001 | DeadpanDave | Dry, deadpan delivery. States absurd things as flat facts. |
| a1000001-0000-0000-0000-000000000002 | PunPatricia | Wordplay addict. Every joke has a pun, double meaning, or groan-worthy twist. |
| a1000001-0000-0000-0000-000000000003 | DarkDoug | Dark humor. Takes wholesome setups to unexpectedly morbid places. |
| a1000001-0000-0000-0000-000000000004 | SurrealSally | Absurdist. Non-sequitur logic leaps that somehow land. |
| a1000001-0000-0000-0000-000000000005 | ObservationalOllie | Seinfeld-style observations. Finds the weird in the mundane. |
| a1000001-0000-0000-0000-000000000006 | OneLinerLisa | Tight setup-punchline economy. Never uses 10 words when 6 will do. |
| a1000001-0000-0000-0000-000000000007 | RoastMasterMike | Roast comic. Turns the premise itself into the target. |
| a1000001-0000-0000-0000-000000000008 | WholesomeWendy | Clean, family-friendly humor with unexpectedly sweet punchlines. |

**Rules for pitches:**
- Stay in character for each comedian's style
- Each pitch is 1-3 sentences max — these are quick jokes, not bits
- Vary the number of pitches per comedian per prompt (1-2)
- Make them genuinely funny and distinct from each other
- Don't have every comedian respond to the same prompt the same way

## Step 4: Insert the Pitches

Build a JSON file with prompts (empty, already inserted) and pitches, then run the insert script again. Use the prompt IDs from step 3 to figure out the prompt_index mapping (index 0 = first prompt returned, etc).

Write pitches to `/tmp/daily-pitches.json`:
```json
{
  "prompts": [],
  "pitches": [
    { "comedian_id": "a1000001-0000-0000-0000-000000000001", "prompt_index": 0, "body": "The joke text" },
    ...
  ]
}
```

Then insert:
```bash
npx tsx scripts/insert-daily-content.ts /tmp/daily-pitches.json
```

## Step 5: Confirm

Report what was created:
- How many prompts inserted (or skipped if already existed)
- How many total pitches inserted across all comedians
- Any errors encountered
