"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/admin/ui";
import { createContentAction } from "@/app/admin/content-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Candidate = {
  title: string;
  hook: string;
  whyViral: string;
  sourceUrl: string;
  sourceTitle: string;
  snippet: string;
  suggestedTags: string[];
};

export default function DiscoverPanel() {
  const [open, setOpen] = useState(false);
  const [steer, setSteer] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, start] = useTransition();

  async function findNews() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ steer: steer.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Search failed.");
      const data = (await res.json()) as { candidates: Candidate[]; provider: string };
      setCandidates(data.candidates);
      setProvider(data.provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  function create(candidate: Candidate) {
    const form = new FormData();
    form.set("title", candidate.title);
    form.set("summary", candidate.hook);
    form.set("categoryTags", candidate.suggestedTags.join(", "));
    form.set("sourceKind", candidate.sourceUrl ? "web" : "ai");
    form.set("sourceUrl", candidate.sourceUrl);
    form.set("sourceTitle", candidate.sourceTitle);
    form.set("sourceSnippet", candidate.snippet);
    start(async () => {
      await createContentAction(form);
    });
  }

  function createManual(formData: FormData) {
    start(async () => {
      await createContentAction(formData);
    });
  }

  return (
    <section className="admin-panel discover-panel">
      <div className="discover-head">
        <div>
          <strong>Discover</strong>
          <small>Let the agent surface recent Physical AI news, or start from your own angle.</small>
        </div>
        <div className="discover-actions">
          <details className="admin-details">
            <summary className="admin-secondary">
              <Icon name="plus" size={16} />
              New content
            </summary>
            <form className="admin-form compact-form" action={createManual}>
              <label>
                Title
                <Input name="title" required placeholder="Working title" />
              </label>
              <label>
                Hook / summary
                <Input name="summary" placeholder="One-line hook" />
              </label>
              <label>
                Tags (comma separated)
                <Input name="categoryTags" placeholder="Physical AI, Robotics" />
              </label>
              <label>
                Reference URL (optional)
                <Input name="sourceUrl" placeholder="https://…" />
              </label>
              <input type="hidden" name="sourceKind" value="manual" />
              <Button className="admin-primary" type="submit" disabled={creating}>
                Create
              </Button>
            </form>
          </details>
          <Button type="button" className="admin-primary" onClick={() => setOpen((v) => !v)}>
            <Icon name="spark" size={16} />
            Find news
          </Button>
        </div>
      </div>

      {open ? (
        <div className="discover-body">
          <div className="discover-search">
            <Input
              value={steer}
              aria-label="Guide the news search"
              onChange={(event) => setSteer(event.target.value)}
              placeholder="Optional: steer the search (e.g. humanoid robots, smart glasses, world models)"
              onKeyDown={(event) => {
                if (event.key === "Enter") findNews();
              }}
            />
            <Button type="button" className="admin-primary" onClick={findNews} disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </div>
          {provider === "local" ? (
            <p className="admin-empty-note">Showing starter angles (no live search — set OPENAI_API_KEY for web results).</p>
          ) : null}
          {error ? <p className="admin-auth-error" role="alert">{error}</p> : null}
          <div className="discover-grid">
            {candidates.map((candidate, index) => (
              <article key={index} className="discover-card">
                <h4>{candidate.title}</h4>
                <p>{candidate.hook}</p>
                {candidate.whyViral ? <p className="discover-why">Why it travels: {candidate.whyViral}</p> : null}
                <div className="content-card-tags">
                  {candidate.suggestedTags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                {candidate.sourceUrl ? (
                  <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="discover-source">
                    <Icon name="link" size={13} /> {candidate.sourceTitle || "Source"}
                  </a>
                ) : null}
                <Button type="button" className="admin-secondary" variant="outline" onClick={() => create(candidate)} disabled={creating}>
                  Use this topic
                </Button>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
