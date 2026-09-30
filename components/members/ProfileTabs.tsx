'use client';
import { useState, type ReactNode } from 'react';
import { Tabs } from '@/workspace-ui/src';

export default function ProfileTabs({ items }: { items: { value: string; label: string; content: ReactNode }[] }) {
  const [tab, setTab] = useState(items[0]?.value ?? '');
  return <div className="profile-tabs"><Tabs label="Your profile" value={tab} onValueChange={setTab} items={items} /></div>;
}
