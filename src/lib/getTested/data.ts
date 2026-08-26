import { Band, Cluster, ClusterId, IntakeStep, ItemStep, Step } from './types'

/**
 * Cluster accent colors map to the site's existing @theme tokens
 * (src/styles/global.css) rather than the spec prototype's own hex values,
 * so this page shares the site's palette instead of introducing new colors.
 */
export const CLUSTERS: Record<ClusterId, Cluster> = {
  A: {
    id: 'A',
    name: 'Intrusion',
    tagline: 'The chart follows you home.',
    color: 'var(--color-main-red)',
    resultType: 'THE HAUNTED',
    typeLine: 'You still see the wick.',
  },
  B: {
    id: 'B',
    name: 'Avoidance',
    tagline: "It's still there whether you look or not.",
    color: 'var(--color-main-cyan)',
    resultType: 'THE GHOST',
    typeLine: "The wallet is fine. You just don't go in there.",
  },
  C: {
    id: 'C',
    name: 'Cognition',
    tagline: "The part that doesn't come back.",
    color: 'var(--color-main-purple)',
    resultType: 'THE CYNIC',
    typeLine: "Everything is a rug. You're usually right. That's the problem.",
  },
  D: {
    id: 'D',
    name: 'Hypervigilance',
    tagline: 'Nobody is coming, so you watch.',
    color: 'var(--color-main-yellow)',
    resultType: 'THE SENTINEL',
    typeLine: 'You have not slept properly since 2021 and you consider this an edge.',
  },
  E: {
    id: 'E',
    name: 'Dissociation',
    tagline: 'It stopped being money a while ago.',
    color: 'var(--color-main-green)',
    resultType: 'THE NPC',
    typeLine: "You're not playing anymore. You're just still logged in.",
  },
}

export const CLUSTER_TEXT_CLASS: Record<ClusterId, string> = {
  A: 'text-main-red',
  B: 'text-main-cyan',
  C: 'text-main-purple',
  D: 'text-main-yellow',
  E: 'text-main-green',
}

export const CLUSTER_ORDER: ClusterId[] = ['A', 'B', 'C', 'D', 'E']

export const RESPONSE_SCALE: string[] = [
  'Never',
  'Once or twice',
  'Some weeks',
  'Most days',
  "I'm doing it right now",
]

export const ITEMS: ItemStep[] = [
  // Cluster A — Intrusion
  { type: 'item', cluster: 'A', reverse: false, text: "A specific candle, wick, or chart formation appears in your mind while you're doing something completely unrelated." },
  { type: 'item', cluster: 'A', reverse: false, text: "You calculate what a bag would be worth today if you'd held. Nobody asked you to. You just did it." },
  { type: 'item', cluster: 'A', reverse: false, text: 'You have dreamt about the price of something you own, or used to own.' },
  { type: 'item', cluster: 'A', reverse: false, text: "A number surfaces unprompted — an entry, a floor, a price you didn't take — with no trigger you can identify." },
  { type: 'item', cluster: 'A', reverse: false, text: 'Your body reacts before your brain does: a notification sound, a color, a certain shade of red.' },

  // Cluster B — Avoidance
  { type: 'item', cluster: 'B', reverse: false, text: "You deliberately don't open your portfolio, because you already know." },
  { type: 'item', cluster: 'B', reverse: false, text: 'You muted or left a group chat because of where the conversation was heading.' },
  { type: 'item', cluster: 'B', reverse: false, text: 'Someone outside crypto asks how "the crypto thing" is going and you change the subject.' },
  { type: 'item', cluster: 'B', reverse: false, text: "There is a ticker, a project, or a founder's name you avoid entirely. You know which one." },
  { type: 'item', cluster: 'B', reverse: true, text: 'You can open your wallet without bracing first.' },

  // Cluster C — Negative Cognition & Mood
  { type: 'item', cluster: 'C', reverse: false, text: 'You assume every new project is a rug until proven otherwise, including ones run by people you like.' },
  { type: 'item', cluster: 'C', reverse: false, text: 'You blame yourself specifically — not the market, not the team. You saw it. You did it anyway.' },
  { type: 'item', cluster: 'C', reverse: false, text: "Something goes right and you feel nothing. The green doesn't land anymore." },
  { type: 'item', cluster: 'C', reverse: false, text: "You don't trust your own research even when the research is good." },
  { type: 'item', cluster: 'C', reverse: false, text: 'You feel permanently, structurally behind people who got in before you.' },

  // Cluster D — Hypervigilance
  { type: 'item', cluster: 'D', reverse: false, text: 'You have checked a price between 2am and 5am.' },
  { type: 'item', cluster: 'D', reverse: false, text: 'Your phone vibrates and something in your chest moves first.' },
  { type: 'item', cluster: 'D', reverse: false, text: "You're short with people who have nothing to do with any of this." },
  { type: 'item', cluster: 'D', reverse: false, text: 'You read every announcement looking for the bad news hidden in the good news.' },
  { type: 'item', cluster: 'D', reverse: true, text: 'You sleep through the night regardless of what your positions are doing.' },

  // Cluster E — Dissociation
  { type: 'item', cluster: 'E', reverse: false, text: "The numbers don't feel like money. They're just numbers on a screen now." },
  { type: 'item', cluster: 'E', reverse: false, text: 'You have watched yourself make a decision you knew was bad, from somewhere slightly outside your own body.' },
  { type: 'item', cluster: 'E', reverse: false, text: "Hours have disappeared. You were scrolling. You can't recall a single thing you read." },
  { type: 'item', cluster: 'E', reverse: false, text: 'None of it feels real — the jpegs, the tokens, the profile picture, the person behind it.' },
  { type: 'item', cluster: 'E', reverse: false, text: "The person who made your first buy would not recognize you, and you're not sure they'd be glad." },
]

export const INTAKE_QUESTIONS: IntakeStep[] = [
  {
    type: 'intake',
    key: 'cycle',
    question: 'What cycle did you get in?',
    options: ['2013 or earlier', '2017', '2021', '2024', "I'm still not sure I'm in"],
  },
  {
    type: 'intake',
    key: 'worst',
    question: 'Your worst one was:',
    options: ['A rug', 'A liquidation', 'Not selling', 'A hack', 'A friend'],
  },
]

export const STEPS: Step[] = [...INTAKE_QUESTIONS, ...ITEMS]

export const BANDS: Band[] = [
  { id: 'UNTOUCHED', label: 'UNTOUCHED', copy: 'Clean scan. You have never actually been in it.', minRaw: 0, maxRaw: 15 },
  { id: 'EXPOSED', label: 'EXPOSED', copy: "Early symptoms. It's started.", minRaw: 16, maxRaw: 35 },
  { id: 'SYMPTOMATIC', label: 'SYMPTOMATIC', copy: "You're in it. You know you're in it.", minRaw: 36, maxRaw: 55 },
  { id: 'CHRONIC', label: 'CHRONIC', copy: 'This is load-bearing now.', minRaw: 56, maxRaw: 75 },
  { id: 'TERMINAL', label: 'TERMINAL', copy: 'There is no version of you without this.', minRaw: 76, maxRaw: 95 },
  { id: 'OVER_9000', label: 'OVER 9000', copy: 'PATIENT ZERO. Do not attempt treatment.', minRaw: 96, maxRaw: 100 },
]

export const OFF_RAMP_TEXT =
  'This is satire, not a clinical instrument. If financial loss is genuinely affecting you, help is real and it\'s free — 988 (US) or your local equivalent, any time.'
