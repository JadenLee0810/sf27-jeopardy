// ====================================================
//  Sound for the big screen - all synthesized with Web Audio (no files).
//  Arcade / chiptune style: pulse-wave voices, NES-style digital noise,
//  bit-crushed buzzers and sweeps.
//
//  Sfx.music("scene" | "board" | null)   background loop (two original chiptune tracks)
//  Sfx.duck(true/false)                  turn the music down while a clue is up
//  Sfx.jetStart() / jetFly(k) / jetStop()  digital jet engine for the airplane
//  Sfx.click / jump / whoosh / pop / land / boardFill       scene + transition
//  Sfx.select / clueOpen / tickStart / tickStop / reveal    board + clue popup
//  Sfx.correct / wrong / dailyDouble / reset
//  Sfx.setMuted(bool) / isMuted()
//
//  Browsers only allow sound after a click, so the engine wakes up on the first
//  button press (the play button).
// ====================================================
const Sfx = (function () {
  "use strict";
  const MUSIC_VOL = 0.3, DUCK_VOL = 0.08;
  let ac = null, master, musicBus, sfxBus, lfsr, waves = {};
  let muted = false, ducked = false, offline = false;
  try { muted = localStorage.getItem("jsf.muted") === "1"; } catch (_) {}

  // ---------- engine ----------
  // NES-style noise: a shift register clocked at 16 kHz. "short" mode repeats every 93 steps,
  // which gives the metallic, pitched noise; "long" is the hissy one.
  function lfsrBuffer(short) {
    const sr = ac.sampleRate, len = Math.floor(sr * 2), buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const hold = Math.max(1, Math.round(sr / 16000));
    let reg = 1, out = 1;
    for (let i = 0; i < len; i++) {
      if (i % hold === 0) {
        const bit = (reg ^ (reg >> (short ? 6 : 1))) & 1;
        reg = (reg >> 1) | (bit << 14);
        out = reg & 1 ? 1 : -1;
      }
      d[i] = out;
    }
    return buf;
  }
  function build() {
    waves = {};
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.0001; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 1.2; sfxBus.connect(master);
    lfsr = { long: lfsrBuffer(false), short: lfsrBuffer(true) };
  }
  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      build();
    }
    if (!offline && ac.state === "suspended" && ac.resume) ac.resume();
    return ac;
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // pulse wave with a given duty cycle (12.5 / 25 / 50 %) = the classic console sound
  function pulseWave(kind) {
    if (!waves[kind]) {
      const duty = kind === "pulse12" ? 0.125 : kind === "pulse25" ? 0.25 : 0.5;
      const re = new Float32Array(64), im = new Float32Array(64);
      for (let n = 1; n < 64; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      waves[kind] = ac.createPeriodicWave(re, im);
    }
    return waves[kind];
  }
  // bit crusher: snaps the signal to a few levels -> gritty digital buzz
  function crusher(levels) {
    const ws = ac.createWaveShaper(), n = 4096, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / (n - 1) - 1; c[i] = Math.round(x * levels) / levels; }
    ws.curve = c; ws.oversample = "none";
    return ws;
  }

  // one enveloped note. type: "pulse12" | "pulse25" | "pulse50" | "triangle" | "sawtooth" | "sine"
  function tone(o) {
    const t = o.t, dur = o.dur, vol = o.vol == null ? 0.15 : o.vol;
    const att = Math.min(o.attack == null ? 0.004 : o.attack, dur * 0.5);
    const osc = ac.createOscillator(), g = ac.createGain();
    const type = o.type || "pulse25";
    if (type.indexOf("pulse") === 0) osc.setPeriodicWave(pulseWave(type)); else osc.type = type;
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    if (o.vib) {                                    // [rate Hz, depth cents]
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
      lfo.connect(lg); lg.connect(osc.detune);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.dest || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  // digital noise burst (kind: "short" = metallic, "long" = hissy; rate = pitch)
  function noise(o) {
    const t = o.t, dur = o.dur, vol = o.vol == null ? 0.15 : o.vol;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = lfsr[o.kind || "long"]; src.loop = true;
    src.playbackRate.setValueAtTime(o.rate || 1, t);
    if (o.rate2) src.playbackRate.exponentialRampToValueAtTime(o.rate2, t + dur);
    let node = src;
    if (o.type) {
      const f = ac.createBiquadFilter();
      f.type = o.type; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.f || 1000, t);
      if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
      node.connect(f); node = f;
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.006, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g); g.connect(o.dest || sfxBus);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  const go = (fn) => () => { if (!ctx()) return; fn(ac.currentTime); };
  // play a run of notes: arp(t, [midi...], spacing, noteOpts)
  const arp = (t, notes, gap, o) => notes.forEach((m, i) => tone(Object.assign({ f: hz(m), t: t + i * gap }, o)));

  // ====================================================
  //  JET ENGINE (the airplane) - digital: stepped noise roar + bit-crushed rumble + whine
  // ====================================================
  let jet = null;
  function jetStart() {
    if (!ctx() || jet) return;
    const t = ac.currentTime;
    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.2, t + 1.2);            // spool up
    const crush = crusher(11);
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    out.connect(crush);
    if (pan) { crush.connect(pan); pan.connect(sfxBus); } else crush.connect(sfxBus);

    const n = ac.createBufferSource(); n.buffer = lfsr.long; n.loop = true;
    n.playbackRate.setValueAtTime(0.5, t); n.playbackRate.exponentialRampToValueAtTime(1.6, t + 1.5);
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(260, t); bp.frequency.exponentialRampToValueAtTime(1400, t + 1.5);
    const roar = ac.createGain(); roar.gain.value = 0.85;
    n.connect(bp); bp.connect(roar); roar.connect(out);

    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260;
    const rg = ac.createGain(); rg.gain.value = 0.55;
    const r1 = ac.createOscillator(), r2 = ac.createOscillator();
    r1.setPeriodicWave(pulseWave("pulse50")); r2.setPeriodicWave(pulseWave("pulse25"));
    r1.frequency.setValueAtTime(34, t); r1.frequency.linearRampToValueAtTime(60, t + 1.6);
    r2.frequency.setValueAtTime(37, t); r2.frequency.linearRampToValueAtTime(64, t + 1.6);
    r1.connect(lp); r2.connect(lp); lp.connect(rg); rg.connect(out);

    const whine = ac.createOscillator(); whine.setPeriodicWave(pulseWave("pulse25"));
    whine.frequency.setValueAtTime(480, t); whine.frequency.exponentialRampToValueAtTime(2300, t + 1.7);
    const wf = ac.createBiquadFilter(); wf.type = "bandpass"; wf.Q.value = 5; wf.frequency.value = 2000;
    const wg = ac.createGain(); wg.gain.value = 0.07;
    whine.connect(wf); wf.connect(wg); wg.connect(out);

    const lfo = ac.createOscillator(); lfo.type = "square"; lfo.frequency.value = 13;   // stepped flutter
    const lg = ac.createGain(); lg.gain.value = 0.18;
    lfo.connect(lg); lg.connect(roar.gain);

    [n, r1, r2, whine, lfo].forEach((x) => x.start(t));
    jet = { out, pan, whine, bp, srcs: [n, r1, r2, whine, lfo] };
  }
  // k: 0 -> 1 across the flight; the plane pans left and thins out as it flies away
  function jetFly(k) {
    if (!jet || !ac) return;
    const t = ac.currentTime;
    if (jet.pan) jet.pan.pan.setTargetAtTime(-0.85 * k, t, 0.12);
    jet.whine.frequency.setTargetAtTime(2300 - 650 * k, t, 0.15);
    jet.bp.frequency.setTargetAtTime(1400 - 550 * k, t, 0.2);
    jet.out.gain.setTargetAtTime(0.2 - 0.07 * k, t, 0.2);
  }
  function jetStop() {
    if (!jet || !ac) return;
    const t = ac.currentTime, j = jet;
    jet = null;
    j.out.gain.cancelScheduledValues(t);
    j.out.gain.setTargetAtTime(0.0001, t, 0.18);
    j.srcs.forEach((x) => { try { x.stop(t + 1.0); } catch (_) {} });
  }

  // ====================================================
  //  SOUND EFFECTS
  // ====================================================
  const click = go((t) => tone({ f: 1500, type: "pulse50", t, dur: 0.035, vol: 0.12 }));

  // Mario-style jump
  const jump = go((t) => {
    tone({ f: 200, f2: 760, type: "pulse25", t, dur: 0.17, vol: 0.15 });
    tone({ f: 400, f2: 1520, type: "pulse12", t, dur: 0.17, vol: 0.06 });
  });

  // digital warp as the camera zooms into the hat
  const whoosh = go((t) => {
    const crush = crusher(14); crush.connect(sfxBus);
    tone({ f: 120, f2: 2600, type: "pulse25", t, dur: 1.4, vol: 0.2, attack: 0.5, vib: [24, 60], dest: crush });
    noise({ kind: "short", rate: 1, rate2: 3, t, dur: 1.4, vol: 0.4, type: "bandpass", f: 300, f2: 4200, q: 1.2, dest: crush });
  });

  const pop = go((t) => {                          // button -> plane
    tone({ f: 700, f2: 150, type: "pulse50", t, dur: 0.11, vol: 0.14 });
    noise({ kind: "long", rate: 5, t, dur: 0.05, vol: 0.09 });
  });
  const land = go((t) => {                         // plane touches down
    tone({ f: hz(79), type: "pulse50", t, dur: 0.12, vol: 0.13 });
    tone({ f: hz(84), type: "pulse50", t: t + 0.12, dur: 0.4, vol: 0.13, vib: [6, 20] });
    arp(t + 0.3, [91, 96], 0.07, { type: "pulse25", dur: 0.18, vol: 0.06 });
  });

  // the board filling in: a quick rising run, then a chord
  const boardFill = go((t) => {
    arp(t, [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 88], 0.045, { type: "pulse25", dur: 0.07, vol: 0.12 });
    arp(t + 0.62, [72, 76, 79, 84], 0, { type: "pulse50", dur: 0.55, vol: 0.08 });
    tone({ f: hz(36), type: "triangle", t: t + 0.62, dur: 0.5, vol: 0.22 });
  });

  // a tile is picked
  const select = go((t) => {
    arp(t, [72, 76, 79, 84], 0.04, { type: "pulse25", dur: 0.06, vol: 0.13 });
    noise({ kind: "short", rate: 4, t, dur: 0.02, vol: 0.06 });
  });

  // the clue zooms up to fill the screen: sweep, then a "da-DUM" hit
  const clueOpen = go((t) => {
    tone({ f: 140, f2: 1800, type: "pulse25", t, dur: 0.26, vol: 0.12, attack: 0.01 });
    noise({ kind: "short", rate: 1, rate2: 4, t, dur: 0.26, vol: 0.1, type: "highpass", f: 1500 });
    arp(t + 0.25, [48, 55, 60, 64], 0, { type: "pulse50", dur: 0.4, vol: 0.075 });
    tone({ f: 110, f2: 40, type: "triangle", t: t + 0.25, dur: 0.2, vol: 0.38 });
    arp(t + 0.3, [84, 88, 91, 96], 0.05, { type: "pulse12", dur: 0.08, vol: 0.06 });
  });

  // digital clock ticking while a clue is open
  let tickTimer = null, tickFlip = false;
  function tickStart() {
    if (!ctx() || tickTimer) return;
    const beat = () => {
      const t = ac.currentTime;
      tone({ f: tickFlip ? 1700 : 1250, type: "pulse12", t, dur: 0.03, vol: 0.2 });
      noise({ kind: "short", rate: 6, t, dur: 0.015, vol: 0.05 });
      tickFlip = !tickFlip;
    };
    beat(); tickTimer = setInterval(beat, 500);
  }
  function tickStop() { clearInterval(tickTimer); tickTimer = null; }

  // the answer is revealed: ascending run + held note, with an echo
  const reveal = go((t) => {
    [0, 0.13].forEach((d, i) => {
      const v = i ? 0.4 : 1;
      arp(t + d, [67, 72, 76, 79], 0.06, { type: "pulse25", dur: 0.07, vol: 0.13 * v });
      tone({ f: hz(84), type: "pulse25", t: t + d + 0.26, dur: 0.38, vol: 0.14 * v, vib: [6, 20] });
    });
  });

  // correct: arcade coin + sparkle run + a thump underneath
  const correct = go((t) => {
    tone({ f: hz(83), type: "pulse25", t, dur: 0.07, vol: 0.16 });
    tone({ f: hz(88), type: "pulse25", t: t + 0.07, dur: 0.5, vol: 0.16, vib: [7, 25] });
    arp(t + 0.2, [84, 88, 91, 96, 100], 0.05, { type: "pulse50", dur: 0.09, vol: 0.08 });
    tone({ f: hz(48), type: "triangle", t, dur: 0.3, vol: 0.2 });
  });

  // wrong: two bit-crushed "bzzt" bursts and a low thud
  const wrong = go((t) => {
    const crush = crusher(8); crush.connect(sfxBus);
    [0, 0.27].forEach((d) => {
      tone({ f: 160, f2: 105, type: "pulse12", t: t + d, dur: 0.22, vol: 0.22, attack: 0.003, dest: crush });
      tone({ f: 80, f2: 52, type: "pulse50", t: t + d, dur: 0.22, vol: 0.14, attack: 0.003, dest: crush });
      noise({ kind: "short", rate: 0.6, t: t + d, dur: 0.2, vol: 0.09, dest: crush });
    });
    tone({ f: 70, f2: 38, type: "triangle", t: t + 0.55, dur: 0.3, vol: 0.22 });
  });

  const dailyDouble = go((t) => {                  // siren + fanfare
    [0, 0.26, 0.52].forEach((d, i) => tone({ f: i % 2 ? 1600 : 400, f2: i % 2 ? 400 : 1600, type: "pulse25", t: t + d, dur: 0.25, vol: 0.12 }));
    arp(t + 0.85, [60, 64, 67, 72, 76, 79, 84], 0.08, { type: "pulse50", dur: 0.14, vol: 0.12 });
    arp(t + 1.5, [84, 86, 84, 86, 84, 86], 0.055, { type: "pulse25", dur: 0.06, vol: 0.1 });
    arp(t + 1.9, [72, 76, 79, 84], 0, { type: "pulse50", dur: 0.7, vol: 0.09 });
  });

  const reset = go((t) => arp(t, [84, 79, 76, 72, 67], 0.05, { type: "pulse25", dur: 0.07, vol: 0.12 }));

  // ====================================================
  //  BACKGROUND MUSIC - two original chiptune loops, scheduled a hair ahead of the clock
  // ====================================================
  const kick = (t) => tone({ f: 130, f2: 42, type: "triangle", t, dur: 0.12, vol: 0.34, dest: musicBus });
  const snare = (t) => {
    noise({ kind: "long", rate: 1.2, t, dur: 0.1, vol: 0.12, type: "highpass", f: 1200, dest: musicBus });
    tone({ f: 220, f2: 120, type: "triangle", t, dur: 0.07, vol: 0.1, dest: musicBus });
  };
  const hat = (t, v) => noise({ kind: "short", rate: 7, t, dur: 0.02, vol: v, dest: musicBus });
  const ARP = [0, 1, 2, 1];

  const THEMES = {
    // sunset: gentle arpeggios and a slow lead  (Am - F - C - G)
    scene: {
      bpm: 92, steps: 64,
      chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]],
      mel: [
        [81, 0, 0, 0, 0, 0, 84, 0, 83, 0, 0, 0, 81, 0, 0, 0],
        [77, 0, 0, 0, 0, 0, 81, 0, 79, 0, 0, 0, 77, 0, 0, 0],
        [76, 0, 0, 0, 0, 0, 79, 0, 81, 0, 0, 0, 84, 0, 0, 0],
        [83, 0, 0, 0, 0, 0, 79, 0, 74, 0, 0, 0, 76, 0, 0, 0],
      ],
      play(s, t, sp) {
        const bar = (s >> 4) & 3, st = s & 15, ch = this.chords[bar];
        tone({ f: hz(ch[ARP[st % 4]] + 12), type: "pulse25", t, dur: sp * 1.6, vol: 0.055, dest: musicBus });
        const n = this.mel[bar][st];
        if (n) tone({ f: hz(n), type: "pulse50", t, dur: sp * 3.4, vol: 0.08, vib: [5.5, 18], dest: musicBus });
        if (st === 0 || st === 8) tone({ f: hz(ch[0] - 24), type: "triangle", t, dur: sp * 6, vol: 0.28, attack: 0.01, dest: musicBus });
        if (st === 6 || st === 14) tone({ f: hz(ch[0] - 12), type: "triangle", t, dur: sp * 1.6, vol: 0.12, dest: musicBus });
        if (st === 0 || st === 8) kick(t);
        if (st % 2 === 1) hat(t, 0.02);
      },
    },
    // board: driving game-show chiptune  (C - Am - F - G)
    board: {
      bpm: 124, steps: 64,
      chords: [[48, 52, 55], [45, 48, 52], [53, 57, 60], [55, 59, 62]],
      mel: [
        [76, 0, 79, 0, 81, 0, 79, 76, 0, 0, 72, 0, 74, 0, 76, 0],
        [72, 0, 76, 0, 81, 0, 76, 0, 79, 0, 76, 0, 72, 0, 0, 0],
        [77, 0, 81, 0, 84, 0, 81, 77, 0, 0, 76, 0, 77, 0, 79, 0],
        [79, 0, 83, 0, 86, 0, 83, 0, 81, 0, 79, 0, 74, 0, 0, 0],
      ],
      play(s, t, sp) {
        const bar = (s >> 4) & 3, st = s & 15, ch = this.chords[bar];
        if (st === 0 || st === 8 || st === 10) kick(t);
        if (st === 4 || st === 12) snare(t);
        hat(t, st % 2 === 0 ? 0.03 : 0.015);
        if (st % 2 === 0) tone({ f: hz(ch[(st / 2) % 4 === 2 ? 2 : 0] + ((st / 2) % 2 ? 12 : 0)), type: "triangle", t, dur: sp * 1.8, vol: 0.2, attack: 0.008, dest: musicBus });
        tone({ f: hz(ch[ARP[st % 4]] + 24), type: "pulse12", t, dur: sp * 1.2, vol: 0.03, dest: musicBus });
        const n = this.mel[bar][st];
        if (n) tone({ f: hz(n), type: "pulse50", t, dur: sp * 1.7, vol: 0.05, dest: musicBus });
      },
    },
  };

  let mTimer = null, mName = null, mStep = 0, mNext = 0;
  function pump(until) {                           // schedule every note that starts before `until`
    const th = THEMES[mName];
    if (!th) return;
    const sp = 60 / th.bpm / 4;
    while (mNext < until) { th.play(mStep, mNext, sp); mNext += sp; mStep = (mStep + 1) % th.steps; }
  }
  function music(name) {
    if (!ctx() || name === mName) return;
    const t = ac.currentTime;
    clearInterval(mTimer); mTimer = null;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setTargetAtTime(0.0001, t, 0.05);
    mName = name;
    if (!name) return;
    mStep = 0; mNext = t + 0.25;
    musicBus.gain.setTargetAtTime(ducked ? DUCK_VOL : MUSIC_VOL, t + 0.2, 0.2);
    mTimer = setInterval(() => pump(ac.currentTime + 0.3), 40);
  }
  function duck(on) {
    ducked = !!on;
    if (ac && mName) musicBus.gain.setTargetAtTime(ducked ? DUCK_VOL : MUSIC_VOL, ac.currentTime, 0.15);
  }

  // ---------- mute ----------
  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem("jsf.muted", muted ? "1" : "0"); } catch (_) {}
    if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.9, ac.currentTime, 0.03);
  }

  return {
    click, select, clueOpen, jump, whoosh, pop, land, boardFill, reveal, correct, wrong, dailyDouble, reset,
    tickStart, tickStop, jetStart, jetFly, jetStop, music, duck, setMuted,
    isMuted: () => muted,
    // test hooks (used to render sounds offline and check they are not silent)
    _attach(c) { ac = c; offline = true; build(); },
    _pump(until) { pump(until); },
    _play(name) { mName = name; mStep = 0; mNext = ac.currentTime; musicBus.gain.value = MUSIC_VOL; },
  };
})();
