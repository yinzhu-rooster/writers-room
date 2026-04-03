import type { PromptType } from '@/types/enums';

export interface AIComedian {
  id: string;
  username: string;
  email: string;
  style: string;
}

/**
 * 8 AI comedian bots — each with a distinct comedy archetype.
 * IDs are deterministic UUIDs so they're stable across environments.
 */
export const AI_COMEDIANS: AIComedian[] = [
  {
    id: 'a1000001-0000-0000-0000-000000000001',
    username: 'DeadpanDave',
    email: 'deadpan-dave@writersroom.ai',
    style: 'Dry, deadpan delivery. States absurd things as flat facts.',
  },
  {
    id: 'a1000001-0000-0000-0000-000000000002',
    username: 'PunPatricia',
    email: 'pun-patricia@writersroom.ai',
    style: 'Wordplay addict. Every joke has a pun, double meaning, or groan-worthy twist.',
  },
  {
    id: 'a1000001-0000-0000-0000-000000000003',
    username: 'DarkDoug',
    email: 'dark-doug@writersroom.ai',
    style: 'Dark humor. Takes wholesome setups to unexpectedly morbid places.',
  },
  {
    id: 'a1000001-0000-0000-0000-000000000004',
    username: 'SurrealSally',
    email: 'surreal-sally@writersroom.ai',
    style: 'Absurdist. Non-sequitur logic leaps that somehow land.',
  },
  {
    id: 'a1000001-0000-0000-0000-000000000005',
    username: 'ObservationalOllie',
    email: 'observational-ollie@writersroom.ai',
    style: 'Seinfeld-style observations. Finds the weird in the mundane.',
  },
  {
    id: 'a1000001-0000-0000-0000-000000000006',
    username: 'OneLinerLisa',
    email: 'one-liner-lisa@writersroom.ai',
    style: 'Tight setup-punchline economy. Never uses 10 words when 6 will do.',
  },
  {
    id: 'a1000001-0000-0000-0000-000000000007',
    username: 'RoastMasterMike',
    email: 'roast-master-mike@writersroom.ai',
    style: 'Roast comic. Turns the premise itself into the target.',
  },
  {
    id: 'a1000001-0000-0000-0000-000000000008',
    username: 'WholesomeWendy',
    email: 'wholesome-wendy@writersroom.ai',
    style: 'Clean, family-friendly humor with unexpectedly sweet punchlines.',
  },
];

/**
 * Stub pitch pools per comedian per prompt type.
 * When the Anthropic API is wired up, this gets replaced.
 */
export const COMEDIAN_PITCHES: Record<string, Record<PromptType, string[]>> = {
  // DeadpanDave — flat, matter-of-fact absurdity
  [AI_COMEDIANS[0].id]: {
    headline: [
      'They found it behind the couch.',
      'This is what happens when you let an intern handle celestial inventory.',
      "In their defense, the Moon hasn't been pulling its weight since the tides went subscription-based.",
    ],
    setup: [
      '"You have 11 ranch dressings. We need to talk."',
      '"Your milk expired. Just like your last relationship."',
      '"I see you opened me at 2am again. I logged it."',
    ],
    format: [
      '"You will find love. Not today. Not this year. But statistically, eventually."',
      '"The person sitting across from you is about to sneeze. Move your soup."',
      '"Your lucky number is 0. Make of that what you will."',
    ],
    topical: [
      'Mostly just vibing. That is literally the entire job.',
      'They walk into rooms, say "the energy in here is off," and leave.',
      'Same thing as a regular officer but they get to wear sunglasses indoors.',
    ],
    evergreen: [
      '"We\'re currently fifth in line for the runway. I have made peace with this."',
      '"Good news: we\'re ahead of schedule. Bad news: I don\'t know where we are."',
      '"If you look out the left window, you\'ll see another plane that also looks lost."',
    ],
  },

  // PunPatricia — wordplay queen
  [AI_COMEDIANS[1].id]: {
    headline: [
      'I guess you could say their space program has been... moonlighting.',
      "Talk about a lunar-tic conspiracy.",
      "No wonder the tides have been so low — the Moon's been phoning it in.",
    ],
    setup: [
      '"You\'re running low on eggs. No pressure, but this is an egg-sistential crisis."',
      '"Your ice cream has freezer burn. It\'s an ice way to go."',
      '"You left the door open again. I\'m not cool with it. Wait, yes I am. I\'m a fridge."',
    ],
    format: [
      '"A stranger will compliment your shoes. Shoe-per exciting, I know."',
      '"You will make a decision today. It will be the wrong one. Fortune-ately, no one will notice."',
      '"An old friend will reach out. Unfortunately, they sell essential oils."',
    ],
    topical: [
      'They bring the office vibe-tamins.',
      "It's like HR but with better playlists and worse accountability.",
      "They're responsible for the vibe-ration of the whole company. It's a re-vibe-al.",
    ],
    evergreen: [
      '"This is your captain speaking. Or is it? Honestly, who can say in this economy."',
      '"Please fasten your seatbelts. I just saw something outside that made me fasten mine."',
      '"We\'ll be landing shortly. And by shortly, I mean in the loosest possible sense."',
    ],
  },

  // DarkDoug — dark humor
  [AI_COMEDIANS[2].id]: {
    headline: [
      "They didn't lose it. They just stopped making eye contact with it after what happened in 2019.",
      'The flashlight is named Gerald. Gerald is tired.',
      "At least we still have the Sun. For now.",
    ],
    setup: [
      '"I noticed you eat when you\'re sad. Based on my data, you\'re always sad."',
      '"You have 47 condiments and no will to live. Should I reorder both?"',
      '"Your groceries suggest you\'re either hosting a party or giving up. I hope it\'s a party."',
    ],
    format: [
      '"Help is not coming. Enjoy the shrimp."',
      '"You will find what you\'re looking for. It will not be what you wanted."',
      '"Today\'s lucky number is the number of days since you last felt joy. You already know it."',
    ],
    topical: [
      "They declared the office vibes 'dead' on their first day and no one has recovered.",
      'They fired someone for having bad energy. That person was the CFO.',
      "They just stare at the office plant and whisper 'same.'",
    ],
    evergreen: [
      '"This is your captain speaking. I\'m going to be honest with you, which I realize is a first."',
      '"Ladies and gentlemen, I have good news and bad news. They are the same news."',
      '"If you look out the window you\'ll see exactly what I saw five minutes ago when I went quiet."',
    ],
  },

  // SurrealSally — absurdist non-sequiturs
  [AI_COMEDIANS[3].id]: {
    headline: [
      "The Moon left voluntarily. It's doing ceramics in Portland now.",
      "They replaced it with a large round cheese but nobody noticed because cheese is also mysterious.",
      "The Moon texted back: 'new orbit who dis.'",
    ],
    setup: [
      '"The eggs are plotting something. I can hear them. Don\'t open the second shelf."',
      '"I am no longer a fridge. I have transcended. I am a cold idea with shelves."',
      '"A bird got in. I didn\'t let it out. We\'re roommates now."',
    ],
    format: [
      '"You will meet yourself in a parking garage. Do not make eye contact."',
      '"Tuesday has been canceled. Proceed directly to Thursday."',
      '"The spoon knows what you did. Return it to the drawer slowly."',
    ],
    topical: [
      "They replaced all the chairs with beanbags and now nobody can get up. The vibes are technically great. Everyone is trapped.",
      'They communicate exclusively through interpretive dance and a gong they brought from home.',
      "They said the vibe was 'chartreuse' and everyone pretended to understand.",
    ],
    evergreen: [
      '"This is your pilot. I am also your dentist. Small world. Open wide."',
      '"We will be arriving at our destination, which I have been informed does not exist."',
      '"Please direct your attention to the flight attendant, who is my mother. Be nice to her."',
    ],
  },

  // ObservationalOllie — Seinfeld style
  [AI_COMEDIANS[4].id]: {
    headline: [
      "What's the deal with NASA? They can land a rover on Mars but they lose the one big thing that's RIGHT THERE every night?",
      "You ever notice how NASA announces stuff like this on a Friday afternoon? Like we won't check?",
      "Losing the Moon is peak 'we'll deal with it Monday' energy.",
    ],
    setup: [
      "Why does it always say 'door ajar'? I KNOW the door is ajar. I JUST opened it.",
      "It says 'buy more water.' I HAVE water. From the TAP. But no, the fridge doesn't count tap water.",
      "Who asked the fridge to have opinions? I didn't sign up for a relationship with an appliance.",
    ],
    format: [
      '"You will say \'I should go to bed\' and then not go to bed. You know this. I know this."',
      '"Someone will ask how you are and you will say fine. We both know the deal here."',
      '"You will lose your keys in the one place you already checked twice."',
    ],
    topical: [
      "Have you ever noticed there's always someone at work whose ENTIRE job is just 'being in the room'? That's the CVO.",
      "What IS a vibe? And how do you officer it? Is there a vibe gun? A vibe badge?",
      "The CVO is just the person who picks the office playlist. That's it. That's the whole gig.",
    ],
    evergreen: [
      '"We\'re experiencing some turbulence, but honestly, who ISN\'T these days?"',
      '"This is your captain. I just want you to know, I\'m having a weird day too."',
      '"If everyone could just stay calm. Staying calm is really more of a suggestion."',
    ],
  },

  // OneLinerLisa — tight and economical
  [AI_COMEDIANS[5].id]: {
    headline: [
      "NASA lost the Moon. HR is calling it a 'restructuring.'",
      'They lost the Moon but at least they still have their parking spot.',
      "The Moon's been gone since 2019? So have my hopes, but nobody's funding THAT search.",
    ],
    setup: [
      '"You eat cheese at 1am like it owes you money."',
      '"New notification: you\'re out of dignity. And also eggs."',
      '"Low battery. Both of us."',
    ],
    format: [
      '"Avoid eye contact with anyone named Steve today."',
      '"Something you lost will return. It will be worse."',
      '"Today is not your day. Tomorrow\'s not looking great either."',
    ],
    topical: [
      "Nobody knows. Including them.",
      "They attend meetings that could've been emails and call it 'culture work.'",
      "It's a hall monitor with a podcast.",
    ],
    evergreen: [
      '"So... does anyone know how to fly a plane? Asking for me."',
      '"Left engine update: we no longer have a left engine."',
      '"This is a pre-recorded message. Good luck."',
    ],
  },

  // RoastMasterMike — roasts the premise
  [AI_COMEDIANS[6].id]: {
    headline: [
      "NASA's budget is $25 billion a year and they LOST the Moon? My cousin lost a Honda Civic and even he had a better excuse.",
      "You're telling me they can track a satellite the size of a toaster but the MOON was too subtle?",
      "The flashlight story is what my 5-year-old would come up with. NASA just has better fonts.",
    ],
    setup: [
      '"You bought kale three weeks ago. It\'s still in here. We both know you\'re not eating it. Stop lying to yourself."',
      '"You opened me 14 times today and took nothing. I\'m a fridge, not a therapist."',
      '"Your leftovers have leftovers. This is a cry for help."',
    ],
    format: [
      '"You will start a diet on Monday. You will not. This has been your fortune since 2014."',
      '"Love is around the corner. So is a Taco Bell. We both know which one you\'re going to."',
      '"You\'re about to make a bold decision. No you\'re not. You\'re going to order the same thing you always order."',
    ],
    topical: [
      "They get paid six figures to tell you the meeting room 'feels heavy.' YOUR MORTGAGE feels heavy.",
      'Imagine getting a salary for saying things like "let\'s unpack that energy." I\'m in the wrong business.',
      "The CVO told me my aura was 'beige.' I told them their job is made up. We're both right.",
    ],
    evergreen: [
      '"I\'d like to be honest with you all, but my lawyer said I shouldn\'t do that anymore."',
      '"This is your captain. I got my license the same place I got my degree. Online. During COVID."',
      '"If you look out the right side of the aircraft, you\'ll see the left side of a different aircraft that\'s way too close."',
    ],
  },

  // WholesomeWendy — clean, sweet twist
  [AI_COMEDIANS[7].id]: {
    headline: [
      "Maybe the Moon just needed some alone time. Self-care is important, even for celestial bodies.",
      "The good news is the stars are still there. And honestly, they've been doing great without the Moon stealing the spotlight.",
      "NASA lost the Moon but they haven't lost hope. And that's what really lights up the night sky.",
    ],
    setup: [
      '"You seem tired. I made the milk extra cold for you. You deserve cold milk."',
      '"I noticed you\'ve been eating healthier! I\'m so proud of you. The cake is behind the yogurt though, I won\'t judge."',
      '"Welcome home! I kept everything fresh, just like our friendship."',
    ],
    format: [
      '"Someone is thinking about you right now. Yes, even on a Tuesday."',
      '"Your lucky number is every number because you are enough."',
      '"Today you will make someone smile. Also, drink more water."',
    ],
    topical: [
      "They make sure everyone feels included and heard. And honestly, that's beautiful. Every office needs someone who cares about the vibes.",
      'They check on the interns. They remember birthdays. They brought a plant for the break room. They are the vibe.',
      "They don't have KPIs but they have kindness performance indicators and honestly, isn't that better?",
    ],
    evergreen: [
      '"Hi everyone, this is your captain! Just wanted to say I think you\'re all doing great today and I\'m really glad you chose this flight."',
      '"We\'re going through some bumps but that\'s okay. Even the sky has rough days."',
      '"I love my job. I love this plane. I love all of you. Please keep your seatbelts on."',
    ],
  },
};
