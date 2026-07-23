'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type EditStatus = 'draft' | 'live' | 'rejected';

interface FeedEditRow {
  id: string;
  edit_type: 'did_you_know' | 'inspiring_human' | 'real_world_connection';
  hook: string;
  body: string;
  bridge: string;
  media_url: string | null;
  media_credit: string | null;
  status: EditStatus;
  rejection_reason: string | null;
  safety_pass: boolean | null;
  safety_reason: string | null;
  planet_name: string | null;
  planet_question: string | null;
  pending_comments: number;
  audio_url: string | null;
  audio_status: 'generating' | 'ready' | 'failed' | null;
  music_url: string | null;
  spotify_url: string | null;
}

interface MusicTrack {
  name: string;
  url: string;
}

interface CommentRow {
  id: string;
  feed_edit_id: string;
  edit_hook: string;
  body: string;
  moderation_status: 'pending';
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  did_you_know: 'Did You Know',
  inspiring_human: 'Inspiring Human',
  real_world_connection: 'Real-World Connection',
};

const TYPE_COLORS: Record<string, string> = {
  did_you_know: 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/30',
  inspiring_human: 'bg-purple-900/60 text-purple-300 border border-purple-500/30',
  real_world_connection: 'bg-amber-900/60 text-amber-300 border border-amber-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-yellow-400',
  live: 'text-green-400',
  rejected: 'text-red-400',
};

const EDIT_TYPES = ['did_you_know', 'inspiring_human', 'real_world_connection'];

export default function FeedReviewPage() {
  const [tab, setTab] = useState<'edits' | 'comments'>('edits');
  const [statusFilter, setStatusFilter] = useState<EditStatus>('draft');
  const [edits, setEdits] = useState<FeedEditRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [spotifyUrls, setSpotifyUrls] = useState<Record<string, string>>({});

  // Generate-more form state
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [genPlanetId, setGenPlanetId] = useState('');
  const [genTypes, setGenTypes] = useState<string[]>(EDIT_TYPES);
  const [genThemes, setGenThemes] = useState('');
  const [genPilot, setGenPilot] = useState(false);
  const [genCount, setGenCount] = useState(1);
  const [genPodcast, setGenPodcast] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  // Podcast + music state (amendment 2026-07-20)
  const [uploadingAudio, setUploadingAudio] = useState<string | null>(null);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const audioFileInput = useRef<HTMLInputElement | null>(null);
  const uploadTargetId = useRef<string | null>(null);

  // Cards only ≈ 1.3¢ each; podcast (script + TTS-1-HD) ≈ 6.3¢ each.
  const genThemeCount = genPilot ? 1 : Math.max(1, genThemes.split(',').map((t) => t.trim()).filter(Boolean).length || 1);
  const genCardCount = genTypes.length * genThemeCount * (genPilot ? 1 : genCount);
  const genEstimate = (genCardCount * (genPodcast ? 0.063 : 0.013)).toFixed(2);

  const loadEdits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/feed-review?status=${statusFilter}`);
      const json = await res.json();
      setEdits(json.edits ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/feed-review/comments');
      const json = await res.json();
      setComments(json.comments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'edits') loadEdits();
    else loadComments();
  }, [tab, loadEdits, loadComments]);

  // The curated music pack — loaded once for the per-card dropdown.
  useEffect(() => {
    fetch('/api/admin/feed-review/music-tracks')
      .then((res) => (res.ok ? res.json() : { tracks: [] }))
      .then((json) => setMusicTracks(json.tracks ?? []))
      .catch(() => {});
  }, []);

  function startAudioUpload(editId: string) {
    uploadTargetId.current = editId;
    audioFileInput.current?.click();
  }

  async function handleAudioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const editId = uploadTargetId.current;
    e.target.value = '';
    if (!file || !editId) return;
    setUploadingAudio(editId);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/admin/feed-review/${editId}/audio`, { method: 'POST', body: form });
      const json = await res.json();
      if (res.ok) {
        setEdits((prev) => prev.map((ed) => ed.id === editId ? { ...ed, audio_url: json.audio_url, audio_status: 'ready' } : ed));
      } else {
        alert(`Audio upload failed: ${json.error ?? res.status}`);
      }
    } finally {
      setUploadingAudio(null);
    }
  }

  async function handleRemoveAudio(editId: string) {
    if (!confirm('Remove this card’s podcast audio?')) return;
    const res = await fetch(`/api/admin/feed-review/${editId}/audio`, { method: 'DELETE' });
    if (res.ok) {
      setEdits((prev) => prev.map((ed) => ed.id === editId ? { ...ed, audio_url: null, audio_status: null } : ed));
    } else {
      alert('Failed to remove audio.');
    }
  }

  async function handleMusicChange(editId: string, musicUrl: string | null) {
    const res = await fetch(`/api/admin/feed-review/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ music_url: musicUrl }),
    });
    if (res.ok) {
      setEdits((prev) => prev.map((ed) => ed.id === editId ? { ...ed, music_url: musicUrl } : ed));
    } else {
      alert('Failed to update music.');
    }
  }

  async function patchSpotifyUrl(editId: string, spotify_url: string | null) {
    const res = await fetch(`/api/admin/feed-review/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotify_url }),
    });
    if (res.ok) {
      setEdits((prev) => prev.map((ed) => ed.id === editId ? { ...ed, spotify_url } : ed));
    } else {
      alert('Failed to save Spotify URL.');
    }
  }

  function handleSpotifyUrlSave(editId: string) {
    const raw = spotifyUrls[editId]?.trim() ?? null;
    patchSpotifyUrl(editId, raw === '' ? null : raw ?? null);
  }

  function handleSpotifyUrlRemove(editId: string) {
    setSpotifyUrls((r) => ({ ...r, [editId]: '' }));
    patchSpotifyUrl(editId, null);
  }

  async function handleUpdateStatus(id: string, action: 'approve' | 'reject') {
    const reason = rejectionReasons[id] ?? '';
    if (action === 'reject' && !reason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }
    const res = await fetch(`/api/admin/feed-review/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rejection_reason: reason || undefined }),
    });
    if (res.ok) {
      setEdits((prev) => prev.filter((e) => e.id !== id));
      setExpanded(null);
    } else {
      alert('Action failed. Check console.');
    }
  }

  async function handleCommentAction(id: string, action: 'approve' | 'reject') {
    const res = await fetch(`/api/admin/feed-review/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id));
    else alert('Action failed.');
  }

  async function handleGenerate() {
    if (!genPlanetId.trim()) { alert('Planet ID is required'); return; }
    const types = genTypes;
    if (types.length === 0) { alert('Select at least one edit type'); return; }
    setGenLoading(true);
    setGenResult(null);
    try {
      const res = await fetch('/api/admin/feed-review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planet_id: genPlanetId.trim(),
          edit_types: types,
          interest_themes: genThemes.split(',').map((t) => t.trim()).filter(Boolean),
          count: genCount,
          pilot: genPilot,
          include_podcast: genPodcast,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setGenResult(`Generation triggered. Estimated cost: $${json.estimated_cost_usd ?? '—'}. New drafts will appear in the queue shortly.`);
        setTimeout(() => { setShowGenerateForm(false); setGenResult(null); loadEdits(); }, 3500);
      } else {
        setGenResult(`Error: ${json.error ?? 'Unknown error'}`);
      }
    } finally {
      setGenLoading(false);
    }
  }

  const pendingCommentCount = comments.length;

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Hidden file input shared by every card's Upload/Replace audio button */}
      <input
        ref={audioFileInput}
        type="file"
        accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
        onChange={handleAudioFile}
        className="hidden"
      />
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-bold tracking-tight">Feed Review</h1>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => setTab('edits')}
            className={`px-3 py-1 rounded text-xs font-medium uppercase tracking-widest transition-colors ${tab === 'edits' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
          >Edits</button>
          <button
            onClick={() => setTab('comments')}
            className={`px-3 py-1 rounded text-xs font-medium uppercase tracking-widest transition-colors ${tab === 'comments' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Comments
            {pendingCommentCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCommentCount}</span>
            )}
          </button>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowGenerateForm((v) => !v)}
          className="px-4 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-xs font-medium uppercase tracking-widest"
        >Generate More</button>
      </div>

      {/* Generate More Form */}
      {showGenerateForm && (
        <div className="mb-6 p-5 rounded-xl border border-white/10 bg-white/5 space-y-4">
          <h2 className="text-sm font-semibold tracking-wide">Generate Edits</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] text-white/50 uppercase tracking-widest">Planet ID</span>
              <input
                className="mt-1 w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm font-mono text-white placeholder-white/20 outline-none focus:border-purple-500"
                placeholder="e.g. uuid from planets table"
                value={genPlanetId}
                onChange={(e) => setGenPlanetId(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-white/50 uppercase tracking-widest">Interest Themes (comma-separated, optional)</span>
              <input
                className="mt-1 w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 outline-none focus:border-purple-500"
                placeholder="e.g. basketball, anime"
                value={genThemes}
                onChange={(e) => setGenThemes(e.target.value)}
              />
            </label>
          </div>
          <div>
            <span className="text-[11px] text-white/50 uppercase tracking-widest block mb-2">Edit Types</span>
            <div className="flex gap-3">
              {EDIT_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1.5 cursor-pointer text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={genTypes.includes(t)}
                    onChange={(e) => setGenTypes((prev) => e.target.checked ? [...prev, t] : prev.filter((x) => x !== t))}
                    className="accent-purple-500"
                  />
                  {TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs text-white/70">
              <span className="uppercase tracking-widest text-white/50 text-[11px]">Cards per type</span>
              <input
                type="number" min={1} max={10}
                value={genCount}
                disabled={genPilot}
                onChange={(e) => setGenCount(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
              <input type="checkbox" checked={genPilot} onChange={(e) => setGenPilot(e.target.checked)} className="accent-purple-500" />
              Pilot mode (1 edit per type — for prompt validation)
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input type="checkbox" checked={genPodcast} onChange={(e) => setGenPodcast(e.target.checked)} className="accent-purple-500" />
            Include podcast (auto TTS — OpenAI, ~5¢ extra per card)
          </label>
          <p className="text-[11px] text-white/50">
            Estimated cost: <span className="text-white/90 font-medium">${genEstimate}</span> for {genCardCount} card{genCardCount === 1 ? '' : 's'}{genPodcast ? ' with podcast episodes' : ' (cards only — no audio)'}
          </p>
          {genResult && <p className="text-sm text-green-400">{genResult}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={genLoading}
              className="px-5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-xs font-medium uppercase tracking-widest"
            >{genLoading ? 'Triggering…' : 'Trigger Generation'}</button>
            <button onClick={() => setShowGenerateForm(false)} className="text-xs text-white/40 hover:text-white/70">Cancel</button>
          </div>
        </div>
      )}

      {/* Edits tab */}
      {tab === 'edits' && (
        <>
          {/* Status filter */}
          <div className="flex gap-2 mb-5">
            {(['draft', 'live', 'rejected'] as EditStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-widest font-medium border transition-colors ${statusFilter === s ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-white/30 hover:text-white/60'}`}
              >{s}</button>
            ))}
          </div>

          {loading ? (
            <p className="text-white/40 text-sm">Loading…</p>
          ) : edits.length === 0 ? (
            <p className="text-white/40 text-sm">No {statusFilter} edits.</p>
          ) : (
            <div className="space-y-3">
              {edits.map((edit) => (
                <div key={edit.id} className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
                  <button
                    className="w-full text-left px-5 py-4 flex items-center gap-3"
                    onClick={() => setExpanded((e) => e === edit.id ? null : edit.id)}
                  >
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[edit.edit_type]}`}>
                      {TYPE_LABELS[edit.edit_type]}
                    </span>
                    <span className="flex-1 text-sm text-white/90 font-medium truncate">{edit.hook}</span>
                    {edit.pending_comments > 0 && (
                      <span className="text-[10px] text-amber-400 bg-amber-900/40 px-2 py-0.5 rounded-full border border-amber-500/30">
                        {edit.pending_comments} pending comment{edit.pending_comments > 1 ? 's' : ''}
                      </span>
                    )}
                    {!edit.safety_pass && edit.safety_pass !== null && (
                      <span className="text-[10px] text-red-400 bg-red-900/40 px-2 py-0.5 rounded-full border border-red-500/30">Safety ✗</span>
                    )}
                    <span className={`text-[11px] font-medium ${STATUS_COLORS[edit.status]}`}>{edit.status}</span>
                    <span className="text-white/30 text-xs">{expanded === edit.id ? '▲' : '▼'}</span>
                  </button>

                  {expanded === edit.id && (
                    <div className="px-5 pb-5 border-t border-white/8 pt-4 space-y-4">
                      {/* Preview toggle */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPreviewing((p) => p === edit.id ? null : edit.id)}
                          className={`px-3 py-1 rounded text-[11px] font-medium uppercase tracking-widest transition-colors border ${previewing === edit.id ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}
                        >
                          {previewing === edit.id ? 'Hide Preview' : '📱 Preview Card'}
                        </button>
                      </div>

                      {/* Phone-frame card preview */}
                      {previewing === edit.id && (
                        <div className="flex justify-center py-2">
                          <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-white/20 shadow-2xl"
                            style={{ width: 280, height: 580 }}>
                            {/* Background media */}
                            {edit.media_url ? (
                              edit.media_url.endsWith('.mp4') ? (
                                <video
                                  src={edit.media_url}
                                  autoPlay loop muted playsInline
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              ) : (
                                // Ken Burns: still photos get the same slow zoom+drift
                                // the mobile player applies, so preview == reality.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={edit.media_url} alt="" className="absolute inset-0 w-full h-full object-cover feed-kenburns" />
                              )
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900" />
                            )}
                            {/* Dark gradient wash */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
                            {/* Type badge */}
                            <div className="absolute top-4 left-4">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[edit.edit_type]}`}>
                                {TYPE_LABELS[edit.edit_type]}
                              </span>
                            </div>
                            {/* Right action column */}
                            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
                              {[['♥','Like'],['💬','Comment'],['→','More']].map(([icon, label]) => (
                                <div key={label} className="flex flex-col items-center">
                                  <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-base">{icon}</div>
                                  <span className="text-[8px] text-white/70 mt-0.5">{label}</span>
                                </div>
                              ))}
                            </div>
                            {/* Hook text overlay */}
                            <div className="absolute bottom-0 left-0 right-12 px-4 pb-5">
                              <p className="text-white text-xs font-semibold leading-snug drop-shadow-lg">
                                {edit.hook}
                                <span className="text-white/50 font-normal"> …more</span>
                              </p>
                              {edit.media_credit && (
                                <p className="text-white/30 text-[8px] mt-2">{edit.media_credit}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {edit.planet_name && (
                        <p className="text-[11px] text-white/40 uppercase tracking-widest">
                          Planet: {edit.planet_name}
                          {edit.planet_question && ` — ${edit.planet_question}`}
                        </p>
                      )}
                      <div>
                        <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">Hook</p>
                        <p className="text-sm text-white/90">{edit.hook}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">Body</p>
                        <p className="text-sm text-white/75 leading-relaxed">{edit.body}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">Bridge</p>
                        <p className="text-sm text-white/60 italic">{edit.bridge}</p>
                      </div>
                      {edit.media_url && (
                        <div>
                          <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">Media</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={edit.media_url} alt="edit media" className="rounded-lg max-h-40 object-cover" />
                          {edit.media_credit && <p className="text-[10px] text-white/30 mt-1">{edit.media_credit}</p>}
                        </div>
                      )}
                      {/* Podcast audio (amendment 2026-07-20): play what students
                          will hear, upload a NotebookLM export, or remove it. */}
                      <div>
                        <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">
                          Podcast
                          {edit.audio_status === 'failed' && <span className="ml-2 text-red-400 normal-case">auto-generation failed</span>}
                          {!edit.audio_url && edit.audio_status !== 'failed' && <span className="ml-2 text-white/30 normal-case">no audio — card works without it</span>}
                        </p>
                        {edit.audio_url && (
                          <audio controls src={edit.audio_url} className="w-full max-w-md h-9 mb-2" />
                        )}
                        <div className="flex gap-3">
                          <button
                            onClick={() => startAudioUpload(edit.id)}
                            disabled={uploadingAudio === edit.id}
                            className="px-4 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded text-[11px] font-medium uppercase tracking-widest"
                          >
                            {uploadingAudio === edit.id ? 'Uploading…' : edit.audio_url ? 'Replace audio' : 'Upload audio'}
                          </button>
                          {edit.audio_url && (
                            <button
                              onClick={() => handleRemoveAudio(edit.id)}
                              className="px-4 py-1 rounded text-[11px] font-medium uppercase tracking-widest text-red-300 border border-red-500/30 hover:bg-red-900/30"
                            >Remove</button>
                          )}
                        </div>
                      </div>

                      {/* Card music: pick a pack track or leave the card silent. */}
                      <div>
                        <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">Music</p>
                        <div className="flex items-center gap-3">
                          <select
                            value={edit.music_url ?? ''}
                            onChange={(e) => handleMusicChange(edit.id, e.target.value || null)}
                            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white outline-none focus:border-purple-500 max-w-xs"
                          >
                            <option value="">No music</option>
                            {musicTracks.map((t) => (
                              <option key={t.url} value={t.url}>{t.name}</option>
                            ))}
                            {edit.music_url && !musicTracks.some((t) => t.url === edit.music_url) && (
                              <option value={edit.music_url}>(current track)</option>
                            )}
                          </select>
                          {edit.music_url && (
                            <audio controls src={edit.music_url} className="h-9 max-w-[220px]" />
                          )}
                        </div>
                      </div>

                      {/* Spotify URL (FR-034): paste the episode link to show the Listen button on this card. */}
                      <div>
                        <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">
                          Spotify episode
                          {!edit.spotify_url && <span className="ml-2 text-white/30 normal-case">no link — Listen button hidden</span>}
                        </p>
                        <div className="flex gap-2 items-center">
                          <input
                            className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 outline-none focus:border-green-500 font-mono"
                            placeholder="https://open.spotify.com/episode/…"
                            value={spotifyUrls[edit.id] ?? edit.spotify_url ?? ''}
                            onChange={(e) => setSpotifyUrls((r) => ({ ...r, [edit.id]: e.target.value }))}
                          />
                          <button
                            onClick={() => handleSpotifyUrlSave(edit.id)}
                            className="px-4 py-1.5 bg-green-800 hover:bg-green-700 rounded text-[11px] font-medium uppercase tracking-widest"
                          >Save</button>
                          {edit.spotify_url && (
                            <button
                              onClick={() => handleSpotifyUrlRemove(edit.id)}
                              className="px-3 py-1.5 rounded text-[11px] font-medium uppercase tracking-widest text-red-300 border border-red-500/30 hover:bg-red-900/30"
                            >Remove</button>
                          )}
                        </div>
                      </div>

                      {edit.safety_reason && (
                        <p className="text-[11px] text-red-300 bg-red-900/20 px-3 py-2 rounded border border-red-500/20">
                          Safety note: {edit.safety_reason}
                        </p>
                      )}
                      {edit.rejection_reason && (
                        <p className="text-[11px] text-red-300 bg-red-900/20 px-3 py-2 rounded border border-red-500/20">
                          Rejection reason: {edit.rejection_reason}
                        </p>
                      )}

                      {edit.status === 'draft' && (
                        <div className="flex flex-col gap-2 pt-2">
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleUpdateStatus(edit.id, 'approve')}
                              className="px-5 py-1.5 bg-green-700 hover:bg-green-600 rounded text-xs font-medium uppercase tracking-widest"
                            >Approve → Live</button>
                            <button
                              onClick={() => handleUpdateStatus(edit.id, 'reject')}
                              className="px-5 py-1.5 bg-red-900/60 hover:bg-red-800 rounded text-xs font-medium uppercase tracking-widest border border-red-500/30"
                            >Reject</button>
                          </div>
                          <input
                            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 outline-none focus:border-red-500"
                            placeholder="Rejection reason (required to reject)"
                            value={rejectionReasons[edit.id] ?? ''}
                            onChange={(e) => setRejectionReasons((r) => ({ ...r, [edit.id]: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Comments tab */}
      {tab === 'comments' && (
        <>
          {loading ? (
            <p className="text-white/40 text-sm">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-white/40 text-sm">No pending comments.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/8 bg-white/3 px-5 py-4">
                  <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1 truncate">On: "{c.edit_hook}"</p>
                  <p className="text-sm text-white/90 mb-3">"{c.body}"</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCommentAction(c.id, 'approve')}
                      className="px-4 py-1 bg-green-700 hover:bg-green-600 rounded text-xs font-medium uppercase tracking-widest"
                    >Approve</button>
                    <button
                      onClick={() => handleCommentAction(c.id, 'reject')}
                      className="px-4 py-1 bg-red-900/60 hover:bg-red-800 rounded text-xs font-medium uppercase tracking-widest border border-red-500/30"
                    >Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
