// Site-wide constants and content data.

// TODO: replace with the real domain
export const SITE_URL = "https://physical-io.example";
export const JOIN_URL = "https://forms.gle/DTY4AZDd56FWPmo76";

export const SITE_NAME = "Physical I/O";
export const SITE_DESCRIPTION =
  "Physical I/O is London's community for Physical AI, Robotics, Spatial Intelligence, Wearables, Intelligent Hardware and Embodied AI.";

export const FOCUS_AREAS = [
  "Physical AI",
  "Robotics",
  "Spatial Intelligence",
  "Embodied AI",
  "Wearables",
  "Intelligent Hardware",
  "Human Computer Interaction",
  "Computer Vision",
  "Industrial Design",
  "Design Engineering",
];

export const HOW_WE_BUILD = [
  "Meetups",
  "Demo Nights",
  "Technical Talks",
  "Founder Panels",
  "Workshops",
  "Networking",
  "Project Showcases",
  "Industry Partnerships",
];

export const AUDIENCE = [
  "Founders",
  "Engineers",
  "Designers",
  "Design Engineers",
  "Hardware Engineers",
  "AI Engineers",
  "Researchers",
  "Investors",
  "Product Managers",
  "Creative Technologists",
];

// Only display organisations with real community members
export const MEMBER_ORGS = [
  "Google DeepMind",
  "Wayve",
  "NVIDIA",
  "Meta",
  "Nothing",
  "Foster + Partners",
  "UCL",
  "Imperial College London",
  "RCA",
];

export const STRUCTURE_TIERS = [
  { name: "EXE", desc: "Community Operators — the team running Physical I/O day to day." },
  { name: "CORE", desc: "Industry Leaders, Mentors, Investors and Advisors guiding the community." },
  { name: "CLUSTER", desc: "Community Projects and Working Groups building together." },
  { name: "MEMBER", desc: "Builders, Researchers, Founders and Students — the heart of the community." },
];

export const ROADMAP = [
  {
    when: "Today",
    now: true,
    title: "Building the founding community",
    desc: "Gathering the first members across robotics, AI, design and research in London.",
  },
  { when: "Summer 2026", now: false, title: "Launch Event", desc: "The first official Physical I/O gathering in London." },
  { when: "Q3 2026", now: false, title: "Monthly Demo Nights", desc: "Guest speakers and industry networking, every month." },
  { when: "Q4 2026", now: false, title: "Project Showcase", desc: "Founder matching and industry workshops." },
  {
    when: "Future",
    now: false,
    title: "Annual Summit",
    desc: "Startup showcase, research collaborations and international chapters.",
  },
];

export const FOOTER_TOPICS = [
  "Physical AI",
  "Robotics",
  "Spatial Intelligence",
  "Wearables",
  "Embodied AI",
  "Hardware",
  "Human Computer Interaction",
  "Computer Vision",
  "Design Engineering",
];

export interface FaqEntry {
  q: string;
  a: string;
}

export const FAQ: FaqEntry[] = [
  {
    q: "What is Physical AI?",
    a: "Physical AI is artificial intelligence that senses, understands and acts in the physical world — powering robots, autonomous systems, wearables, spatial interfaces and intelligent hardware rather than living only in software.",
  },
  {
    q: "What is Embodied AI?",
    a: "Embodied AI is intelligence that learns and operates through a physical body — a robot, vehicle or device — using sensors and actuators to perceive its environment and take real-world actions.",
  },
  {
    q: "What is Spatial Intelligence?",
    a: "Spatial Intelligence is the ability of machines to perceive, map and reason about 3D space — combining computer vision, sensing and geometry so systems can navigate and interact with real environments.",
  },
  {
    q: "What is Physical I/O?",
    a: "Physical I/O is an independent London community for Physical AI, Robotics, Spatial Intelligence, Wearables and Intelligent Hardware, connecting founders, engineers, designers, researchers and investors through meetups, demo nights and talks.",
  },
  {
    q: "Who can join?",
    a: "Anyone building or curious about Physical AI — founders, engineers, designers, researchers, investors, product managers, creative technologists and students are all welcome.",
  },
  {
    q: "Is it free?",
    a: "Yes. Joining the Physical I/O community is free. Some future events may be ticketed, but membership costs nothing.",
  },
  {
    q: "Is it only for engineers?",
    a: "No. Physical AI is built by multidisciplinary teams — designers, researchers, investors, product managers and students are as much a part of the community as engineers.",
  },
  {
    q: "Can I present my startup?",
    a: "Yes. Demo nights and project showcases exist for exactly that. Join the community and tell us what you are building.",
  },
  {
    q: "Can my company sponsor an event?",
    a: "Yes. We partner with companies aligned with the Physical AI ecosystem. Get in touch by email to discuss sponsorship.",
  },
  {
    q: "How do I become a speaker?",
    a: "Join the community and reach out with your topic — we host technical talks, founder panels and workshops and are always looking for speakers.",
  },
  {
    q: "Where can I meet robotics founders in London?",
    a: "Physical I/O meetups and demo nights in London bring together robotics and Physical AI founders, engineers, researchers and investors. Join the community to hear about the next event.",
  },
];
