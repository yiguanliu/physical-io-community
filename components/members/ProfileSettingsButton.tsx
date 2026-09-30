'use client';
import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Alert, Button, Dialog, IconButton, Tooltip } from '@/workspace-ui/src';
import { memberSignOut } from '@/app/login/actions';
import ProfileSettings from './ProfileSettings';
import type { OwnProfile } from '@/lib/members/profile';

/** Profile settings collapse behind one icon beside the member's name. */
export default function ProfileSettingsButton({ profile }: { profile: OwnProfile }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    setBusy(true); setError('');
    try { await memberSignOut(); } catch { setError('Could not sign out. Please try again.'); setBusy(false); }
  }
  return <>
    <Tooltip label="Profile settings"><IconButton label="Profile settings" variant="ghost" className="profile-settings-button" onClick={() => setOpen(true)}><Settings size={20} aria-hidden /></IconButton></Tooltip>
    <Dialog open={open} onOpenChange={setOpen} kind="drawer" title="Profile settings" description="Your photo, details and who can see your profile.">
      <div className="member-stack">
        <ProfileSettings profile={profile} />
        <div className="profile-settings-signout">
          {error && <Alert title="Sign out failed" tone="danger">{error}</Alert>}
          <Button variant="ghost" busy={busy} onClick={signOut}>Sign out</Button>
        </div>
      </div>
    </Dialog>
  </>;
}
