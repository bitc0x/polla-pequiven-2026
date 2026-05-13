'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

/**
 * Background music toggle. Off by default. Click to play/pause.
 * Audio source: /mundial-song.mp3 in public/ (the dipa file Victor already
 * had pre-trimmed of leading silence and trailing fade-out).
 *
 * Implementation notes (lifted from the dipa-xyz pattern):
 * - We seek past the leading silence (~0.35s) on first play.
 * - Before the fade-out region (~76s), we jump back to LOOP_START to make
 *   the loop feel continuous instead of having ~1s of dead air every loop.
 * - We do NOT autoplay (browsers block it without user gesture).
 * - We do NOT persist playing state (off on every reload).
 * - Volume: 0.45.
 */
const LOOP_START_S = 0.35;
const LOOP_END_S = 76.0;
const VOLUME = 0.45;

export default function MusicToggle() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    function handleTimeUpdate() {
      if (audio && audio.currentTime >= LOOP_END_S) {
        audio.currentTime = LOOP_START_S;
      }
    }
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      if (!audio.paused) audio.pause();
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (audio.currentTime < LOOP_START_S || audio.currentTime >= LOOP_END_S) {
        audio.currentTime = LOOP_START_S;
      }
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.then(() => setPlaying(true)).catch(() => setPlaying(false));
      } else {
        setPlaying(true);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <>
      <button
        className={`icon-btn${playing ? ' is-active' : ''}`}
        type="button"
        aria-label={playing ? 'Pausar música' : 'Reproducir música'}
        aria-pressed={playing}
        onClick={toggle}
        title={playing ? 'Pausar música' : 'Reproducir música'}
      >
        <Icon name={playing ? 'music' : 'music-off'} />
      </button>
      <audio
        ref={audioRef}
        src="/mundial-song.mp3"
        loop
        preload="none"
        onPlay={() => { if (audioRef.current) audioRef.current.volume = VOLUME; }}
        style={{ display: 'none' }}
      />
    </>
  );
}
