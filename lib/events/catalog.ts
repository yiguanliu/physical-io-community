// Public episode catalog. Only confirmed, public facts belong here: the Google Meet link is
// read server-side from the environment and shown only on attendee tickets.

export type EpisodeFormat = 'online' | 'in_person' | 'hybrid';
export type PublicEpisode = {
  slug: string;
  number: string;
  title: string;
  theme: string;
  question: string;
  startsAt: string;
  endsAt: string;
  city: string;
  venue: string;
  venueDetail: string;
  /** Short location printed on badges. */
  room: string;
  /** Street address printed under the room on in-person badges, one entry per line. */
  address?: string[];
  format: EpisodeFormat;
  /** Livestream window in London time, when it differs from the in-person evening. */
  onlineTime?: string;
  cover: string;
  lumaUrl: string;
  summary: string;
  about: string[];
  speakers: { name: string; topic: string; url?: string }[];
  schedule: { time: string; label: string }[];
  notes: string[];
  /** Attendees choose in person / online / not going on /[slug]/rsvp. */
  rsvp: boolean;
  /** Recordings stay behind member sign-in on /members. */
  recording: boolean;
};

export const EPISODES: PublicEpisode[] = [
  {
    slug: 'event-02-robotics',
    number: '02',
    title: 'Robotics',
    theme: 'Love, Mind + Body',
    question: 'How do we want to live alongside intelligent machines?',
    startsAt: '2026-10-07T17:00:00.000Z',
    endsAt: '2026-10-07T20:00:00.000Z',
    city: 'London',
    venue: 'Bentham House, Endsleigh Gardens',
    venueDetail: 'LG17 Lecture Room, Bentham House, Endsleigh Gardens, London WC1H 0EG',
    room: 'LG17 Bentham House',
    address: ['Endsleigh Gardens', 'London WC1H 0EG'],
    format: 'hybrid',
    onlineTime: '18:45–20:15',
    cover: '/assets/episodes/episode-02-robotics.jpg',
    lumaUrl: 'https://luma.com/qirhrtvz',
    summary: 'An evening of robotics, research and conversation: how machines perceive, move and respond to us.',
    about: [
      'Our theme is Love, Mind + Body: how we connect with machines, how they learn, and what happens when they meet the physical world.',
      'Join us for an evening of robotics, research and conversation. We’ll explore how machines perceive, move and respond to us, and what designers, engineers and researchers can learn from one another.',
      'Come for the talks, bring your questions, and stay for a chat. We’ll start with food and a DJ set. You don’t need to be a robotics expert to join.',
    ],
    speakers: [
      { name: 'Lingfan Bao', topic: 'How humanoid and quadruped robots learn to move and interact with the world.' },
      { name: 'Ava Oppenheimer', topic: 'Making physics simulation more reliable and closing the gap between simulation and reality.' },
      { name: 'Ash', topic: 'From robotics engineer to entrepreneur: connecting AI, design and manufacturing to bring intelligent systems into the physical world. Onric.' },
    ],
    schedule: [
      { time: '18:00', label: 'Check in, food, DJ set and hellos' },
      { time: '18:40', label: 'Welcome to Physical I/O' },
      { time: '19:00', label: 'Talks and Q&A' },
      { time: '20:00', label: 'Meet people and keep the conversation going' },
    ],
    notes: [
      'Free entry. In-person places are limited; everyone registered can join the Google Meet livestream.',
      'Part of London Deep Tech Week, presented by Deep Tech London.',
      'If you get locked outside the building, message the host on Luma.',
    ],
    rsvp: true,
    recording: false,
  },
  {
    slug: 'event-01-manifesto',
    number: '01',
    title: 'Manifesto',
    theme: 'AI in the Physical World',
    question: 'Why do ideas change when they leave the screen?',
    startsAt: '2026-08-20T17:00:00.000Z',
    endsAt: '2026-08-20T19:00:00.000Z',
    city: 'Online',
    venue: 'Online',
    venueDetail: 'Online',
    room: 'Online',
    format: 'online',
    cover: '/assets/episodes/episode-01-manifesto.jpg',
    lumaUrl: 'https://luma.com/9npo83bq',
    summary: 'Our first episode: the people, the purpose and a shared curiosity about intelligence in the physical world.',
    about: [
      'Physical I/O began with a manifesto: a community led by curiosity, design and engineering, asking how humans and intelligent systems can coexist in the physical world.',
      'Founders, researchers, designers and engineers shared what they are building and the questions they are carrying into the next episode.',
    ],
    speakers: [],
    schedule: [],
    notes: ['Members can watch the full recording after signing in.'],
    rsvp: false,
    recording: true,
  },
];

export function findEpisode(slug: string) {
  return EPISODES.find(episode => episode.slug === slug) ?? null;
}

export function isUpcoming(episode: PublicEpisode, now = Date.now()) {
  return Date.parse(episode.endsAt) >= now;
}

export const LONDON = 'Europe/London';
export function episodeDate(episode: PublicEpisode, style: 'long' | 'short' = 'long') {
  const start = new Date(episode.startsAt);
  if (style === 'short') return start.toLocaleDateString('en-GB', { timeZone: LONDON, day: 'numeric', month: 'short', year: 'numeric' });
  return start.toLocaleDateString('en-GB', { timeZone: LONDON, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
export function labelDate(episode: PublicEpisode) {
  return new Date(episode.startsAt).toLocaleDateString('en-GB', { timeZone: LONDON, day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
}
export function episodeTime(episode: PublicEpisode) {
  const time = (value: string) => new Date(value).toLocaleTimeString('en-GB', { timeZone: LONDON, hour: '2-digit', minute: '2-digit' });
  return `${time(episode.startsAt)}–${time(episode.endsAt)}`;
}
