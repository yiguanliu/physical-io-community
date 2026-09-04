"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Dense admin table with drag- and keyboard-resizable columns. Widths persist
// per table in localStorage, alongside the other admin display preferences.

export type DataColumn<T> = {
  key: string;
  header: string;
  /** Default width in px; the user can drag or key it wider/narrower. */
  width: number;
  minWidth?: number;
  align?: "start" | "end";
  cell: (row: T) => React.ReactNode;
};

const STORAGE_PREFIX = "physical-io-admin-columns:";
const DEFAULT_MIN_WIDTH = 88;
const MAX_WIDTH = 720;
const KEYBOARD_STEP = 16;

function clampWidth(column: DataColumn<unknown>, width: number) {
  return Math.min(MAX_WIDTH, Math.max(column.minWidth ?? DEFAULT_MIN_WIDTH, Math.round(width)));
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  storageKey,
  label,
  empty,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Stable id used to remember this table's column widths. */
  storageKey: string;
  label: string;
  empty?: string;
}) {
  const defaults = useCallback(
    () => Object.fromEntries(columns.map((column) => [column.key, column.width])) as Record<string, number>,
    [columns],
  );
  const [widths, setWidths] = useState<Record<string, number>>(defaults);
  const widthsRef = useRef(widths);
  const [resizing, setResizing] = useState<string | null>(null);
  const drag = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  // Read after mount so server and client render the same default widths.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, number>;
      setWidths((current) => {
        const next = { ...current };
        for (const column of columns) {
          const value = parsed[column.key];
          if (typeof value === "number" && Number.isFinite(value)) {
            next[column.key] = clampWidth(column as DataColumn<unknown>, value);
          }
        }
        widthsRef.current = next;
        return next;
      });
    } catch {
      // Ignore unreadable preferences and keep the defaults.
    }
    // Column definitions are static per table; only the storage key matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = useCallback(
    (next: Record<string, number>) => {
      try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode); resizing still works.
      }
    },
    [storageKey],
  );

  const setWidth = useCallback(
    (column: DataColumn<T>, width: number, save: boolean) => {
      setWidths((current) => {
        const next = { ...current, [column.key]: clampWidth(column as DataColumn<unknown>, width) };
        widthsRef.current = next;
        if (save) persist(next);
        return next;
      });
    },
    [persist],
  );

  function onPointerDown(event: React.PointerEvent<HTMLSpanElement>, column: DataColumn<T>) {
    event.preventDefault();
    drag.current = { key: column.key, startX: event.clientX, startWidth: widths[column.key] ?? column.width };
    setResizing(column.key);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLSpanElement>, column: DataColumn<T>) {
    const state = drag.current;
    if (!state || state.key !== column.key) return;
    setWidth(column, state.startWidth + (event.clientX - state.startX), false);
  }

  function onPointerUp(event: React.PointerEvent<HTMLSpanElement>, column: DataColumn<T>) {
    if (!drag.current) return;
    drag.current = null;
    setResizing(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
    persist(widthsRef.current);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLSpanElement>, column: DataColumn<T>) {
    const current = widths[column.key] ?? column.width;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setWidth(column, current - KEYBOARD_STEP, true);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setWidth(column, current + KEYBOARD_STEP, true);
    } else if (event.key === "Home" || event.key === "Enter") {
      event.preventDefault();
      setWidth(column, column.width, true);
    }
  }

  function resetWidths() {
    const next = defaults();
    widthsRef.current = next;
    setWidths(next);
    persist(next);
  }

  const total = columns.reduce((sum, column) => sum + (widths[column.key] ?? column.width), 0);

  if (!rows.length) {
    return <p className="admin-empty-note">{empty ?? "Nothing to show yet."}</p>;
  }

  return (
    <div className="data-table-shell">
      <div className="data-table-wrap">
        <table className="data-table" style={{ width: total }}>
          <caption className="visually-hidden">{label} — column widths can be dragged or resized with the arrow keys.</caption>
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={{ width: widths[column.key] ?? column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={column.key} scope="col" data-align={column.align ?? "start"}>
                  <span className="data-table-header">{column.header}</span>
                  {index < columns.length - 1 ? (
                    <span
                      className={resizing === column.key ? "data-table-resizer active" : "data-table-resizer"}
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize the ${column.header} column`}
                      aria-valuenow={widths[column.key] ?? column.width}
                      aria-valuemin={column.minWidth ?? DEFAULT_MIN_WIDTH}
                      aria-valuemax={MAX_WIDTH}
                      tabIndex={0}
                      onPointerDown={(event) => onPointerDown(event, column)}
                      onPointerMove={(event) => onPointerMove(event, column)}
                      onPointerUp={(event) => onPointerUp(event, column)}
                      onPointerCancel={() => {
                        drag.current = null;
                        setResizing(null);
                        persist(widthsRef.current);
                      }}
                      onKeyDown={(event) => onKeyDown(event, column)}
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} data-align={column.align ?? "start"}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="data-table-foot">
        <span>
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </span>
        <Button type="button" variant="link" className="admin-link-button h-auto p-0" onClick={resetWidths}>
          Reset column widths
        </Button>
      </div>
    </div>
  );
}
