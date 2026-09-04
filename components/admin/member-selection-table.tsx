"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createSelectedCampaignAction } from "@/app/admin/actions";
import { Badge, formatDate, Icon, initials } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type MemberRow = {
  id: string;
  email: string;
  fullName: string;
  professionalRole: string;
  city: string;
  experienceRange: string;
  interests: string[];
  signedUpAt: string;
  status: string;
};

export default function MemberSelectionTable({
  members,
  total,
}: {
  members: MemberRow[];
  total: number;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const visibleIds = useMemo(() => members.map((member) => member.id), [members]);
  const selected = new Set(selectedIds);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggleMember(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  function toggleVisible(checked: boolean) {
    setSelectedIds((current) => {
      if (!checked) return current.filter((id) => !visibleIds.includes(id));
      return [...current, ...visibleIds.filter((id) => !current.includes(id))];
    });
  }

  return (
    <section className="admin-table-panel">
      <form action={createSelectedCampaignAction}>
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="memberIds" value={id} />
        ))}
        <div className="member-summary">
          <strong>{members.length} shown</strong>
          <span>{total} total members</span>
          <span>{selectedIds.length} selected</span>
          <div />
          <Button className="admin-secondary compact-action" variant="outline" type="button" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>
            Clear
          </Button>
          <Button className="admin-primary compact-action" type="submit" disabled={!selectedIds.length}>
            <Icon name="mail" size={14} />
            Email selected
          </Button>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th className="member-select-col">
                  <Checkbox
                    aria-label="Select all shown members"
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) => toggleVisible(checked === true)}
                  />
                </th>
                <th className="member-main-col">Member</th>
                <th>Role</th>
                <th>Location</th>
                <th>Experience</th>
                <th>Work areas</th>
                <th>Joined</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className={selected.has(member.id) ? "selected-row" : undefined}>
                  <td className="member-select-col">
                    <Checkbox
                      aria-label={`Select ${member.fullName}`}
                      checked={selected.has(member.id)}
                      onCheckedChange={(checked) => toggleMember(member.id, checked === true)}
                    />
                  </td>
                  <td className="member-main-col">
                    <Link className="member-cell" href={`/admin/members/${member.id}`}>
                      <span>{initials(member.fullName)}</span>
                      <p>
                        <strong>{member.fullName}</strong>
                        <small>{member.email}</small>
                      </p>
                    </Link>
                  </td>
                  <td>{member.professionalRole || "—"}</td>
                  <td>{member.city || "—"}</td>
                  <td>{member.experienceRange || "—"}</td>
                  <td>
                    <div className="topic-list">
                      {member.interests.slice(0, 2).map((topic) => (
                        <Badge key={topic}>{topic}</Badge>
                      ))}
                    </div>
                  </td>
                  <td>{formatDate(member.signedUpAt)}</td>
                  <td>
                    <Badge tone={member.status === "active" ? "success" : member.status === "review" ? "warning" : "neutral"}>
                      {member.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </section>
  );
}
