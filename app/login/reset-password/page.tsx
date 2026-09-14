import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PublicShell from '@/components/public/PublicShell';
import ResetPassword from '@/components/members/ResetPassword';
import { getMember } from '@/lib/auth/member';
import '@/components/members/members.css';
export const metadata: Metadata = { title: 'Reset member password | Physical I/O', robots: { index: false, follow: false } };
export default async function ResetPasswordPage() {
  if (!await getMember()) redirect('/login?status=invalid_link');
  return <PublicShell><ResetPassword /></PublicShell>;
}
