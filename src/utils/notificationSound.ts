let audioContext: AudioContext | null = null;

export const playNotificationTone = () => {
  if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) {
    return;
  }

  try {
    if (!audioContext) {
      const ContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new ContextClass();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 900;
    gain.gain.value = 0.2;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (error) {
    console.error('Notification tone failed to play', error);
  }
};
