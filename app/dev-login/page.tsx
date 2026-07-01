'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;
function getSupabase() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}

export default function DevLoginPage() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: otpError } = await getSupabase().auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (otpError) throw otpError;
      setSent(true);
    } catch {
      setError("Couldn't send the link. Check the email and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace',
    }}>
      <div style={{
        width: 360, padding: 32, border: '1px solid #333', borderRadius: 8, background: '#111',
      }}>
        <p style={{ color: '#666', fontSize: 10, letterSpacing: '0.2em', marginBottom: 4 }}>
          DEV / INTERNAL ACCESS
        </p>
        <h1 style={{ color: '#fff', fontSize: 18, marginBottom: 24 }}>Magic link sign-in</h1>

        {sent ? (
          <p style={{ color: '#00F5D4', fontSize: 13 }}>✓ Check your inbox for {email}</p>
        ) : (
          <>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={loading}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 12,
                background: '#1a1a1a', border: '1px solid #333', borderRadius: 6,
                color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !email.trim()}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 6, border: 'none',
                background: email.trim() ? '#333' : '#1a1a1a',
                color: email.trim() ? '#fff' : '#444',
                fontSize: 12, letterSpacing: '0.1em', cursor: email.trim() ? 'pointer' : 'default',
              }}
            >
              {loading ? 'SENDING…' : 'SEND SIGN-IN LINK'}
            </button>
            {error && <p style={{ color: '#ff6b6b', fontSize: 12, marginTop: 10 }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
