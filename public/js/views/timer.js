// Tab 1: Meditation Timer Setup + Immersive Animation & Ambient Music Session

import { BREATHING_MODES, MEDITATION_PRESETS, SOUNDSCAPES } from "../data.js";
import { icons } from "../icons.js";
import { zenAudio } from "../audio.js";
import { MeditationCanvas } from "../canvas.js";

let activeTimerInterval = null;
let activeCanvas = null;

function formatClock(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function renderTimerView(container, app) {
  const cfg = app.state.timerConfig;
  const recentSessions = app.state.sessions.slice(0, 4);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Таймер медитации</h1>
        <p class="page-subtitle">Выберите длительность, спокойный звук и погрузитесь в плавный ритм дыхания.</p>
      </div>
      <span class="badge">${icons.timer} Всего практик: ${app.state.sessions.length}</span>
    </div>

    <div class="grid-2" style="align-items: start;">
      <div class="card">
        <div class="card-title">Длительность сессии</div>
        <div class="preset-list">
          ${MEDITATION_PRESETS.map(
            (p) => `
            <button class="preset-option ${cfg.presetId === p.id ? "selected" : ""}" data-preset="${p.id}">
              <span class="radio-dot"></span>
              <div style="flex:1;">
                <div class="preset-header">
                  <span class="preset-name">${p.name}</span>
                  <span class="preset-duration">${p.minutes} минут</span>
                </div>
                <p class="preset-desc">${p.description}</p>
              </div>
            </button>
          `
          ).join("")}

          <div class="preset-option ${cfg.presetId === "custom" ? "selected" : ""}" data-preset="custom" style="cursor:pointer;">
            <span class="radio-dot"></span>
            <div style="flex:1;">
              <div class="preset-header">
                <span class="preset-name">Своё время</span>
                <span class="preset-duration" id="custom-min-label">${cfg.customMinutes} мин</span>
              </div>
              <p class="preset-desc" style="margin-bottom:10px;">Настройте комфортную длительность от 1 до 60 минут.</p>
              <input
                type="range"
                id="custom-min-range"
                class="mood-range"
                min="1"
                max="60"
                value="${cfg.customMinutes}"
                style="width:100%; background: var(--bg-mist);"
              />
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-block" id="start-meditation-btn" style="padding: 15px 24px; font-size: 16px;">
          ${icons.play} Старт · ${cfg.presetId === "custom" ? cfg.customMinutes : MEDITATION_PRESETS.find((p) => p.id === cfg.presetId)?.minutes || 15} мин
        </button>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div class="card-title" style="margin:0;">Спокойная музыка и звуки</div>
            <button class="btn btn-ghost btn-sm" id="preview-sound-btn">${icons.volume} Прослушать</button>
          </div>
          <div class="sound-grid">
            ${SOUNDSCAPES.map(
              (s) => `
              <button class="sound-card ${cfg.soundscape === s.id ? "active" : ""}" data-sound="${s.id}">
                <div class="sound-emoji">${s.emoji}</div>
                <div class="sound-name">${s.name}</div>
                <div class="sound-sub">${s.sub}</div>
              </button>
            `
            ).join("")}
          </div>

          <div class="divider"></div>
          <div class="card-title" style="font-size:15px;">Ритм дыхательной анимации</div>
          <div class="chip-row">
            ${BREATHING_MODES.map(
              (b) => `
              <button class="chip ${cfg.breathing === b.id ? "active" : ""}" data-breath="${b.id}">
                ${b.name}
              </button>
            `
            ).join("")}
          </div>
        </div>

        <div class="card-soft">
          <div class="card-title" style="font-size:15px;">Последние медитации</div>
          ${
            recentSessions.length === 0
              ? `<p style="margin:0; font-size:13.5px; color:var(--text-secondary);">Пока нет завершённых сессий. Нажмите «Старт», чтобы начать первую практику.</p>`
              : `<div style="display:flex; flex-direction:column; gap:8px;">
                  ${recentSessions
                    .map((s) => {
                      const d = new Date(s.completed_at);
                      const label = SOUNDSCAPES.find((x) => x.id === s.soundscape)?.name || "Медитация";
                      return `
                      <div style="display:flex; justify-content:space-between; align-items:center; font-size:13.5px; padding:8px 12px; background:#fff; border-radius:12px; border:1px solid var(--border);">
                        <span><strong>${s.duration_minutes} мин</strong> · ${label}</span>
                        <span style="color:var(--text-muted); font-size:12px;">${d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>
                      </div>`;
                    })
                    .join("")}
                </div>`
          }
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll("[data-preset]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.id === "custom-min-range") return;
      cfg.presetId = el.dataset.preset;
      renderTimerView(container, app);
    });
  });

  const range = container.querySelector("#custom-min-range");
  if (range) {
    range.addEventListener("input", () => {
      cfg.presetId = "custom";
      cfg.customMinutes = Number(range.value);
      container.querySelector("#custom-min-label").textContent = `${cfg.customMinutes} мин`;
      container.querySelector("#start-meditation-btn").innerHTML = `${icons.play} Старт · ${cfg.customMinutes} мин`;
      container.querySelectorAll("[data-preset]").forEach((el) => {
        el.classList.toggle("selected", el.dataset.preset === "custom");
      });
    });
  }

  container.querySelectorAll("[data-sound]").forEach((el) => {
    el.addEventListener("click", () => {
      cfg.soundscape = el.dataset.sound;
      renderTimerView(container, app);
    });
  });

  container.querySelectorAll("[data-breath]").forEach((el) => {
    el.addEventListener("click", () => {
      cfg.breathing = el.dataset.breath;
      renderTimerView(container, app);
    });
  });

  container.querySelector("#preview-sound-btn").addEventListener("click", () => {
    zenAudio.preview(cfg.soundscape);
    const soundName = SOUNDSCAPES.find((s) => s.id === cfg.soundscape)?.name || "";
    app.toast(`Прослушивание: ${soundName}`);
  });

  container.querySelector("#start-meditation-btn").addEventListener("click", () => {
    const minutes =
      cfg.presetId === "custom"
        ? cfg.customMinutes
        : MEDITATION_PRESETS.find((p) => p.id === cfg.presetId)?.minutes || 15;
    launchMeditationSession(app, {
      minutes,
      soundscape: cfg.soundscape,
      breathing: cfg.breathing,
    });
  });
}

export function launchMeditationSession(app, opts = {}) {
  const minutes = opts.minutes || 15;
  let soundscape = opts.soundscape || app.state.timerConfig.soundscape || "bowls";
  const breathingId = opts.breathing || app.state.timerConfig.breathing || "calm";
  const breathMode = BREATHING_MODES.find((b) => b.id === breathingId) || BREATHING_MODES[0];

  const totalSeconds = Math.max(10, Math.round(minutes * 60));
  let remaining = totalSeconds;
  let paused = false;
  let elapsed = 0;

  const overlay = document.getElementById("meditation-overlay");
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");

  const radius = 112;
  const circumference = 2 * Math.PI * radius;

  overlay.innerHTML = `
    <canvas class="meditation-canvas" id="zen-canvas"></canvas>
    <div class="meditation-ui">
      <div class="meditation-top">
        <span class="glass-pill">
          <img src="/assets/logo.png" alt="ZENTEAM" style="width:22px; height:22px; border-radius:6px; background:#fff; object-fit:contain;" />
          <span class="logo-font" style="font-size:13px;">ZENTEAM</span> · ${breathMode.name}
        </span>
        <button class="glass-pill" id="med-exit-btn">${icons.close} Завершить</button>
      </div>

      <div class="meditation-center">
        <div class="timer-ring-wrap">
          <svg class="timer-ring-svg" viewBox="0 0 248 248">
            <circle cx="124" cy="124" r="${radius}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="5"></circle>
            <circle
              id="timer-progress-arc"
              cx="124"
              cy="124"
              r="${radius}"
              fill="none"
              stroke="rgba(229,240,234,0.88)"
              stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="0"
            ></circle>
          </svg>
          <div>
            <div class="timer-clock" id="med-clock">${formatClock(remaining)}</div>
            <div style="font-size:12.5px; opacity:0.68; margin-top:6px;">Осталось времени</div>
          </div>
        </div>
        <div class="breath-cue" id="med-breath-cue">${breathMode.phases[0].label}</div>
      </div>

      <div class="meditation-bottom">
        <div class="meditation-controls">
          <button class="glass-pill" id="med-bell-btn">🔔 Гонг</button>
          <button class="meditation-main-btn" id="med-pause-btn" aria-label="Пауза">
            ${icons.pause}
          </button>
          <button class="glass-pill" id="med-finish-now-btn">${icons.check} Готово</button>
        </div>

        <div class="meditation-audio-bar">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>🎵</span>
            <select id="med-sound-select">
              ${SOUNDSCAPES.map(
                (s) => `<option value="${s.id}" ${s.id === soundscape ? "selected" : ""}>${s.emoji} ${s.name}</option>`
              ).join("")}
            </select>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex:1; max-width:170px;">
            <span style="font-size:13px; opacity:0.8;">Громк.</span>
            <input type="range" id="med-vol-range" min="0" max="100" value="${Math.round(zenAudio.volume * 100)}" style="width:100%;" />
          </div>
        </div>
      </div>
    </div>
  `;

  // Start visual fluid canvas & ambient audio
  const canvasEl = overlay.querySelector("#zen-canvas");
  activeCanvas = new MeditationCanvas(canvasEl);
  activeCanvas.start();
  zenAudio.playBell(216, 6.0, 0.34);
  zenAudio.startSoundscape(soundscape, zenAudio.volume);

  const arcEl = overlay.querySelector("#timer-progress-arc");
  const clockEl = overlay.querySelector("#med-clock");
  const cueEl = overlay.querySelector("#med-breath-cue");

  const cycleLength = breathMode.phases.reduce((sum, p) => sum + p.seconds, 0);

  function updateBreathCue() {
    const pos = elapsed % cycleLength;
    let acc = 0;
    for (const ph of breathMode.phases) {
      acc += ph.seconds;
      if (pos < acc) {
        cueEl.textContent = ph.label;
        activeCanvas?.setBreathTarget(ph.scale);
        break;
      }
    }
  }
  updateBreathCue();

  function cleanupOverlay() {
    if (activeTimerInterval) {
      clearInterval(activeTimerInterval);
      activeTimerInterval = null;
    }
    if (activeCanvas) {
      activeCanvas.stop();
      activeCanvas = null;
    }
    zenAudio.stopSoundscape();
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = "";
  }

  async function completeSession(manualEarly = false) {
    if (activeTimerInterval) {
      clearInterval(activeTimerInterval);
      activeTimerInterval = null;
    }
    zenAudio.stopSoundscape();
    zenAudio.playBell(256, 7.0, 0.36);

    const practicedMinutes = manualEarly ? Math.max(1, Math.round(elapsed / 60) || 1) : minutes;
    await app.recordCompletedSession({
      duration_minutes: practicedMinutes,
      soundscape,
      breathing: breathingId,
    });

    const ui = overlay.querySelector(".meditation-ui");
    if (ui) {
      ui.innerHTML = `
        <div style="margin:auto; text-align:center; max-width:420px; padding:24px; background:rgba(25,36,54,0.78); backdrop-filter:blur(18px); border:1px solid rgba(255,255,255,0.18); border-radius:28px;">
          <div style="font-size:48px; margin-bottom:10px;">🪷</div>
          <h2 style="font-family:var(--font-serif); font-size:34px; margin:0 0 10px; font-weight:600;">Прекрасная практика!</h2>
          <p style="opacity:0.86; margin:0 0 22px;">Вы уделили себе <strong>${practicedMinutes} мин</strong> тишины и спокойствия. Сессия сохранена в вашу статистику.</p>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="btn btn-primary btn-block" id="after-med-mood">Отметить настроение в дневнике</button>
            <button class="glass-pill" style="justify-content:center;" id="after-med-close">Вернуться в приложение</button>
          </div>
        </div>
      `;
      ui.querySelector("#after-med-mood").addEventListener("click", () => {
        cleanupOverlay();
        app.navigate("mood");
      });
      ui.querySelector("#after-med-close").addEventListener("click", () => {
        cleanupOverlay();
        app.render();
      });
    }
  }

  activeTimerInterval = setInterval(() => {
    if (paused) return;
    elapsed += 1;
    remaining = Math.max(0, totalSeconds - elapsed);
    clockEl.textContent = formatClock(remaining);
    const ratio = elapsed / totalSeconds;
    arcEl.style.strokeDashoffset = String(circumference * ratio);
    updateBreathCue();

    if (remaining <= 0) {
      completeSession(false);
    }
  }, 1000);

  overlay.querySelector("#med-pause-btn").addEventListener("click", (e) => {
    paused = !paused;
    activeCanvas?.setPaused(paused);
    e.currentTarget.innerHTML = paused ? icons.play : icons.pause;
    if (paused) {
      zenAudio.stopSoundscape();
      cueEl.textContent = "Пауза…";
    } else {
      zenAudio.startSoundscape(soundscape, zenAudio.volume);
      updateBreathCue();
    }
  });

  overlay.querySelector("#med-bell-btn").addEventListener("click", () => {
    zenAudio.playBell(256, 5.5, 0.3);
  });

  overlay.querySelector("#med-exit-btn").addEventListener("click", () => {
    cleanupOverlay();
  });

  overlay.querySelector("#med-finish-now-btn").addEventListener("click", () => {
    completeSession(true);
  });

  overlay.querySelector("#med-sound-select").addEventListener("change", (e) => {
    soundscape = e.target.value;
    app.state.timerConfig.soundscape = soundscape;
    if (!paused) {
      zenAudio.startSoundscape(soundscape, zenAudio.volume);
    }
  });

  overlay.querySelector("#med-vol-range").addEventListener("input", (e) => {
    zenAudio.setVolume(Number(e.target.value) / 100);
  });
}
