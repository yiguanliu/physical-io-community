"use client";

import { useMemo, useState } from "react";
import LogoMark from "@/components/LogoMark";

type View = "Overview" | "Members" | "Outreach" | "Communications" | "Events" | "Automations";
type IconName = "grid" | "users" | "target" | "mail" | "calendar" | "workflow" | "search" | "bell" | "plus" | "arrow" | "spark" | "dots" | "clock" | "check" | "link";

const nav: Array<{ label: View; icon: IconName }> = [
  { label: "Overview", icon: "grid" },
  { label: "Members", icon: "users" },
  { label: "Outreach", icon: "target" },
  { label: "Communications", icon: "mail" },
  { label: "Events", icon: "calendar" },
  { label: "Automations", icon: "workflow" },
];

const members = [
  { name: "Ava Oppenheimer", email: "ava@tryito.io", role: "Founder / Operator", city: "London", joined: "29 Jun", status: "Active", topics: ["Robotics", "AI/ML"] },
  { name: "Calvin Calica", email: "calvin@network.rca.ac.uk", role: "Designer", city: "London", joined: "29 Jun", status: "Active", topics: ["Industrial Design"] },
  { name: "Nora Chen", email: "nora@example.com", role: "Founder / Operator", city: "London", joined: "29 Jun", status: "Review", topics: ["AI/ML", "Marketing"] },
  { name: "Adam Klestil", email: "adam@example.com", role: "Designer", city: "Vienna", joined: "29 Jun", status: "Active", topics: ["UI/UX", "Research"] },
  { name: "Mina Park", email: "mina@example.com", role: "Researcher", city: "Cambridge", joined: "01 Jul", status: "Active", topics: ["Embodied AI"] },
  { name: "Leo Martins", email: "leo@example.com", role: "Engineer", city: "London", joined: "02 Jul", status: "Paused", topics: ["Robotics", "Hardware"] },
];

const leads = [
  { id: 1, company: "Nothing", contact: "Maya Chen", role: "Partnerships Director", stage: "Meeting", value: "£12k", score: 92, next: "Meet · Thu 11:30", last: "Replied 2h ago", tone: "positive" },
  { id: 2, company: "Wayve", contact: "Sam Robertson", role: "Community & Events", stage: "Contacted", value: "£8k", score: 86, next: "Follow up · Tomorrow", last: "Opened yesterday", tone: "waiting" },
  { id: 3, company: "NVIDIA", contact: "Elena Rossi", role: "Developer Relations", stage: "Proposal", value: "£20k", score: 89, next: "Review proposal · Fri", last: "Meeting 3 days ago", tone: "positive" },
  { id: 4, company: "Foster + Partners", contact: "James Hall", role: "Applied R&D Lead", stage: "Research", value: "£6k", score: 74, next: "Complete research", last: "Added 4 days ago", tone: "neutral" },
];

const campaigns = [
  { name: "August community update", type: "Newsletter", audience: "All opted-in", status: "Draft", date: "Edited 40m ago", delivery: "—" },
  { name: "Manifesto event reminder", type: "Event update", audience: "Registered · 184", status: "Scheduled", date: "20 Aug · 09:00", delivery: "—" },
  { name: "Welcome to Physical I/O", type: "Automation", audience: "New members", status: "Active", date: "Always on", delivery: "98.4%" },
  { name: "July node spotlight", type: "Newsletter", audience: "All opted-in · 142", status: "Sent", date: "24 Jul", delivery: "97.9%" },
];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    workflow: <><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h3a4 4 0 0 1 4 4v5M15 18h-3a4 4 0 0 1-4-4V9"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    spark: <path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8L12 3Zm6 11 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z"/>,
    dots: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`admin-badge ${tone}`}>{children}</span>;
}

export default function AdminMockup() {
  const [view, setView] = useState<View>("Overview");
  const [query, setQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState(leads[0]);
  const [toast, setToast] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredMembers = useMemo(() => {
    const needle = query.toLowerCase().trim();
    if (!needle) return members;
    return members.filter((member) => `${member.name} ${member.email} ${member.role} ${member.city}`.toLowerCase().includes(needle));
  }, [query]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  function navigate(next: View) {
    setView(next);
    setSidebarOpen(false);
  }

  return (
    <main className="admin-app">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-brand"><LogoMark /><span>PHYSICAL I/O</span></div>
        <nav aria-label="Admin navigation">
          <p className="admin-nav-label">Workspace</p>
          {nav.map((item) => (
            <button key={item.label} className={view === item.label ? "active" : ""} onClick={() => navigate(item.label)}>
              <Icon name={item.icon} /><span>{item.label}</span>{item.label === "Automations" ? <i>3</i> : null}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-system"><span className="live-dot"/><div><strong>Systems operational</strong><small>Last checked just now</small></div></div>
          <button className="admin-profile" onClick={() => notify("Profile menu is mocked for now") }><span>AL</span><div><strong>Anthony Liu</strong><small>Outreach admin</small></div><Icon name="dots"/></button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu" aria-label="Toggle navigation" onClick={() => setSidebarOpen((open) => !open)}><span/><span/><span/></button>
          <div className="admin-breadcrumb"><span>Physical I/O</span><b>/</b><strong>{view}</strong></div>
          <div className="admin-top-actions">
            <button className="admin-search"><Icon name="search"/><span>Search anything</span><kbd>⌘ K</kbd></button>
            <button className="admin-icon-button" aria-label="Notifications"><Icon name="bell"/><i/></button>
            <button className="admin-primary" onClick={() => setComposeOpen(true)}><Icon name="plus" size={16}/>New message</button>
          </div>
        </header>

        <div className="admin-content">
          {view === "Overview" ? <Overview onNavigate={navigate} onNotify={notify} /> : null}
          {view === "Members" ? <MembersView query={query} setQuery={setQuery} rows={filteredMembers} onNotify={notify} /> : null}
          {view === "Outreach" ? <OutreachView selected={selectedLead} onSelect={setSelectedLead} onNotify={notify} /> : null}
          {view === "Communications" ? <CommunicationsView onCompose={() => setComposeOpen(true)} onNotify={notify} /> : null}
          {view === "Events" ? <EventsView onNotify={notify} /> : null}
          {view === "Automations" ? <AutomationsView onNotify={notify} /> : null}
        </div>
      </section>

      {composeOpen ? <ComposeModal onClose={() => setComposeOpen(false)} onSend={() => { setComposeOpen(false); notify("Test draft saved — nothing was sent"); }} /> : null}
      {toast ? <div className="admin-toast"><Icon name="check" size={16}/>{toast}</div> : null}
    </main>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="admin-page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ onNavigate, onNotify }: { onNavigate: (view: View) => void; onNotify: (message: string) => void }) {
  return <>
    <PageHeading eyebrow="Tuesday, 4 August" title="Good evening, Anthony." description="Here’s what needs your attention across the community." action={<button className="admin-secondary" onClick={() => onNotify("Report export is mocked")}>Export report</button>} />
    <div className="admin-stage-banner"><div className="stage-index">01</div><div><span>PLATFORM DELIVERY</span><h2>Foundation stage ready to begin</h2><p>7 architecture decisions need approval before implementation.</p></div><button onClick={() => onNotify("Stage plan opened in mock mode")}>Open stage plan <Icon name="arrow" size={15}/></button></div>
    <div className="admin-metrics">
      <Metric label="Active members" value="187" change="+23 this month" tone="up" />
      <Metric label="Open sponsor leads" value="24" change="£86k pipeline" tone="plain" />
      <Metric label="Email engagement" value="54.2%" change="+6.8% vs last send" tone="up" />
      <Metric label="Next event" value="16 days" change="184 registered" tone="plain" />
    </div>
    <div className="admin-grid-two">
      <section className="admin-panel">
        <PanelHead title="Sponsor pipeline" meta="£86k weighted value" action="View outreach" onClick={() => onNavigate("Outreach")} />
        <div className="pipeline-bars">
          {[['Research',8,18],['Contacted',7,37],['Meeting',4,64],['Proposal',3,78],['Agreement',2,92]].map(([label,count,width]) => <div key={String(label)}><span>{label}<b>{count}</b></span><i><em style={{width:`${width}%`}}/></i></div>)}
        </div>
      </section>
      <section className="admin-panel">
        <PanelHead title="Needs attention" meta="5 items" />
        <div className="attention-list">
          <Attention icon="mail" title="Review NVIDIA proposal email" meta="Due today · Assigned to you" urgent />
          <Attention icon="users" title="3 duplicate member records" meta="Import reconciliation" />
          <Attention icon="workflow" title="Follow-up workflow paused" meta="Wayve · Waiting for review" />
          <Attention icon="calendar" title="Confirm Nothing meeting" meta="Thursday · 11:30 BST" />
        </div>
      </section>
    </div>
    <section className="admin-panel admin-activity-panel"><PanelHead title="Recent activity" meta="Across your workspace" action="View all" onClick={() => onNotify("Activity feed expanded in mock mode")} />
      <div className="activity-table">
        <div><span className="avatar coral">MC</span><p><strong>Maya Chen replied</strong><small>Nothing · Sponsor outreach</small></p><Badge tone="success">Positive reply</Badge><time>2h</time></div>
        <div><span className="avatar ink">PI</span><p><strong>Manifesto reminder scheduled</strong><small>184 recipients · 20 Aug, 09:00</small></p><Badge tone="info">Scheduled</Badge><time>4h</time></div>
        <div><span className="avatar sand">NP</span><p><strong>Nora Chen requires review</strong><small>Possible duplicate member profile</small></p><Badge tone="warning">Review</Badge><time>6h</time></div>
        <div><span className="avatar blue">ER</span><p><strong>Proposal shared with NVIDIA</strong><small>Physical I/O annual partner · v3</small></p><Badge>Proposal</Badge><time>1d</time></div>
      </div>
    </section>
  </>;
}

function Metric({ label, value, change, tone }: { label: string; value: string; change: string; tone: string }) {
  return <article className="admin-metric"><span>{label}</span><strong>{value}</strong><small className={tone}>{change}</small></article>;
}

function PanelHead({ title, meta, action, onClick }: { title: string; meta?: string; action?: string; onClick?: () => void }) {
  return <header className="panel-head"><div><h3>{title}</h3>{meta ? <span>{meta}</span> : null}</div>{action ? <button onClick={onClick}>{action}<Icon name="arrow" size={14}/></button> : null}</header>;
}

function Attention({ icon, title, meta, urgent }: { icon: IconName; title: string; meta: string; urgent?: boolean }) {
  return <div><span className={urgent ? "attention-icon urgent" : "attention-icon"}><Icon name={icon}/></span><p><strong>{title}</strong><small>{meta}</small></p><Icon name="arrow" size={16}/></div>;
}

function MembersView({ query, setQuery, rows, onNotify }: { query: string; setQuery: (value: string) => void; rows: typeof members; onNotify: (message: string) => void }) {
  return <>
    <PageHeading eyebrow="Community" title="Members" description="Search, segment and manage everyone in the Physical I/O community." action={<button className="admin-primary" onClick={() => onNotify("Manual member form is mocked")}><Icon name="plus" size={16}/>Add member</button>} />
    <div className="admin-toolbar"><label><Icon name="search"/><input aria-label="Search members" placeholder="Search name, email, role or city" value={query} onChange={(event) => setQuery(event.target.value)}/></label><button>All statuses</button><button>All cities</button><button>More filters <span>2</span></button><div className="toolbar-spacer"/><button onClick={() => onNotify("Sync preview opened — no Sheet data changed")}>Sync signups</button></div>
    <section className="admin-table-panel">
      <div className="member-summary"><strong>{rows.length} shown</strong><span>187 total members</span><div/><button onClick={() => onNotify("Segment saved in mock mode")}>Save as segment</button><button onClick={() => onNotify("Export requires permission in production")}>Export</button></div>
      <div className="admin-table-wrap"><table><thead><tr><th><input type="checkbox" aria-label="Select all"/></th><th>Member</th><th>Role</th><th>Location</th><th>Interests</th><th>Joined</th><th>Status</th><th/></tr></thead><tbody>{rows.map((member) => <tr key={member.email}><td><input type="checkbox" aria-label={`Select ${member.name}`}/></td><td><div className="member-cell"><span>{member.name.split(' ').map(part => part[0]).join('').slice(0,2)}</span><p><strong>{member.name}</strong><small>{member.email}</small></p></div></td><td>{member.role}</td><td>{member.city}</td><td><div className="topic-list">{member.topics.map(topic => <Badge key={topic}>{topic}</Badge>)}</div></td><td>{member.joined}</td><td><Badge tone={member.status === 'Active' ? 'success' : member.status === 'Review' ? 'warning' : 'neutral'}>{member.status}</Badge></td><td><button className="row-action" aria-label={`Actions for ${member.name}`}><Icon name="dots"/></button></td></tr>)}</tbody></table></div>
    </section>
  </>;
}

function OutreachView({ selected, onSelect, onNotify }: { selected: typeof leads[number]; onSelect: (lead: typeof leads[number]) => void; onNotify: (message: string) => void }) {
  const stages = ["Research", "Contacted", "Meeting", "Proposal"];
  return <>
    <PageHeading eyebrow="Sponsor operations" title="Outreach" description="Manage every sponsor relationship from research through delivery." action={<button className="admin-primary" onClick={() => onNotify("New lead form opened in mock mode")}><Icon name="plus" size={16}/>New lead</button>} />
    <div className="outreach-layout">
      <section className="admin-panel outreach-pipeline">
        <div className="admin-toolbar compact"><button>Active pipeline</button><button>My leads</button><div className="toolbar-spacer"/><button><Icon name="search" size={16}/></button></div>
        <div className="kanban">{stages.map(stage => <div className="kanban-column" key={stage}><header><span>{stage}</span><b>{leads.filter(lead => lead.stage === stage).length}</b></header>{leads.filter(lead => lead.stage === stage).map(lead => <button key={lead.id} className={selected.id === lead.id ? "lead-card selected" : "lead-card"} onClick={() => onSelect(lead)}><div><span>{lead.company.slice(0,2).toUpperCase()}</span><Badge tone={lead.tone === 'positive' ? 'success' : 'neutral'}>{lead.score}</Badge></div><strong>{lead.company}</strong><small>{lead.contact} · {lead.role}</small><footer><span>{lead.value}</span><span>{lead.next}</span></footer></button>)}</div>)}</div>
      </section>
      <aside className="lead-drawer">
        <header><div className="company-mark">{selected.company.slice(0,2).toUpperCase()}</div><div><span>SPONSOR LEAD</span><h2>{selected.company}</h2><p>{selected.contact} · {selected.role}</p></div><button><Icon name="dots"/></button></header>
        <div className="lead-score"><div><span>Fit score</span><strong>{selected.score}<small>/100</small></strong></div><div><span>Est. value</span><strong>{selected.value}</strong></div><div><span>Stage</span><Badge tone="info">{selected.stage}</Badge></div></div>
        <div className="lead-actions"><button className="admin-primary" onClick={() => onNotify(`Draft started for ${selected.contact}`)}><Icon name="mail" size={16}/>Draft email</button><button className="admin-secondary" onClick={() => onNotify("Meeting scheduler opened in mock mode")}><Icon name="calendar" size={16}/>Meet</button></div>
        <div className="lead-tabs"><button className="active">Activity</button><button>Details</button><button>Files</button></div>
        <div className="lead-timeline">
          <Timeline icon="mail" title={selected.last} meta="Email thread · View reply" time="Today" />
          <Timeline icon="spark" title="AI research summary updated" meta="4 source-backed facts · 1 needs review" time="Yesterday" />
          <Timeline icon="link" title="Sponsorship deck shared" meta="Annual partnership v3.pdf" time="2d" />
          <Timeline icon="users" title="Lead assigned to Anthony" meta="Status moved to current stage" time="4d" />
        </div>
        <div className="next-action"><span>NEXT ACTION</span><strong>{selected.next}</strong><button onClick={() => onNotify("Next action marked complete")}>Mark complete</button></div>
      </aside>
    </div>
  </>;
}

function Timeline({ icon, title, meta, time }: { icon: IconName; title: string; meta: string; time: string }) {
  return <div><span><Icon name={icon} size={15}/></span><p><strong>{title}</strong><small>{meta}</small></p><time>{time}</time></div>;
}

function CommunicationsView({ onCompose, onNotify }: { onCompose: () => void; onNotify: (message: string) => void }) {
  return <>
    <PageHeading eyebrow="Messaging" title="Communications" description="Create newsletters, event updates and member announcements." action={<button className="admin-primary" onClick={onCompose}><Icon name="plus" size={16}/>Create campaign</button>} />
    <div className="admin-metrics compact-metrics"><Metric label="Opted-in contacts" value="163" change="87.2% of members" tone="plain"/><Metric label="Delivered · 30d" value="98.1%" change="Healthy" tone="up"/><Metric label="Average open" value="54.2%" change="+6.8%" tone="up"/><Metric label="Unsubscribed" value="3" change="1.6% total" tone="plain"/></div>
    <section className="admin-table-panel"><div className="member-summary"><strong>Campaigns</strong><span>Draft, scheduled and sent</span><div/><button>Templates</button><button onClick={() => onNotify("Audience manager opened in mock mode")}>Audiences</button></div><div className="campaign-list">{campaigns.map(campaign => <button key={campaign.name} onClick={() => onNotify(`${campaign.name} opened in mock mode`)}><span className="campaign-icon"><Icon name={campaign.type === 'Event update' ? 'calendar' : campaign.type === 'Automation' ? 'workflow' : 'mail'}/></span><p><strong>{campaign.name}</strong><small>{campaign.type} · {campaign.audience}</small></p><Badge tone={campaign.status === 'Sent' || campaign.status === 'Active' ? 'success' : campaign.status === 'Scheduled' ? 'info' : 'neutral'}>{campaign.status}</Badge><span>{campaign.date}</span><b>{campaign.delivery}</b><Icon name="arrow" size={16}/></button>)}</div></section>
  </>;
}

function EventsView({ onNotify }: { onNotify: (message: string) => void }) {
  return <><PageHeading eyebrow="Programme" title="Events" description="Plan events and coordinate announcements, reminders and follow-ups." action={<button className="admin-primary" onClick={() => onNotify("New event form opened in mock mode")}><Icon name="plus" size={16}/>New event</button>} />
    <div className="event-feature"><div><Badge tone="info">UPCOMING</Badge><span>20 AUG · ONLINE</span><h2>Physical I/O: Manifesto</h2><p>Community launch, manifesto talk, expert panel and live Q&A.</p><div><strong>184</strong><small>registered</small><strong>3</strong><small>speakers</small><strong>2</strong><small>messages scheduled</small></div><button className="admin-primary" onClick={() => onNotify("Event workspace opened in mock mode")}>Open event workspace</button></div><div className="event-date"><span>AUG</span><strong>20</strong><small>18:00 BST</small></div></div>
    <section className="admin-panel"><PanelHead title="Event communication timeline" meta="All times Europe/London"/><div className="event-timeline"><div className="done"><span><Icon name="check"/></span><p><strong>Initial announcement</strong><small>Sent to 163 members · 62% opened</small></p><time>24 Jul</time></div><div className="active"><span><Icon name="clock"/></span><p><strong>One-week reminder</strong><small>Scheduled · 184 registered attendees</small></p><time>13 Aug</time></div><div><span>3</span><p><strong>Morning reminder</strong><small>Draft ready for review</small></p><time>20 Aug</time></div><div><span>4</span><p><strong>Resources & feedback</strong><small>Not started</small></p><time>21 Aug</time></div></div></section>
  </>;
}

function AutomationsView({ onNotify }: { onNotify: (message: string) => void }) {
  const runs = [
    ["Sponsor follow-up · Wayve", "Waiting", "Wake tomorrow 09:30", "run_8F2K"],
    ["Welcome member · Mina Park", "Completed", "4 steps · 1.2s", "run_3M9A"],
    ["Reply processing · Nothing", "Needs review", "Positive intent · 92%", "run_1P4D"],
    ["Resend preference sync", "Completed", "3 contacts updated", "run_7X2Q"],
  ];
  return <><PageHeading eyebrow="Vercel Workflow" title="Automations" description="Inspect durable runs, approvals, waits and provider events." action={<button className="admin-secondary" onClick={() => onNotify("Workflow health refreshed")}>Refresh status</button>} />
    <div className="automation-health"><div><span className="live-dot"/><p><strong>Workflow runtime healthy</strong><small>0 failed runs · 3 waiting for external events</small></p></div><span>Last checked 12 sec ago</span></div>
    <section className="admin-table-panel"><div className="member-summary"><strong>Recent runs</strong><span>Last 24 hours</span><div/><button>All workflows</button><button>All statuses</button></div><div className="run-list">{runs.map(([name,status,detail,id]) => <button key={id} onClick={() => onNotify(`${id} inspector opened in mock mode`)}><span className={`run-state ${status.toLowerCase().replace(' ','-')}`}><Icon name={status === 'Completed' ? 'check' : status === 'Waiting' ? 'clock' : 'spark'}/></span><p><strong>{name}</strong><small>{id}</small></p><Badge tone={status === 'Completed' ? 'success' : status === 'Needs review' ? 'warning' : 'info'}>{status}</Badge><span>{detail}</span><Icon name="arrow" size={16}/></button>)}</div></section>
    <div className="admin-grid-two automation-cards"><section className="admin-panel"><PanelHead title="Waiting for approval" meta="2 runs"/><Attention icon="mail" title="NVIDIA proposal follow-up" meta="Draft ready · High confidence" urgent/><Attention icon="spark" title="Wayve personalised introduction" meta="1 claim needs source review"/></section><section className="admin-panel"><PanelHead title="Safety controls" meta="All active"/><div className="safety-list"><p><span className="live-dot"/><strong>First-contact approval</strong><small>Required</small></p><p><span className="live-dot"/><strong>Daily send limit</strong><small>18 / 50</small></p><p><span className="live-dot"/><strong>AI generation budget</strong><small>£8.42 / £30</small></p></div></section></div>
  </>;
}

function ComposeModal({ onClose, onSend }: { onClose: () => void; onSend: () => void }) {
  const [generated, setGenerated] = useState(false);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="compose-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title"><header><div><span>NEW MESSAGE</span><h2 id="compose-title">Create outreach draft</h2></div><button aria-label="Close" onClick={onClose}>×</button></header><div className="compose-body"><label>Message type<select><option>Sponsor introduction</option><option>Newsletter</option><option>Event update</option></select></label><label>Recipient<select><option>Maya Chen · Nothing</option><option>Sam Robertson · Wayve</option><option>Elena Rossi · NVIDIA</option></select></label><label>Template<select><option>Event sponsorship · Warm</option><option>Annual partnership · Direct</option><option>Community partnership</option></select></label><div className="ai-context"><span><Icon name="spark" size={16}/>PERSONALISATION CONTEXT</span><p>Uses 4 approved facts from the lead workspace. No sensitive data included.</p><button onClick={() => setGenerated(true)}>{generated ? 'Regenerate draft' : 'Generate with OpenRouter'}</button></div>{generated ? <><label>Subject<input defaultValue="Nothing × Physical I/O — shaping the physical AI community"/></label><label>Draft<textarea rows={8} defaultValue={`Hi Maya,\n\nI’ve been following Nothing’s work at the intersection of hardware, design and intelligent interfaces. It feels closely aligned with the community we’re building at Physical I/O.\n\nWe’re bringing together founders, engineers, designers and researchers working across physical AI and spatial intelligence, and I’d love to explore how Nothing might take part in our first programme.\n\nWould you be open to a 25-minute conversation next week?\n\nBest,\nAnthony`}/></label><div className="claim-check"><Icon name="check"/><span><strong>4 facts are source-backed</strong><small>No unsupported claims detected</small></span></div></> : <div className="empty-draft"><Icon name="spark" size={24}/><strong>Generate a personalised first draft</strong><span>You’ll review every word before anything can be sent.</span></div>}</div><footer><span>Frontend mockup · no messages will be sent</span><div><button className="admin-secondary" onClick={onClose}>Cancel</button><button className="admin-primary" disabled={!generated} onClick={onSend}>Save draft</button></div></footer></section></div>;
}
