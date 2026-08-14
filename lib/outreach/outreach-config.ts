export const outreachStages = [
  {
    value: "NEW_RESEARCH",
    label: "Research",
    description: "New lead, needs context",
  },
  {
    value: "DRAFTED",
    label: "Drafted",
    description: "Message ready to review",
  },
  {
    value: "SENT",
    label: "Sent",
    description: "DM sent on LinkedIn",
  },
  {
    value: "FOLLOW_UP",
    label: "Follow-up",
    description: "Needs a second touch",
  },
  {
    value: "REPLIED",
    label: "Replied",
    description: "Lead has responded",
  },
  {
    value: "MEETING_BOOKED",
    label: "Meeting",
    description: "Meeting arranged",
  },
  {
    value: "CLOSED",
    label: "Closed",
    description: "No active next step",
  },
] as const;

export const outreachTypes = [
  { value: "EVENT_INVITATION", label: "Event invitation" },
  { value: "COLLABORATION_INVITATION", label: "Collaboration invitation" },
  { value: "ARRANGE_MEETING", label: "Arrange meeting" },
  { value: "COMMUNITY_INTRO", label: "Community intro" },
  { value: "FOLLOW_UP", label: "Follow-up" },
] as const;

export const industryCategories = [
  "Physical AI",
  "Robotics",
  "Research and Education",
  "Manufacturing",
  "Healthcare",
  "Venture and Startup",
  "Design and Product",
  "Community",
] as const;

export type OutreachStageValue = (typeof outreachStages)[number]["value"];
export type OutreachTypeValue = (typeof outreachTypes)[number]["value"];

export function stageLabel(stage: string) {
  return outreachStages.find((item) => item.value === stage)?.label ?? stage;
}

export function typeLabel(type: string) {
  return outreachTypes.find((item) => item.value === type)?.label ?? type;
}
