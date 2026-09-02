// Content model for the physical-io.com robot OS demo.
// Each "disk" is a cartridge the user slots into the robot's I/O port. Booting
// it takes over the robot's screen with that program's browsable content.

export type DiskKind = "exe" | "plugin" | "node" | "signal";

export interface DiskCategory {
  id: DiskKind;
  label: string;
  description: string;
}

export interface DiskEntry {
  /** Heading shown inside the program window. */
  title: string;
  /** Supporting line under the heading. */
  body: string;
  /** Optional tag rendered on the right (e.g. a status or index number). */
  tag?: string;
  /** Optional external link — the entry opens it in a new tab. */
  href?: string;
}

export interface DiskSection {
  label: string;
  entries: DiskEntry[];
}

/** Programs that take over the screen with a bespoke UI instead of the
 *  generic section/entry browser. */
export type DiskProgram = "news";

export interface Disk {
  id: string;
  /** Filename as printed on the cartridge, e.g. "robotics.exe". */
  file: string;
  kind: DiskKind;
  /** One-line description shown on the cartridge + boot line. */
  blurb: string;
  /** Hex accent used for this program's UI + the robot's LED while booted. */
  accent: string;
  /** Small glyph drawn on the cartridge label. */
  glyph: string;
  /** Admin-gated programs are dimmed until admin mode is toggled on. */
  admin?: boolean;
  /** Renders a bespoke screen UI (and its own side panel) instead of sections. */
  program?: DiskProgram;
  /** Content the screen renders once booted. Omitted by bespoke programs. */
  sections?: DiskSection[];
}

export const DISK_CATEGORIES: DiskCategory[] = [
  {
    id: "exe",
    label: "EXE",
    description: "Official Physical I/O released apps",
  },
  {
    id: "plugin",
    label: "PLUGIN",
    description: "Partner collaborations and external extensions",
  },
  {
    id: "node",
    label: "NODE",
    description: "Community accounts, friends, and people you follow",
  },
  {
    id: "signal",
    label: "SIGNAL",
    description: "Startups, mentors, and founder accounts grown from the community",
  },
];

export const DISKS: Disk[] = [
  {
    id: "yiguan",
    file: "yiguan.node",
    kind: "node",
    blurb: "Personal account node",
    accent: "#ee4b1a",
    glyph: "◈",
    sections: [
      {
        label: "Identity",
        entries: [
          { title: "Yiguan", body: "Founder node · Physical I/O", tag: "root" },
          { title: "Location", body: "London, United Kingdom" },
          { title: "Signal", body: "Building the physical AI community", tag: "high" },
        ],
      },
      {
        label: "Network",
        entries: [
          { title: "Subscribers", body: "1,842 members tracking this account", tag: "1.8k" },
          { title: "Subscribing", body: "Mentors, builders, startups, and labs", tag: "128" },
          { title: "Mounted programs", body: "news.exe · podcast.exe · event.exe", tag: "run" },
        ],
      },
    ],
  },
  {
    id: "news",
    file: "news.exe",
    kind: "exe",
    blurb: "Official Physical I/O robotics news feed",
    accent: "#ee4b1a",
    glyph: "⬡",
    // Renders NewsScreen (feed index + article reader) instead of sections.
    program: "news",
  },
  {
    id: "podcast",
    file: "podcast.exe",
    kind: "exe",
    blurb: "Official Physical I/O media channel",
    accent: "#0a84ff",
    glyph: "▤",
    sections: [
      {
        label: "Production line",
        entries: [
          { title: "Interview", body: "Founders & researchers on the record", tag: "01" },
          { title: "Podcast", body: "The Physical I/O signal", tag: "02" },
          { title: "Event recording", body: "Talks, demo nights, panels", tag: "03" },
          { title: "Field film", body: "Lab & workshop documentary", tag: "04" },
        ],
      },
      {
        label: "Latest cut",
        entries: [
          {
            title: "EP.014",
            body: "Teaching robots to feel",
            tag: "watch",
            href: "https://www.youtube.com/watch?v=h1GvfQeJtYM&t=2177s",
          },
          { title: "EP.013", body: "Spatial intelligence in the wild" },
        ],
      },
    ],
  },
  {
    id: "event",
    file: "event.exe",
    kind: "exe",
    blurb: "Meetups, demo nights & panels",
    accent: "#30d158",
    glyph: "◐",
    sections: [
      {
        label: "Scheduled",
        entries: [
          { title: "Launch Night", body: "Summer 2026 · London", tag: "rsvp", href: "https://luma.com/qirhrtvz" },
          { title: "Demo Night #1", body: "Q3 2026 · guest speakers" },
          { title: "Project Showcase", body: "Q4 2026 · founder matching" },
        ],
      },
      {
        label: "Format",
        entries: [
          { title: "Talks", body: "Technical deep-dives" },
          { title: "Networking", body: "Builders across disciplines" },
        ],
      },
    ],
  },
  {
    id: "businessname",
    file: "businessname.plugin",
    kind: "plugin",
    blurb: "Partner workspace for hardware founders",
    accent: "#ffd60a",
    glyph: "◫",
    sections: [
      {
        label: "Partner app",
        entries: [
          { title: "Pilot desks", body: "Shared go-to-market and lab resources", tag: "live" },
          { title: "Founder requests", body: "Warm intros, pilots, and advisor asks", tag: "22" },
          { title: "Perks", body: "Partner discounts for Physical I/O members" },
        ],
      },
      {
        label: "Integrations",
        entries: [
          { title: "CRM sync", body: "Member-safe partner collaboration records" },
          { title: "Demo queue", body: "Prioritized product feedback sessions" },
        ],
      },
    ],
  },
  {
    id: "externalevent",
    file: "externalevent.plugin",
    kind: "plugin",
    blurb: "External event and conference bridge",
    accent: "#64d2ff",
    glyph: "◬",
    sections: [
      {
        label: "Partner events",
        entries: [
          { title: "Robotics Summit", body: "Partner tickets and founder track", tag: "soon" },
          { title: "Lab open day", body: "External workshop hosted with the community" },
          { title: "Demo exchange", body: "Cross-community product showcase" },
        ],
      },
      {
        label: "Routing",
        entries: [
          { title: "Speaker handoff", body: "Shared speaker pool and mentor matching" },
          { title: "Attendee sync", body: "Opt-in event account linking" },
        ],
      },
    ],
  },
  {
    id: "maya",
    file: "maya.node",
    kind: "node",
    blurb: "Creative technologist account",
    accent: "#ff375f",
    glyph: "◇",
    sections: [
      {
        label: "Profile",
        entries: [
          { title: "Maya", body: "Creative technologist · haptics and spatial UI", tag: "node" },
          { title: "Subscribing", body: "Labs, designers, and robotics founders", tag: "74" },
          { title: "Subscribers", body: "Community members following Maya's builds", tag: "612" },
        ],
      },
      {
        label: "Activity",
        entries: [
          { title: "Project log", body: "Wearable actuator prototype notes" },
          { title: "Following", body: "Open-arm · Kinema · Physical I/O mentors" },
        ],
      },
    ],
  },
  {
    id: "kinema",
    file: "kinema.signal",
    kind: "signal",
    blurb: "Community-incubated robotics startup",
    accent: "#30d158",
    glyph: "◉",
    sections: [
      {
        label: "Startup signal",
        entries: [
          { title: "Kinema", body: "Warehouse manipulation stack from the community", tag: "seed" },
          { title: "Mentors", body: "High-signal operators and robotics founders", tag: "8" },
          { title: "Open roles", body: "Controls engineer · founding designer", tag: "2" },
        ],
      },
      {
        label: "Growth",
        entries: [
          { title: "Origin", body: "Started as a Physical I/O demo night project" },
          { title: "Pilot", body: "Two partner warehouses testing the stack" },
        ],
      },
    ],
  },
  {
    id: "forge",
    file: "forge.signal",
    kind: "signal",
    blurb: "Founder and mentor signal account",
    accent: "#bf5af2",
    glyph: "◭",
    sections: [
      {
        label: "Signal",
        entries: [
          { title: "Forge Robotics", body: "Embodied AI founders growing through Physical I/O", tag: "alpha" },
          { title: "Mentor graph", body: "Manufacturing, perception, and seed-stage advisors", tag: "12" },
          { title: "Subscriber base", body: "Builders tracking the startup's field notes", tag: "924" },
        ],
      },
      {
        label: "Requests",
        entries: [
          { title: "Pilot sites", body: "Looking for inspection and logistics testbeds" },
          { title: "Community help", body: "Dataset collection and safety review" },
        ],
      },
    ],
  },
  {
    id: "outreach",
    file: "outreach.exe",
    kind: "exe",
    blurb: "Community outreach pipeline",
    accent: "#bf5af2",
    admin: true,
    sections: [
      {
        label: "Pipeline",
        entries: [
          { title: "Leads", body: "Sourced & enriched contacts", tag: "218" },
          { title: "Drafts", body: "AI-assisted personalised outreach", tag: "42" },
          { title: "Sent", body: "Awaiting reply", tag: "17" },
        ],
      },
      {
        label: "Personas",
        entries: [
          { title: "Founder voice", body: "Warm, direct, technical" },
          { title: "Curator voice", body: "Editorial, community-first" },
        ],
      },
    ],
    glyph: "◭",
  },
  {
    id: "marketing",
    file: "marketing.exe",
    kind: "exe",
    blurb: "Reach, channels & brand signal",
    accent: "#ff9f0a",
    admin: true,
    glyph: "◎",
    sections: [
      {
        label: "Channels",
        entries: [
          { title: "Instagram", body: "@physical.io", tag: "live" },
          { title: "LinkedIn", body: "Physical I/O", tag: "live" },
          { title: "Newsletter", body: "The signal, monthly" },
        ],
      },
      {
        label: "Brand",
        entries: [
          { title: "Palette", body: "White · paprika · black" },
          { title: "Voice", body: "Independent. Multidisciplinary." },
        ],
      },
    ],
  },
];

export const ADMIN_DISK_IDS = DISKS.filter((d) => d.admin).map((d) => d.id);
