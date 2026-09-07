import { COMMUNITY_FORM_URL, LUMA_URL, SITE_URL } from '@/lib/site';
// Curated public context. Founder decisions take precedence over older working drafts.
// Sources: founder's brand brief; Physical I/O Manifesto Vol.01 speaker script.
// Member CSVs, contacts, partner aspirations and historical metrics are intentionally excluded.
export const community = {
  purpose: 'Physical I/O is a London-rooted multidisciplinary community bringing builders, researchers, designers and thinkers together to shape the future of physical AI. Input: talent. Output: teams and things people can put into the world. Physical AI perceives, understands, decides and acts in the real world.',
  culture: 'The community culture is Love Intelligence + Body. Love means care for people; intelligence means curiosity and independent thought; body means ideas meet materials and the real world. We host with cinematic intention. We build with a craftsperson’s care. We think for human. Participate, don’t perform. Signal over noise. Challenge assumptions, encourage experimentation, share unfinished work and respect different perspectives.',
  gatherings: 'Talks are approached with cinematic intention: thoughtful questions, posters, trailers, atmosphere and contributor credits. Lighter gatherings use a dinner-menu metaphor: starter, main course and dessert. The manifesto also describes demo nights, workshops and hackathons as ways to learn, build and ship. These are formats, not confirmed upcoming dates. Current availability must be checked on the official calendar.',
  join: `People from different disciplines are welcome. Join: ${COMMUNITY_FORM_URL}. Event calendar: ${LUMA_URL}. About: ${SITE_URL}/about. Never claim to register someone or contact organisers on their behalf.`,
  identity: 'The brand brings humans, machines and the physical world together. Tactile objects, considered materials, fine grain, curiosity and optimistic retro-futurism. Orange accents, clean sans serif and handwritten details. The on-screen robot is an interactive digital community guide, not a physical product for sale.',
};
