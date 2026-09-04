import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEmailSend: vi.fn(),
  updateEmailSend: vi.fn(),
  addContentNote: vi.fn(),
  writeAudit: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/admin/audience", () => ({
  parseAudienceFilter: vi.fn(() => ({})),
  resolveAudience: vi.fn(() => ({ eligible: [], skipped: [] })),
  skipReasonForMember: vi.fn(),
}));
vi.mock("@/lib/admin/store", () => ({
  getAllAudienceMembers: vi.fn(),
  getRawMember: vi.fn(),
  writeAudit: mocks.writeAudit,
}));
vi.mock("@/lib/admin/content-studio", () => ({
  addContentNote: mocks.addContentNote,
  getEmailSend: mocks.getEmailSend,
  insertEmailRecipients: vi.fn(),
  updateEmailSend: mocks.updateEmailSend,
}));
vi.mock("@/lib/db/ids", () => ({ createId: vi.fn(() => "id"), nowIso: vi.fn(() => "2026-09-04T12:00:00.000Z") }));
vi.mock("@/lib/email/send", () => ({
  escapeHtml: vi.fn((value: string) =>
    value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"),
  ),
  renderMemberEmail: vi.fn((body: string) => body),
  sendEmail: mocks.sendEmail,
}));
vi.mock("@/lib/site", () => ({ SITE_URL: "https://physical-io.com" }));

import { sendNewsletterTest } from "./newsletter";

const send = {
  id: "send-1",
  contentItemId: "content-1",
  status: "draft",
  subject: "Hello",
  body: "## News",
  fromName: "Physical I/O",
  replyTo: "",
};

describe("newsletter test sends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEmail.mockResolvedValue({ provider: "local", id: "email-1" });
  });

  it("advances a draft to test", async () => {
    mocks.getEmailSend.mockResolvedValue(send);
    await sendNewsletterTest("send-1", "editor@example.com", { id: "admin-1", name: "Ada Admin" });
    expect(mocks.updateEmailSend).toHaveBeenCalledWith("send-1", { status: "test" });
  });

  it("does not clear the sent guard when a test is sent after the campaign", async () => {
    mocks.getEmailSend.mockResolvedValue({ ...send, status: "sent" });
    await sendNewsletterTest("send-1", "editor@example.com", { id: "admin-1", name: "Ada Admin" });
    expect(mocks.updateEmailSend).not.toHaveBeenCalled();
  });
});
