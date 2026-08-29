// Content model for the physical-io.com robot OS demo.
// Each "disk" is a cartridge the user slots into the robot's I/O port. Booting
// it takes over the robot's screen with that program's browsable content.

export type DiskKind = "node" | "disk" | "exe";

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
  /** Content the screen renders once booted. */
  sections: DiskSection[];
}

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
          { title: "Signal", body: "Building the physical AI community" },
        ],
      },
      {
        label: "Mounted programs",
        entries: [
          { title: "robotics.exe", body: "Field notes & hardware log", tag: "run" },
          { title: "content.exe", body: "In-house media production", tag: "run" },
          { title: "outreach.exe", body: "Community outreach pipeline", tag: "run" },
        ],
      },
    ],
  },
  {
    id: "robotics",
    file: "robotics.exe",
    kind: "exe",
    blurb: "Robotics & embodied AI feed",
    accent: "#ee4b1a",
    glyph: "⬡",
    sections: [
      {
        label: "Now running",
        entries: [
          { title: "Manipulation", body: "Dexterous grasping · tactile sensing", tag: "01" },
          { title: "Locomotion", body: "Legged & wheeled control stacks", tag: "02" },
          { title: "Perception", body: "3D vision · spatial intelligence", tag: "03" },
          { title: "Embodiment", body: "Sim-to-real · world models", tag: "04" },
        ],
      },
      {
        label: "Community builds",
        entries: [
          { title: "Open-arm", body: "Low-cost teleop manipulator" },
          { title: "Wanderer", body: "Sidewalk delivery platform" },
        ],
      },
    ],
  },
  {
    id: "content",
    file: "content.exe",
    kind: "exe",
    blurb: "In-house media content production",
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
