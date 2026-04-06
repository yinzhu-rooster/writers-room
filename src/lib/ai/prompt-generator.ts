import type { PromptType } from '@/types/enums';

interface GeneratedPrompt {
  body: string;
  prompt_type: PromptType;
}

// ---------------------------------------------------------------------------
// Prompt pools — short-answer comedy prompts that invite quick, punchy pitches
// Each pool has 20+ entries so daily picks stay fresh for months
// ---------------------------------------------------------------------------

const HEADLINES: string[] = [
  // Fake headlines — pitch the joke, not a whole article
  'NASA just admitted they lost the Moon. What actually happened?',
  'Scientists confirm your dog is judging you. What for?',
  'Florida Man elected mayor. First executive order?',
  'A billionaire just bought the concept of Tuesdays. What changes?',
  'Airlines now charging for gravity. What\'s the fee structure?',
  'The internet went down for 24 hours. What happened in your town?',
  'Robots are now eligible for jury duty. What goes wrong?',
  'A new study says sitting is worse than we thought. How much worse?',
  'LinkedIn just added a dislike button. What\'s the first post to get ratio\'d?',
  'The U.S. just added a 51st state. What is it and why?',
  'Elon Musk buys the alphabet. What\'s the first letter he renames?',
  'Congress accidentally passes a useful law. What is it?',
  'Gen Z officially cancels a day of the week. Which one and why?',
  'Your phone\'s screen time report just filed a wellness check on you. What did it say?',
  'Amazon now delivers before you order. What shows up?',
  'A typo in a government email just created a new holiday. What is it?',
  'Autocorrect just ruined an international peace summit. What did it change?',
  'A cat has gone viral for doing taxes better than most adults. What\'s its method?',
  'The DMV just launched a streaming service. What\'s the first show?',
  'Scientists discover that one common food has been lying to us. Which one and about what?',
];

const SETUPS: string[] = [
  // Quick punch-up — finish the thought in a line or two
  'The worst thing your smart fridge has ever said to you',
  'The most unhinged thing you\'ve whispered to a printer',
  'The push notification that finally made you delete an app',
  'Your WiFi password but it\'s brutally honest about your life',
  'The one thing your Roomba has definitely seen that it shouldn\'t have',
  'A text from your dentist that would make you switch dentists immediately',
  'The email subject line that makes your heart stop',
  'Your Uber driver\'s most unsettling small talk opener',
  'The voicemail your future self leaves you',
  'The thing your coworker does that isn\'t technically a crime but should be',
  'The honest version of \"let\'s circle back on this\"',
  'The scariest sentence that starts with \"per my last email\"',
  'A LinkedIn endorsement you absolutely did not ask for',
  'The most passive-aggressive thing a GPS has ever said',
  'The thing your dog would say if it could talk for exactly 5 seconds',
  'What your plant is thinking right now',
  'The hold music lyric that finally broke you',
  'A warning label that should exist but doesn\'t',
  'The worst flavor of anything ever invented',
  'The most ominous thing a toddler has ever said',
];

const FORMATS: string[] = [
  // Constrained format — the answer IS the joke
  'A fortune cookie that\'s a little too specific',
  'A Yelp review of your last dream',
  'Name a candle that smells like a very specific life experience',
  'A new Gatorade flavor for a very niche situation',
  'An honest out-of-office auto-reply',
  'A beer named after your worst habit',
  'A TED Talk title that would get you escorted out',
  'A dating app bio written by your ex',
  'A street named after your biggest flaw',
  'An IKEA product name for an emotion',
  'A self-help book title that\'s technically accurate but deeply unhelpful',
  'A breakfast cereal for adults with anxiety',
  'A Hallmark card for a situation that doesn\'t have one yet',
  'A band name that\'s just your last Google search',
  'A cocktail named after a Monday morning feeling',
  'An honest movie rating between PG-13 and R',
  'A national park named after a personal failure',
  'A prescription drug name for a fake condition you definitely have',
  'An honest slogan for your hometown',
  'A vanity license plate that tells too much',
];

const TOPICALS: string[] = [
  // Riffs on culture — one-liner territory
  'What does a Chief Vibes Officer actually do all day?',
  'Explain crypto to a medieval peasant',
  'The honest reason your favorite show got canceled',
  'What\"quiet quitting\" looks like at the North Pole',
  'The real reason nobody wants to return to the office',
  'What influencers would have been in the 1800s',
  'An AI\'s first day at a job it wasn\'t trained for',
  'The next thing that\'ll be a subscription service',
  'How a caveman would react to a modern grocery store',
  'What the metaverse is being used for now that nobody\'s watching',
  'The real conversation happening in every Zoom meeting chat',
  'What\"work-life balance\" means at different companies',
  'A new Olympic sport based on something everyone does at work',
  'The worst rebrand of all time',
  'What\"unlimited PTO\" actually translates to',
  'How a boomer and a Gen Z would describe the same restaurant',
  'The next everyday thing that\'ll require a 47-step tutorial on YouTube',
  'The most dystopian thing we\'ve all just accepted as normal',
  'What aliens think Earth\'s main export is based on our internet',
  'A startup pitch that\'s just a thing that already exists but worse',
];

const EVERGREENS: string[] = [
  // Open-ended absurd premises — keep it to a pitch, not a screenplay
  'The most alarming thing a pilot could say over the intercom',
  'Worst thing to say when someone shows you their baby',
  'A superhero whose power is mildly useful at best',
  'The most stressful low-stakes situation possible',
  'An invention that solves a problem nobody has',
  'The worst theme for a children\'s birthday party',
  'A sport that would exist if we invented sports today',
  'The scariest thing to find in your search history that you don\'t remember searching',
  'A conspiracy theory that\'s just barely plausible',
  'The worst possible name for a hospital',
  'What the employee break room in hell is like',
  'A ride at the world\'s worst theme park',
  'The least reassuring thing a surgeon could say before operating',
  'A reality show that would end friendships',
  'The worst souvenir from any vacation',
  'A class offered at the worst university ever',
  'The most unsettling thing a house could say if houses could talk',
  'A holiday that only you would celebrate',
  'The world record nobody wants to hold',
  'The worst way to find out you\'re famous',
];

const POOLS: Record<PromptType, string[]> = {
  headline: HEADLINES,
  setup: SETUPS,
  format: FORMATS,
  topical: TOPICALS,
  evergreen: EVERGREENS,
};

// ---------------------------------------------------------------------------
// Seeded random — deterministic per day so re-runs pick the same prompts
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x80000000;
  };
}

function daySeed(): number {
  const now = new Date();
  // Compute ET offset manually to avoid locale-dependent toLocaleString parsing
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const etOffset = isDST(now) ? -4 : -5;
  const et = new Date(utc + etOffset * 3600_000);
  return et.getFullYear() * 10000 + (et.getMonth() + 1) * 100 + et.getDate();
}

function isDST(date: Date): boolean {
  // US Eastern: DST from 2nd Sunday of March to 1st Sunday of November
  const year = date.getUTCFullYear();
  const marchSecondSunday = new Date(Date.UTC(year, 2, 8));
  marchSecondSunday.setUTCDate(8 + (7 - marchSecondSunday.getUTCDay()) % 7);
  marchSecondSunday.setUTCHours(7); // 2AM ET = 7AM UTC
  const novFirstSunday = new Date(Date.UTC(year, 10, 1));
  novFirstSunday.setUTCDate(1 + (7 - novFirstSunday.getUTCDay()) % 7);
  novFirstSunday.setUTCHours(6); // 2AM ET (EDT) = 6AM UTC
  return date.getTime() >= marchSecondSunday.getTime() && date.getTime() < novFirstSunday.getTime();
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ---------------------------------------------------------------------------
// Public API — drop-in replacement for the future Anthropic-powered version
// ---------------------------------------------------------------------------

/**
 * Generate 5 comedy prompts — one per type.
 *
 * Currently picks from curated pools using a day-seeded RNG.
 * When ready, swap this implementation for the Anthropic API call.
 */
export async function generatePrompts(): Promise<GeneratedPrompt[]> {
  const rand = seededRandom(daySeed());
  const types: PromptType[] = ['headline', 'setup', 'format', 'topical', 'evergreen'];

  return types.map((type) => ({
    body: pick(POOLS[type], rand),
    prompt_type: type,
  }));
}
