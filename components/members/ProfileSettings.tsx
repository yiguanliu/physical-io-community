'use client';
import { useActionState, useState } from 'react';
import { Alert, Button, Field, Switch, TextArea } from '@/workspace-ui/src';
import { saveProfile, type ProfileState } from '@/app/members/actions';
import type { OwnProfile } from '@/lib/members/profile';
import HeadshotPicker, { uploadMemberPhoto } from './HeadshotPicker';
import { CommunityAdminMark } from './VerifiedSeal';

export default function ProfileSettings({ profile }: { profile: OwnProfile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, { slug: profile.slug });
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const [photo, setPhoto] = useState(profile.photoUrl || null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  // Uploads straight away so the photo never depends on the rest of the form being saved.
  async function changePhoto(blob: Blob, preview: string) {
    setPhotoBusy(true); setPhotoMessage(null);
    try { setPhoto(await uploadMemberPhoto(blob) || preview); setPhotoMessage({ tone: 'success', text: 'Your photo is updated.' }); }
    catch (e) { setPhotoMessage({ tone: 'danger', text: e instanceof Error ? e.message : 'Your photo could not be uploaded.' }); }
    finally { setPhotoBusy(false); }
  }
  async function removePhoto() {
    setPhotoBusy(true); setPhotoMessage(null);
    try {
      const response = await fetch('/api/members/photo', { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Your photo could not be removed.');
      setPhoto(null); setPhotoMessage({ tone: 'success', text: 'Your photo is removed.' });
    } catch (e) { setPhotoMessage({ tone: 'danger', text: (e as Error).message }); } finally { setPhotoBusy(false); }
  }
  return <div className="member-profile-settings">
    <form action={action} className="member-stack">
      <p className="member-note">Your profile shows your photo, name, job title, company, bio and the episodes you attend. Your email is never shown.</p>
      {profile.communityAdmin && <p className="member-note"><CommunityAdminMark size={18} /></p>}
      <HeadshotPicker name={profile.name} preview={photo} busy={photoBusy} onChange={changePhoto} onRemove={removePhoto} />
      {photoMessage && <Alert title={photoMessage.tone === 'success' ? 'Photo saved' : 'Photo not saved'} tone={photoMessage.tone}>{photoMessage.text}</Alert>}
      <div className="member-profile-fields">
        <Field label="Job title" name="jobTitle" maxLength={160} defaultValue={profile.jobTitle} autoComplete="organization-title" />
        <Field label="Company" name="company" maxLength={160} defaultValue={profile.company} autoComplete="organization" />
      </div>
      <TextArea label="Bio" name="bio" rows={3} maxLength={600} defaultValue={profile.bio} hint="Up to 600 characters." />
      <Switch label="Show my profile publicly" checked={isPublic} onCheckedChange={setIsPublic} />
      <p className="member-note">{isPublic ? 'Anyone with the link can see your profile. Recordings and upcoming events stay members-only.' : 'Private: only you can see your profile.'}</p>
      {isPublic && <input type="hidden" name="public" value="on" />}
      {state.error && <Alert title="Profile not saved" tone="danger">{state.error}</Alert>}
      {state.notice && <Alert title="Saved" tone="success">{state.notice}</Alert>}
      <div className="member-actions"><Button type="submit" variant="primary" busy={pending}>Save profile</Button></div>
    </form>
  </div>;
}
