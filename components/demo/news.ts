// Sample feed for news.exe — the wire the robot reads out on its screen.
// Layout is modelled on alphasignal.ai: a dense list of headlines with a
// source, a topic tag and a vote count, each opening a short write-up.
// Demo content, written for the showcase — not a live feed.

import type { ThumbKey } from "./PixelIcons";

export interface NewsArticle {
  id: string;
  /** Headline shown in the list and at the top of the article. */
  title: string;
  /** Publisher / lab the item is attributed to. */
  source: string;
  /** Topic tag, e.g. "Manipulation". */
  category: string;
  /** Relative timestamp as printed in the list. */
  time: string;
  votes: number;
  /** Pixel tile used as the list thumbnail + article header mark. */
  thumb: ThumbKey;
  /** Standfirst under the headline. */
  dek: string;
  /** Article body, one string per paragraph. */
  body: string[];
  /** Optional "read source" link. */
  href?: string;
}

export const NEWS: NewsArticle[] = [
  {
    id: "tactile-skin",
    title: "Dexterous hands learn to grade fruit by feel alone",
    source: "Physical I/O Wire",
    category: "Manipulation",
    time: "2 hrs ago",
    votes: 1104,
    thumb: "grip",
    dek: "A 512-taxel tactile skin lets a three-finger hand sort ripeness with the cameras switched off.",
    body: [
      "The team replaced the usual vision-first pipeline with a policy trained purely on contact signals: normal force, shear and the micro-vibrations that show up the instant a surface starts to yield.",
      "Grading accuracy held at 94% in the dark, and the hand bruised roughly a third fewer pieces than the vision-guided baseline because it stopped squeezing the moment slip was detected.",
      "The interesting part is transfer. The same contact encoder, frozen, dropped into a cable-routing task and reached usable performance after 40 demonstrations.",
    ],
  },
  {
    id: "sim2real-gap",
    title: "World models close the sim-to-real gap for legged robots",
    source: "Embodied Lab",
    category: "Locomotion",
    time: "5 hrs ago",
    votes: 8241,
    thumb: "legs",
    dek: "Rolling out imagined terrain inside a learned world model cut real-world falls by 61%.",
    body: [
      "Rather than randomising physics parameters and hoping the real world lands inside the distribution, the controller plans a short horizon inside a learned dynamics model that is continuously corrected by on-robot data.",
      "Across gravel, wet tile and a staircase with inconsistent riser heights, falls dropped from 18 per hour to 7, with no change to the underlying hardware.",
      "Compute is the catch: the imagination rollout costs about 9 ms per step, which currently rules out the smallest onboard controllers.",
    ],
  },
  {
    id: "spatial-vlm",
    title: "Spatial VLM answers 'which one is behind the mug' correctly",
    source: "Perception Group",
    category: "Perception",
    time: "6 hrs ago",
    votes: 3660,
    thumb: "eye",
    dek: "Metric depth supervision turns a general vision-language model into a usable scene-graph builder.",
    body: [
      "Off-the-shelf VLMs are famously bad at occlusion and relative position. Adding metric depth as a supervision target during fine-tuning moved the model from 41% to 82% on a held-out spatial-relations benchmark.",
      "The gain shows up downstream: a pick-and-place agent asking the model for referents resolved ambiguous instructions like 'the small one behind the mug' on the first try in four cases out of five.",
      "Failure modes are now mostly about mirrors and transparent surfaces, which is a much smaller and more tractable set of problems.",
    ],
  },
  {
    id: "onboard-nvme",
    title: "Onboard inference stack streams weights straight off NVMe",
    source: "Runtime Notes",
    category: "Infra",
    time: "9 hrs ago",
    votes: 1121,
    thumb: "stack",
    dek: "A 7B control policy now fits on a 8 GB module by paging expert blocks in at 40 Hz.",
    body: [
      "The runtime keeps the attention layers resident and streams mixture-of-experts blocks from local storage, overlapping the read with the previous layer's compute.",
      "End-to-end control latency rose by 4 ms — inside the tolerance for a 40 Hz loop — while peak memory fell by more than half.",
      "It is a deployment trick, not a modelling one, but it is what puts a large policy on a robot that has no room for another board.",
    ],
  },
  {
    id: "teleop-fleet",
    title: "Open teleop rig hits 1,000 hours of shared manipulation data",
    source: "Community Build",
    category: "Datasets",
    time: "14 hrs ago",
    votes: 4970,
    thumb: "bot",
    dek: "Forty builders, one bill of materials, and a licence that actually lets you train on it.",
    body: [
      "The rig costs about £680 in parts and records synchronised video, joint states and gripper force at 30 Hz. Every contributor keeps attribution; the pooled set ships permissively licensed.",
      "Early fine-tunes on the pooled data beat single-operator baselines on long-horizon kitchen tasks, mostly because the operator diversity washes out one person's habits.",
      "Next milestone is a bimanual variant, with the wrist camera moved inboard to survive collisions.",
    ],
  },
  {
    id: "safety-envelope",
    title: "Runtime safety envelope vetoes 1 in 300 policy actions",
    source: "Assurance Group",
    category: "Safety",
    time: "1 day ago",
    votes: 2626,
    thumb: "shield",
    dek: "A small verified monitor sits downstream of a learned policy and refuses anything outside a proven set.",
    body: [
      "The monitor is deliberately dumb: reachable-set arithmetic over a conservative dynamics model, running in under a millisecond, with authority to clamp or halt.",
      "Over 90 hours of shared-space operation it intervened on roughly 0.33% of commands, almost all of them during recovery from a failed grasp.",
      "Because the monitor is separate from the policy, the policy can be swapped or retrained without redoing the safety argument.",
    ],
  },
  {
    id: "audio-contact",
    title: "Robots are learning to hear the moment a part seats",
    source: "Signal Desk",
    category: "Audio",
    time: "1 day ago",
    votes: 962,
    thumb: "wave",
    dek: "Contact microphones give assembly policies a crisp success signal that vision never had.",
    body: [
      "A connector clicking home makes a very distinctive broadband transient. Training a small classifier on that transient gave the policy a reward signal accurate to about 12 ms.",
      "Insertion success rose from 71% to 89% on a mixed set of automotive connectors, with most of the gain coming from earlier detection of near-misses.",
      "The sensor is a £3 piezo disc glued to the wrist, which is the sort of detail that makes a result easy to reproduce.",
    ],
  },
  {
    id: "edge-chip",
    title: "New edge accelerator claims 45 TOPS inside a 12 W envelope",
    source: "Silicon Wire",
    category: "Hardware",
    time: "2 days ago",
    votes: 10114,
    thumb: "chip",
    dek: "Enough headroom to run perception and control on one board without a fan.",
    body: [
      "The part targets the awkward middle of the market: too much work for a microcontroller, not enough power budget for a discrete GPU.",
      "Vendor benchmarks put a quantised ViT-B at 90 fps and leave roughly a third of the die idle for the control stack, though independent numbers are not out yet.",
      "Toolchain support is the open question — the first silicon ships with an ONNX path and little else.",
    ],
  },
  {
    id: "bimanual-fold",
    title: "Bimanual policy folds laundry it has never seen before",
    source: "Household Lab",
    category: "Manipulation",
    time: "1 day ago",
    votes: 5240,
    thumb: "grip",
    dek: "Two arms, 300 demonstrations, and a garment set deliberately held out of training.",
    body: [
      "Folding is a nasty benchmark: the object changes shape continuously, and half the state is hidden inside a crumpled pile.",
      "The policy reached 78% on unseen garments by conditioning on a coarse shape estimate rather than trying to track the cloth exactly — good enough to plan a grasp, cheap enough to run at 20 Hz.",
      "Towels and t-shirts transfer well. Anything with a hood still defeats it.",
    ],
  },
  {
    id: "stair-recovery",
    title: "Fall-recovery controller gets a quadruped back up in 1.8 s",
    source: "Embodied Lab",
    category: "Locomotion",
    time: "2 days ago",
    votes: 3310,
    thumb: "legs",
    dek: "Trained entirely on deliberately induced falls, with no scripted recovery poses.",
    body: [
      "Most recovery behaviours are hand-authored sequences that assume the robot landed one of three ways. This one treats getting up as a continuous control problem from any pose.",
      "Median recovery time across 400 induced falls was 1.8 s, against 4.2 s for the scripted baseline, and it succeeded from postures the script had no case for.",
      "The training cost is the honest caveat: roughly 12,000 simulated falls before the behaviour stabilised.",
    ],
  },
  {
    id: "event-camera",
    title: "Event cameras make high-speed catching practical indoors",
    source: "Perception Group",
    category: "Perception",
    time: "2 days ago",
    votes: 2180,
    thumb: "eye",
    dek: "Microsecond latency beats frame rate when the ball is moving faster than your shutter.",
    body: [
      "A conventional 120 fps camera gives you a smear and a stale estimate. An event sensor reports brightness changes as they happen, which turns out to be exactly the signal a ballistic tracker wants.",
      "End-to-end latency from photon to motor command came in under 6 ms, and the arm caught 91% of throws inside its workspace.",
      "The sensors remain expensive and the tooling is thin, but the latency argument is hard to beat.",
    ],
  },
  {
    id: "ros-bridge",
    title: "Zero-copy bridge cuts perception pipeline overhead by 40%",
    source: "Runtime Notes",
    category: "Infra",
    time: "3 days ago",
    votes: 1460,
    thumb: "stack",
    dek: "Shared-memory transport for large messages, with the serialisation step removed entirely.",
    body: [
      "Most of the cost in a typical perception graph is not the models — it is copying point clouds and images between nodes.",
      "Mapping the buffers into a shared segment and passing handles cut end-to-end graph latency by about 40% on a six-node pipeline, with the biggest win on the depth-to-mesh stage.",
      "It only helps for same-host graphs, which covers most robots and none of the fleet tooling.",
    ],
  },
  {
    id: "failure-corpus",
    title: "First open corpus of robot failures ships with 40,000 clips",
    source: "Community Build",
    category: "Datasets",
    time: "3 days ago",
    votes: 6720,
    thumb: "bot",
    dek: "Everyone publishes successes. This one is deliberately all the ways things went wrong.",
    body: [
      "Each clip is labelled with a failure mode — slip, collision, mis-grasp, planner timeout — plus the 5 s of state leading up to it.",
      "Training a failure predictor on the corpus gave 0.4 s of advance warning on held-out robots, enough to trigger a slow-down before contact.",
      "Contributions came from eleven labs, which is also the most interesting thing about it.",
    ],
  },
  {
    id: "thermal-budget",
    title: "Passive-cooled compute module survives a 45 °C warehouse",
    source: "Silicon Wire",
    category: "Hardware",
    time: "4 days ago",
    votes: 890,
    thumb: "chip",
    dek: "No fan means no filter, no dust ingress, and one fewer thing to service.",
    body: [
      "The module throttles rather than shuts down, holding about 70% of peak throughput at ambient 45 °C across an eight-hour shift.",
      "Field data from three sites showed no thermal shutdowns over six weeks, against a fleet baseline of roughly one per robot per fortnight.",
      "The chassis is the whole trick: the enclosure is the heatsink.",
    ],
  },
  {
    id: "scene-gen",
    title: "Procedural scene generator builds a warehouse in 40 seconds",
    source: "Sim Collective",
    category: "Simulation",
    time: "5 days ago",
    votes: 4110,
    thumb: "world",
    dek: "Layout, clutter, lighting and wear, sampled from a distribution fitted to real sites.",
    body: [
      "Hand-built simulation scenes are the bottleneck in most sim-to-real pipelines, and they all end up implausibly tidy.",
      "Sampling clutter and surface wear from real site scans, rather than a uniform prior, cut the reality gap on a navigation benchmark by roughly half.",
      "Generation runs on CPU and takes about 40 s per scene, so a training run can keep making new ones.",
    ],
  },
  {
    id: "world-sim",
    title: "Open world simulator ships deformables that run in real time",
    source: "Sim Collective",
    category: "Simulation",
    time: "3 days ago",
    votes: 1030,
    thumb: "world",
    dek: "Cloth, cable and soft food finally simulate fast enough to train against.",
    body: [
      "The solver trades a little accuracy for a lot of throughput, hitting 240 Hz on a single consumer GPU for scenes with several thousand deformable elements.",
      "Policies trained against it transferred to real cable routing with a 3.4× reduction in real-world data needed, which is the number that matters for anyone paying for demonstrations.",
      "Rigid-body behaviour is unchanged, so existing scenes load without modification.",
    ],
  },
];

/** Topic tags present in the feed, with counts — drives the modal sidebar. */
export const NEWS_CATEGORIES: { label: string; count: number }[] = Object.entries(
  NEWS.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {})
)
  .map(([label, count]) => ({ label, count }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** Free-text match across the fields a reader would search on. */
export function matchesQuery(a: NewsArticle, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${a.title} ${a.source} ${a.category} ${a.dek}`.toLowerCase().includes(q);
}
