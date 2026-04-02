// src/scripts/interaction-audio.cyberpunk.drums.playback.js - Drum sample and procedural playback
(function attachCyberpunkDrumPlayback() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn(
      "🥁 Cyberpunk Interaction Audio core missing for drum playback",
    );
    return;
  }

  const proto = window.CyberpunkInteractionAudioClass.prototype;

  proto._playDrumHit = function _playDrumHit(sampleName, time, volume) {
    const context = this.context;
    if (!context || !this._drumGain) return;

    const buffer = this._drumBuffers?.[sampleName];
    if (buffer) {
      const source = context.createBufferSource();
      const gainNode = context.createGain();
      source.buffer = buffer;
      gainNode.gain.setValueAtTime(volume, time);
      source.connect(gainNode);
      gainNode.connect(this._drumGain);
      source.start(time);
      return;
    }

    this._playDrumHitProcedural(sampleName, time, volume);
  };

  proto._playDrumHitProcedural = function _playDrumHitProcedural(
    sampleName,
    time,
    volume,
  ) {
    const context = this.context;
    if (!context || !this._drumGain) return;

    const gainNode = context.createGain();
    gainNode.connect(this._drumGain);

    if (sampleName === "kick") {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
      gainNode.gain.setValueAtTime(volume, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(gainNode);
      osc.start(time);
      osc.stop(time + 0.16);
      return;
    }

    if (sampleName === "snare" || sampleName === "hihat") {
      const duration = sampleName === "snare" ? 0.08 : 0.04;
      const bufferSize = Math.max(1, Math.floor(context.sampleRate * duration));
      const noiseBuffer = context.createBuffer(
        1,
        bufferSize,
        context.sampleRate,
      );
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = context.createBufferSource();
      const filter = context.createBiquadFilter();
      filter.type = sampleName === "snare" ? "bandpass" : "highpass";
      filter.frequency.value = sampleName === "snare" ? 3000 : 7000;
      filter.Q.value = sampleName === "snare" ? 0.7 : 1.2;
      gainNode.gain.setValueAtTime(
        volume * (sampleName === "snare" ? 0.6 : 0.4),
        time,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        time + (sampleName === "snare" ? 0.1 : 0.05),
      );
      noise.buffer = noiseBuffer;
      noise.connect(filter);
      filter.connect(gainNode);
      noise.start(time);
      noise.stop(time + duration + 0.02);
      return;
    }

    const osc = context.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.03);
    gainNode.gain.setValueAtTime(volume * 0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gainNode);
    osc.start(time);
    osc.stop(time + 0.05);
  };
})();
