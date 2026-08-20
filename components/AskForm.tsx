"use client";

import { useState } from "react";
import { ASK_CATEGORIES } from "@/lib/site";

type Status = "idle" | "submitting" | "success" | "error";

export default function AskForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(ASK_CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, message, company }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      setName("");
      setEmail("");
      setCategory(ASK_CATEGORIES[0]);
      setMessage("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="ask-success" role="status">
        <div className="ask-success-mark" aria-hidden="true">✓</div>
        <h2>Thanks — your question is on its way.</h2>
        <p>We&apos;ll get back to you within a day at the email you provided.</p>
        <button type="button" className="btn btn-ghost" onClick={() => setStatus("idle")}>
          Ask another question
        </button>
      </div>
    );
  }

  return (
    <form className="ask-form" onSubmit={handleSubmit} noValidate>
      <div className="ask-field-row">
        <div className="ask-field">
          <label htmlFor="ask-name">Name</label>
          <input
            id="ask-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="ask-field">
          <label htmlFor="ask-email">Email</label>
          <input
            id="ask-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="ask-field">
        <label htmlFor="ask-category">What&apos;s this about?</label>
        <div className="ask-select-wrap">
          <select
            id="ask-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {ASK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <svg className="ask-select-caret" viewBox="0 0 12 8" aria-hidden="true">
            <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="ask-field">
        <label htmlFor="ask-message">What would you like to learn more about us?</label>
        <textarea
          id="ask-message"
          name="message"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask us anything — we'll get back to you within a day."
        />
      </div>

      {/* Honeypot field — hidden from real users. */}
      <div className="ask-hp" aria-hidden="true">
        <label htmlFor="ask-company">Company</label>
        <input
          id="ask-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {status === "error" && (
        <p className="ask-error" role="alert">
          {errorMsg}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-lg" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send question"}
        {status !== "submitting" && <span className="arrow">→</span>}
      </button>
    </form>
  );
}
