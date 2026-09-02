"use client";

import { useEffect, useRef } from "react";
import { IconGrid, IconList, IconSearch, NewsThumb, SadMac } from "./PixelIcons";
import type { NewsArticle } from "./news";

export type NewsView = "index" | "article";
export type NewsLayout = "list" | "grid";

export interface NewsState {
  /** "index" is the feed the program boots into; "article" is a story page. */
  view: NewsView;
  /** Index presentation — dense rows or an icon grid. */
  layout: NewsLayout;
  /** Stories left after the category filter and search. */
  articles: NewsArticle[];
  /** The open story, resolved from the full feed. */
  article: NewsArticle | null;
  /** Highlighted row on the index, open story in the article view. */
  activeId: string;
  /** True while the current page is "loading". */
  loading: boolean;
  /** Total stories in the feed, before filtering. */
  total: number;
  onOpen: (id: string) => void;
  onBack: () => void;
  onLayout: (layout: NewsLayout) => void;
  /** Sidebar + search are utilities of the maximised (modal) window only. */
  utilities: boolean;
  categories: { label: string; count: number }[];
  /** Active category label, or "all". */
  category: string;
  onCategory: (category: string) => void;
  query: string;
  onQuery: (query: string) => void;
}

/** Barber-pole + skeleton page used for both views. */
function Loading({ label }: { label: string }) {
  return (
    <div className="news-doc news-loading" role="status" aria-live="polite">
      <p className="news-load-line">
        {label}
        <span className="os-blink">…</span>
      </p>
      <div className="news-load-bar" aria-hidden="true">
        <span />
      </div>
      <div className="news-sk-head" aria-hidden="true" />
      <div className="news-sk" aria-hidden="true" />
      <div className="news-sk" aria-hidden="true" />
      <div className="news-sk news-sk-short" aria-hidden="true" />
      <div className="news-sk" aria-hidden="true" />
      <div className="news-sk news-sk-short" aria-hidden="true" />
    </div>
  );
}

/** news.exe inside the robot's screen: the feed index, then the story it
 *  opens. Black & white only, like the rest of the OS. */
export default function NewsScreen({
  view,
  layout,
  articles,
  article,
  activeId,
  loading,
  total,
  onOpen,
  onBack,
  onLayout,
  utilities,
  categories,
  category,
  onCategory,
  query,
  onQuery,
}: NewsState) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const position = articles.findIndex((a) => a.id === activeId);

  // Each page starts at the top; the index keeps the cursor in view.
  useEffect(() => {
    if (loading) return;
    if (view === "article") {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
      return;
    }
    bodyRef.current
      ?.querySelector<HTMLElement>(`[data-id="${activeId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [loading, view, layout, activeId]);

  const views = (
    <span className="news-views" role="group" aria-label="Index layout">
      <button
        className={`news-view-btn${layout === "list" ? " is-on" : ""}`}
        onClick={() => onLayout("list")}
        data-tip="List view"
        aria-pressed={layout === "list"}
        aria-label="List view"
      >
        <IconList />
      </button>
      <button
        className={`news-view-btn${layout === "grid" ? " is-on" : ""}`}
        onClick={() => onLayout("grid")}
        data-tip="Grid view"
        aria-pressed={layout === "grid"}
        aria-label="Grid view"
      >
        <IconGrid />
      </button>
    </span>
  );

  const search = (
    <form
      className="news-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (articles.length) onOpen(articles[0].id);
      }}
    >
      <IconSearch className="news-search-ico" />
      <input
        type="text"
        value={query}
        placeholder="Search stories"
        aria-label="Search stories"
        onChange={(e) => onQuery(e.target.value)}
      />
      {query && (
        <button type="button" className="news-search-clear" onClick={() => onQuery("")} aria-label="Clear search">
          ✕
        </button>
      )}
    </form>
  );

  const bar = (
    <div className="news-bar">
      {view === "index" ? (
        <>
          <span className="news-bar-title">{category === "all" ? "Latest" : category}</span>
          <span className="news-bar-keys" aria-hidden="true">
            ↑↓ ⏎
          </span>
        </>
      ) : (
        <>
          <button className="news-back" onClick={onBack}>
            ◀ Index
          </button>
          <span className="news-bar-keys" aria-hidden="true">
            ↑↓ · esc
          </span>
        </>
      )}
      <span className="news-bar-right">
        {utilities && search}
        {view === "index" && views}
        <span className="news-bar-note">
          {view === "article" && position >= 0
            ? `${position + 1} of ${articles.length}`
            : articles.length === total
              ? `${total} stories`
              : `${articles.length} of ${total}`}
        </span>
      </span>
    </div>
  );

  const sidebar = utilities && (
    <nav className="news-side" aria-label="Categories">
      <span className="news-side-title">Topics</span>
      <button
        className={`news-cat${category === "all" ? " is-on" : ""}`}
        onClick={() => onCategory("all")}
        aria-pressed={category === "all"}
      >
        <span className="news-cat-label">All stories</span>
        <span className="news-cat-count">{total}</span>
      </button>
      {categories.map((c) => (
        <button
          key={c.label}
          className={`news-cat${category === c.label ? " is-on" : ""}`}
          onClick={() => onCategory(c.label)}
          aria-pressed={category === c.label}
        >
          <span className="news-cat-label">{c.label}</span>
          <span className="news-cat-count">{c.count}</span>
        </button>
      ))}
    </nav>
  );

  let page: React.ReactNode;
  if (loading) {
    page = <Loading label={view === "index" ? "loading index" : "fetching wire"} />;
  } else if (view === "article" && article) {
    page = (
      <div className="news-doc" ref={bodyRef} key={article.id}>
        <div className="news-head">
          <span className="news-head-thumb" aria-hidden="true">
            <NewsThumb name={article.thumb} />
          </span>
          <span className="news-kicker">
            <span className="news-cat-tag">{article.category}</span>
            <span className="news-src">{article.source}</span>
            <span className="news-time">{article.time}</span>
          </span>
        </div>

        <h1 className="news-headline">{article.title}</h1>
        <div className="news-rule" aria-hidden="true" />
        <p className="news-dek">{article.dek}</p>

        <div className="news-body">
          {article.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <p className="news-foot">
          <span className="news-votes">▲ {article.votes.toLocaleString("en-GB")}</span>
          <button className="news-foot-back" onClick={onBack}>
            back to index
          </button>
          {article.href && (
            <a className="news-link" href={article.href} target="_blank" rel="noopener noreferrer">
              read source ↗
            </a>
          )}
        </p>
      </div>
    );
  } else if (!articles.length) {
    page = (
      <div className="news-empty">
        <SadMac className="os-happymac os-happymac-sm" />
        <p className="news-empty-title">No stories match</p>
        <p className="news-empty-sub">
          {query ? `nothing for “${query}”` : "try another topic"}
        </p>
      </div>
    );
  } else if (layout === "grid") {
    page = (
      <div className="news-grid" ref={bodyRef} role="listbox" aria-label="Latest stories">
        {articles.map((a) => (
          <button
            key={a.id}
            data-id={a.id}
            role="option"
            aria-selected={a.id === activeId}
            className={`news-card${a.id === activeId ? " is-cursor" : ""}`}
            onClick={() => onOpen(a.id)}
          >
            <span className="news-card-top">
              <span className="news-card-thumb" aria-hidden="true">
                <NewsThumb name={a.thumb} />
              </span>
              <span className="news-card-votes" aria-hidden="true">
                ▲{a.votes.toLocaleString("en-GB")}
              </span>
            </span>
            <span className="news-card-title">{a.title}</span>
            <span className="news-card-meta">
              {a.category} &middot; {a.time}
            </span>
          </button>
        ))}
      </div>
    );
  } else {
    page = (
      <div className="news-index" ref={bodyRef} role="listbox" aria-label="Latest stories">
        {articles.map((a, i) => (
          <button
            key={a.id}
            data-id={a.id}
            role="option"
            aria-selected={a.id === activeId}
            className={`news-row${a.id === activeId ? " is-cursor" : ""}`}
            onClick={() => onOpen(a.id)}
          >
            <span className="news-row-thumb" aria-hidden="true">
              <NewsThumb name={a.thumb} />
            </span>
            <span className="news-row-main">
              <span className="news-row-title">{a.title}</span>
              <span className="news-row-meta">
                {a.source} &middot; {a.category} &middot; {a.time}
              </span>
            </span>
            <span className="news-row-votes" aria-hidden="true">
              ▲{a.votes.toLocaleString("en-GB")}
            </span>
            <span className="news-row-idx" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="news-split">
      {sidebar}
      <div className="news-main">
        {bar}
        {page}
      </div>
    </div>
  );
}
