// ─── Sound Effects via Web Audio API ─────────────────────────────────────────
// No external files needed — synthesized tones using OscillatorNode

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  endFrequency?: number,
  volume = 0.18,
): void {
  try {
    const ctx = getAudioContext();
    // Resume if suspended (browsers require user gesture)
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (endFrequency !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(
        endFrequency,
        ctx.currentTime + duration,
      );
    }

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration,
    );

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Silently ignore — audio not critical
  }
}

/** Short ascending beep for sending a message */
export function playSendSound(): void {
  playTone(220, 0.1, "sine", 440);
}

/** Soft ping for receiving a new message */
export function playReceiveSound(): void {
  playTone(660, 0.08, "sine", undefined, 0.12);
}

/** Ascending chime for friend added */
export function playFriendAddSound(): void {
  playTone(440, 0.12, "sine", 660, 0.15);
}

/** Descending note for friend removed */
export function playFriendRemoveSound(): void {
  playTone(440, 0.12, "sine", 220, 0.12);
}
