"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addLeadNoteAction, completeNextActionAction, saveOutreachDraftAction, updateLeadStatusAction } from "@/app/admin/actions";
import { Badge, formatMoney, Icon, initials } from "@/components/admin/ui";

type Lead = {
  id: string;
  company: string;
  contactName: string;
  contactEmail: string;
  contactRole: string;
  status: string;
  fitScore: number;
  estimatedValueGbp: number;
  nextAction: string;
  lastActivityAt: string | null;
};

const STAGES = ["research", "contacted", "meeting", "proposal"] as const;

export default function OutreachBoard({
  leads,
  selected,
}: {
  leads: Lead[];
  selected: (Lead & {
    website: string;
    activities: Array<{ id: string; type: string; title: string; detail: string; createdAt: string }>;
    messages: Array<{ id: string; subject: string; body: string; status: string; createdAt: string }>;
  }) | null;
}) {
  const router = useRouter();
  const [leadId, setLeadId] = useState(selected?.id ?? leads[0]?.id ?? "");
  const [pending, start] = useTransition();
  const current = useMemo(() => {
    if (selected?.id === leadId) return selected;
    return leads.find((lead) => lead.id === leadId) ?? selected;
  }, [leadId, leads, selected]);

  if (!current) return <p>No leads yet. Create one to start outreach.</p>;

  return (
    <div className="outreach-layout">
      <section className="admin-panel outreach-pipeline">
        <div className="kanban">
          {STAGES.map((stage) => (
            <div className="kanban-column" key={stage}>
              <header>
                <span>{stage}</span>
                <b>{leads.filter((lead) => lead.status === stage).length}</b>
              </header>
              {leads
                .filter((lead) => lead.status === stage)
                .map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    className={lead.id === current.id ? "lead-card selected" : "lead-card"}
                    onClick={() => {
                      setLeadId(lead.id);
                      router.push(`/admin/outreach?lead=${lead.id}`);
                    }}
                  >
                    <div>
                      <span>{initials(lead.company)}</span>
                      <Badge>{lead.fitScore}</Badge>
                    </div>
                    <strong>{lead.company}</strong>
                    <small>
                      {lead.contactName} · {lead.contactRole}
                    </small>
                    <footer>
                      <span>{formatMoney(lead.estimatedValueGbp)}</span>
                      <span>{lead.nextAction || "No next action"}</span>
                    </footer>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </section>
      <aside className="lead-drawer">
        <header>
          <div className="company-mark">{initials(current.company)}</div>
          <div>
            <span>SPONSOR LEAD</span>
            <h2>{current.company}</h2>
            <p>
              {current.contactName} · {current.contactRole}
            </p>
          </div>
        </header>
        <div className="lead-score">
          <div>
            <span>Fit score</span>
            <strong>
              {current.fitScore}
              <small>/100</small>
            </strong>
          </div>
          <div>
            <span>Est. value</span>
            <strong>{formatMoney(current.estimatedValueGbp)}</strong>
          </div>
          <div>
            <span>Stage</span>
            <form action={updateLeadStatusAction}>
              <input type="hidden" name="id" value={current.id} />
              <select name="status" defaultValue={current.status} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
                {["research", "contacted", "meeting", "proposal", "agreement", "won", "lost", "nurture"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </form>
          </div>
        </div>
        <form
          className="compose-mini"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            start(async () => {
              await saveOutreachDraftAction(form);
            });
          }}
        >
          <input type="hidden" name="leadId" value={current.id} />
          <input type="hidden" name="toEmail" value={current.contactEmail} />
          <input type="hidden" name="toName" value={current.contactName} />
          <label>
            Subject
            <input name="subject" required defaultValue={`${current.company} × Physical I/O`} />
          </label>
          <label>
            Message
            <textarea name="body" rows={6} required defaultValue={`Hi ${current.contactName.split(" ")[0] || current.contactName},\n\n`} />
          </label>
          <button className="admin-primary" type="submit" disabled={pending}>
            <Icon name="mail" size={16} />
            Send outreach email
          </button>
        </form>
        <div className="lead-timeline">
          {"activities" in current && Array.isArray((current as { activities?: unknown }).activities)
            ? (current as { activities: Array<{ id: string; title: string; detail: string; createdAt: string; type: string }> }).activities.map((item) => (
                <div key={item.id}>
                  <span>
                    <Icon name={item.type === "email" ? "mail" : "check"} size={15} />
                  </span>
                  <p>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </p>
                  <time>{new Date(item.createdAt).toLocaleDateString("en-GB")}</time>
                </div>
              ))
            : null}
        </div>
        {current.nextAction ? (
          <form className="next-action" action={completeNextActionAction}>
            <span>NEXT ACTION</span>
            <strong>{current.nextAction}</strong>
            <input type="hidden" name="id" value={current.id} />
            <button type="submit">Mark complete</button>
          </form>
        ) : null}
        <form className="compose-mini" action={addLeadNoteAction}>
          <input type="hidden" name="id" value={current.id} />
          <label>
            Internal note
            <textarea name="note" rows={3} required />
          </label>
          <button className="admin-secondary" type="submit">
            Add note
          </button>
        </form>
      </aside>
    </div>
  );
}
