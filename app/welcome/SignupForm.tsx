'use client';
import { useState, type FormEvent } from 'react';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const inputCls = 'input-dark md:col-span-1';
const selectCls = 'input-dark md:col-span-1';

export default function SignupForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      childName: String(form.get('childName') ?? ''),
      childEmail: String(form.get('childEmail') ?? '') || undefined,
      childGender: String(form.get('childGender') ?? '') || undefined,
      grade2027: String(form.get('grade2027') ?? '') || undefined,
      school: String(form.get('school') ?? '') || undefined,
      referralSource: String(form.get('referralSource') ?? '') || undefined,
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Something went wrong');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-3">🚀</p>
        <h3 className="font-space font-bold text-2xl mb-2">You&apos;re on the list.</h3>
        <p className="text-white/60 font-inter">We&apos;ll reach out to set up your child&apos;s free trial shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">

      {/* Parent */}
      <p className="md:col-span-2 font-space text-[10px] uppercase tracking-[0.16em] text-white/40 mt-2">About you (parent)</p>
      <input name="name" required placeholder="Your name" className={inputCls} />
      <input name="email" type="email" required placeholder="Your email" className={inputCls} />

      {/* Child */}
      <p className="md:col-span-2 font-space text-[10px] uppercase tracking-[0.16em] text-white/40 mt-2">About your child</p>
      <input name="childName" required placeholder="Child&apos;s first name" className={inputCls} />
      <div className="flex flex-col gap-1">
        <input name="childEmail" type="email" placeholder="Child&apos;s email (optional)" className={inputCls} />
        <span className="text-[11px] text-white/25 font-space pl-1">Many students don&apos;t have their own email yet</span>
      </div>

      <select name="childGender" required defaultValue="" className={selectCls}>
        <option value="" disabled>Child&apos;s gender</option>
        <option value="girl">Girl</option>
        <option value="boy">Boy</option>
        <option value="non-binary">Non-binary</option>
        <option value="prefer_not_to_say">Prefer not to say</option>
      </select>
      <select name="grade2027" required defaultValue="" className={selectCls}>
        <option value="" disabled>Grade starting Sept 2027</option>
        <option value="grade_7">Grade 7</option>
        <option value="grade_8">Grade 8</option>
        <option value="grade_9">Grade 9</option>
        <option value="grade_10">Grade 10</option>
      </select>

      {/* Optional extras */}
      <input name="school" placeholder="School name (optional)" className={inputCls} />
      <select name="referralSource" defaultValue="" className={selectCls}>
        <option value="" disabled>How did you hear about Astroli?</option>
        <option value="teacher">From my child&apos;s teacher</option>
        <option value="social_media">Social media</option>
        <option value="friend">A friend or other parent</option>
        <option value="search">Online search</option>
        <option value="other">Other</option>
      </select>

      {status === 'error' && (
        <p className="md:col-span-2 text-sm text-center" style={{ color: '#ff6b6b' }}>{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="md:col-span-2 font-space text-sm font-bold uppercase tracking-[0.1em] py-4 rounded-full text-white transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
        style={{ background: 'linear-gradient(120deg, #FF0080 0%, #a020f0 50%, #00F5D4 100%)' }}
      >
        {status === 'submitting' ? 'Sending…' : 'Start Free Trial →'}
      </button>
    </form>
  );
}
