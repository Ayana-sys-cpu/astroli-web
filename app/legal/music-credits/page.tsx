import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Music Credits — Astroli',
  description:
    'Attribution for the openly licensed (CC-BY) music tracks used in the Astroli Feed app.',
};

// Source of truth: specs/student/mobile-app/learning-feed/music-pack.md —
// every track in the feed-music pack is CC-BY, so this public page is the
// attribution the license requires. Keep it in sync with the pack.
const TRACKS: { title: string; artist: string; license: string; source: string }[] = [
  { title: '#18 (Gullinburste-2018)', artist: 'Ivan Tregub (BER)', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1550301' },
  { title: 'Battle of Xieses', artist: 'Razvan Veina', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1275147' },
  { title: 'Battle', artist: 'Ivan Tregub (BER)', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1465406' },
  { title: 'Drakkar', artist: 'Ivan Tregub (BER)', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1465379' },
  { title: 'Gaining Steam', artist: 'Jesse Keller', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1540837' },
  { title: 'Mystical Horror Trailer', artist: 'Soundrider/Dope', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1670476' },
  { title: 'Symphony No. 7 in G minor, Op. 32 (Movement 2, Presto)', artist: 'Daniel Bautista', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/2126273' },
  { title: '3. Prelude for Solo Piano : Piano Pieces / Polish Moods', artist: 'Michał Jałochowski', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/2240175' },
  { title: 'A new world', artist: 'zero-project', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/2185505' },
  { title: 'Dream keeper (dreamy version)', artist: 'zero-project', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/2193530' },
  { title: 'Echoes of Fall', artist: 'Razvan Veina', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1275144' },
  { title: 'Inhale Part 2', artist: 'Peter Rudenko', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1264971' },
  { title: 'Intro', artist: 'zero-project', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/2185462' },
  { title: 'Monday', artist: 'Viktor Séthy', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1544399' },
  { title: 'nuage', artist: 'thomas saliba', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1241611' },
  { title: 'Peace Within', artist: 'Peter Rudenko', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1265014' },
  { title: 'Sublime Medley', artist: 'Peter Rudenko', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1264997' },
  { title: 'Airplane Mode (Instrumental Version)', artist: 'Josh Woodward', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1057412' },
  { title: 'Cheapskate Romantic (Instrumental Version)', artist: 'Josh Woodward (Instrumental Versions)', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/761858' },
  { title: 'Cherubs (Instrumental Version)', artist: 'Josh Woodward (Instrumental Versions)', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/764956' },
  { title: 'Electric Chronic', artist: 'Social Bot 73XT', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/690198' },
  { title: 'Knock (Instrumental Version)', artist: 'Josh Woodward (Instrumental Versions)', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1341649' },
  { title: 'Morning Blue (Instrumental)', artist: 'Josh Woodward (Instrumental Versions)', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/625680' },
  { title: 'Red Moonlight ( Extended Mix )', artist: 'Pokki DJ', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1237336' },
  { title: 'Swansong (Instrumental Version)', artist: 'Josh Woodward (Instrumental Versions)', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/765609' },
  { title: 'Talk About Your Feelings (Instrumental Version)', artist: 'Josh Woodward (Instrumental Versions)', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/761867' },
  { title: 'Violet Wants It Her Way (Instrumental Version)', artist: 'Josh Woodward (Instrumental Versions)', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/761865' },
  { title: 'Ambient Voyager', artist: 'Zeropage', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/20231' },
  { title: 'Appassionata', artist: 'zero-project', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1640783' },
  { title: 'BEAM UP', artist: 'noaccordion', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1313233' },
  { title: 'Epic Hip-Hop', artist: 'Soundrider/Dope', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1670662' },
  { title: 'Epic Trailer', artist: 'Soundrider/Dope', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1670474' },
  { title: 'Evolving Thunder Ambient Mix', artist: 'DJ Frankie Holmes', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1343012' },
  { title: 'Half a Life passing by', artist: 'FlauschGAU', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1177813' },
  { title: 'Muerto', artist: 'Voytek Pavlik', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/395029' },
  { title: 'Nature Music', artist: 'Alexander Blu', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1476527' },
  { title: 'Silent dreams', artist: 'zero-project', license: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://www.jamendo.com/track/1640796' },
];

export default function MusicCreditsPage() {
  return (
    <main className="bg-grid min-h-screen px-6 py-12">
      <article className="mx-auto w-full max-w-2xl">
        <h1 className="font-space text-3xl font-bold text-white mb-1">Music Credits</h1>
        <p className="font-inter text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
          The background music in the Astroli Feed app comes from independent
          artists who share their work under the{' '}
          <a
            href="https://creativecommons.org/licenses/by/3.0/"
            className="underline underline-offset-2"
            style={{ color: '#00F5D4' }}
          >
            Creative Commons Attribution (CC-BY) license
          </a>
          . Thank you to every one of them. Tracks were discovered via Openverse
          and are hosted on Jamendo.
        </p>

        <ul className="space-y-3">
          {TRACKS.map((t) => (
            <li
              key={t.source}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="font-space text-sm font-bold text-white">{t.title}</p>
              <p className="font-inter text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                by {t.artist} ·{' '}
                <a href={t.license} className="underline underline-offset-2" style={{ color: '#00F5D4' }}>
                  CC-BY 3.0
                </a>
                {' '}·{' '}
                <a href={t.source} className="underline underline-offset-2" style={{ color: '#00F5D4' }}>
                  Listen on Jamendo
                </a>
              </p>
            </li>
          ))}
        </ul>

        <p className="font-inter text-xs mt-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Some tracks may be trimmed or looped for use as ambient card music. No
          changes are made to the underlying compositions.
        </p>
      </article>
    </main>
  );
}
