"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Icon } from "@/components/admin/ui";
import DataTable, { type DataColumn } from "@/components/admin/data-table";
import { moveStageAction } from "@/app/admin/content-actions";
import { BOARD_STAGES, PLATFORM_META, STAGE_META, type ContentStage } from "@/lib/marketing/config";
import type { ContentItemSummary } from "@/lib/admin/content-studio";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSelect } from "@/components/admin/form-select";

type View = "kanban" | "list" | "calendar";

function stageTone(stage: string) {
  if (stage === "published") return "success";
  if (stage === "approved" || stage === "scheduled") return "info";
  if (stage === "review") return "warning";
  return "neutral";
}

function fmtDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function MarketingBoard({ items }: { items: ContentItemSummary[] }) {
  const [view, setView] = useState<View>("kanban");
  const [tag, setTag] = useState<string>("all");
  const router = useRouter();
  const [pending, start] = useTransition();

  const tags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => item.categoryTags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [items]);

  const visible = useMemo(
    () => (tag === "all" ? items : items.filter((item) => item.categoryTags.includes(tag))),
    [items, tag],
  );

  const listColumns = useMemo<DataColumn<ContentItemSummary>[]>(
    () => [
      {
        key: "title",
        header: "Title",
        width: 300,
        minWidth: 180,
        cell: (item) => (
          <Link href={`/admin/marketing/${item.id}`} className="data-table-primary-link">
            {item.title}
          </Link>
        ),
      },
      {
        key: "stage",
        header: "Stage",
        width: 130,
        minWidth: 110,
        cell: (item) => <Badge tone={stageTone(item.status)}>{STAGE_META[item.status]?.label ?? item.status}</Badge>,
      },
      {
        key: "tags",
        header: "Tags",
        width: 230,
        minWidth: 130,
        cell: (item) => item.categoryTags.join(", ") || "—",
      },
      {
        key: "owner",
        header: "Owner",
        width: 170,
        minWidth: 120,
        cell: (item) => item.assignedToName || item.createdByName || "—",
      },
      {
        key: "platforms",
        header: "Ready platforms",
        width: 210,
        minWidth: 150,
        cell: (item) => {
          const labels = item.variants
            .filter((variant) => variant.status === "ready" || variant.status === "published")
            .map((variant) => PLATFORM_META[variant.platform].label);
          return labels.join(", ") || "None";
        },
      },
      {
        key: "updated",
        header: "Updated",
        width: 110,
        minWidth: 96,
        cell: (item) => fmtDate(item.updatedAt),
      },
    ],
    [],
  );

  function move(id: string, status: ContentStage) {
    const form = new FormData();
    form.set("id", id);
    form.set("status", status);
    start(async () => {
      await moveStageAction(form);
      router.refresh();
    });
  }

  return (
    <Tabs value={view} onValueChange={(next) => setView(next as View)} className="admin-table-panel content-board gap-0">
      <div className="content-board-toolbar">
        <TabsList className="admin-segmented" aria-label="View">
          {(["kanban", "list", "calendar"] as View[]).map((option) => (
            <TabsTrigger
              key={option}
              value={option}
              className={view === option ? "active" : ""}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        <FormSelect
          className="admin-select"
          value={tag}
          onValueChange={setTag}
          aria-label="Filter by tag"
          options={[{ value: "all", label: "All tags" }, ...tags.map((value) => ({ value, label: value }))]}
        />
        {pending ? <span className="content-board-status">Saving…</span> : null}
      </div>

      {visible.length === 0 ? (
        <p className="admin-empty-note">No content yet. Use “Find news” above or create a piece to get started.</p>
      ) : view === "kanban" ? (
        <div className="kanban content-kanban">
          {BOARD_STAGES.map((stage) => {
            const column = visible.filter((item) => item.status === stage);
            return (
              <div className="kanban-column" key={stage}>
                <header>
                  <span>{STAGE_META[stage].label}</span>
                  <b>{column.length}</b>
                </header>
                {column.map((item) => (
                  <div key={item.id} className="content-card">
                    <Link href={`/admin/marketing/${item.id}`} className="content-card-title">
                      {item.title}
                    </Link>
                    {item.summary ? <p>{item.summary}</p> : null}
                    <div className="content-card-tags">
                      {item.categoryTags.slice(0, 3).map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    <div className="content-card-foot">
                      <small>{item.assignedToName || item.createdByName || "Unassigned"}</small>
                      <FormSelect
                        className="content-move"
                        value={item.status}
                        onValueChange={(value) => move(item.id, value as ContentStage)}
                        aria-label={`Move ${item.title} to another stage`}
                        options={BOARD_STAGES
                          .filter((value) => !["approved", "scheduled"].includes(value) || value === item.status)
                          .map((value) => ({ value, label: STAGE_META[value].label }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : view === "list" ? (
        <DataTable
          columns={listColumns}
          rows={visible}
          rowKey={(item) => item.id}
          storageKey="marketing-content"
          label="Marketing content"
        />
      ) : (
        <CalendarView items={visible} />
      )}
    </Tabs>
  );
}

function CalendarView({ items }: { items: ContentItemSummary[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const dated = useMemo(() => {
    const map = new Map<string, ContentItemSummary[]>();
    items.forEach((item) => {
      const when = item.scheduledAt || item.publishedAt;
      if (!when) return;
      const key = new Date(when).toDateString();
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return map;
  }, [items]);

  const first = new Date(cursor.year, cursor.month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(cursor.year, cursor.month, d));

  const monthLabel = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const undated = items.filter((item) => !item.scheduledAt && !item.publishedAt);

  return (
    <div className="content-calendar">
      <div className="content-calendar-head">
        <Button
          type="button"
          className="admin-icon-button"
          variant="outline"
          onClick={() => setCursor((c) => ({ year: c.month === 0 ? c.year - 1 : c.year, month: c.month === 0 ? 11 : c.month - 1 }))}
          aria-label="Previous month"
        >
          <Icon name="arrow-left" size={16} />
        </Button>
        <strong>{monthLabel}</strong>
        <Button
          type="button"
          className="admin-icon-button"
          variant="outline"
          onClick={() => setCursor((c) => ({ year: c.month === 11 ? c.year + 1 : c.year, month: c.month === 11 ? 0 : c.month + 1 }))}
          aria-label="Next month"
        >
          <Icon name="arrow" size={16} />
        </Button>
      </div>
      <div className="content-calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <span key={d} className="content-calendar-dow">
            {d}
          </span>
        ))}
        {cells.map((cell, index) => (
          <div key={index} className={`content-calendar-cell ${cell ? "" : "empty"}`}>
            {cell ? <span className="content-calendar-date">{cell.getDate()}</span> : null}
            {cell
              ? (dated.get(cell.toDateString()) ?? []).map((item) => (
                  <Link key={item.id} href={`/admin/marketing/${item.id}`} className="content-calendar-chip">
                    {item.title}
                  </Link>
                ))
              : null}
          </div>
        ))}
      </div>
      {undated.length ? (
        <p className="admin-empty-note">
          {undated.length} item{undated.length === 1 ? "" : "s"} without a scheduled date are not shown on the calendar.
        </p>
      ) : null}
    </div>
  );
}
