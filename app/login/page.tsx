import type { Metadata } from 'next';
import LoginForm from '@/components/members/LoginForm';
import { memberAuthConfigured } from '@/lib/auth/member';
import '@/components/members/members.css';
export const metadata: Metadata = { title: 'Member login | Physical I/O', robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const codePrompt = status === 'email_confirmed' ? 'confirmed' : status === 'request_code' ? 'request' : undefined;
  return <LoginForm configured={memberAuthConfigured()} codePrompt={codePrompt} invalidLink={status === 'invalid_link'} joined={status === 'joined'} />;
}
