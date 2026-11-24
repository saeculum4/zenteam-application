// Tab 2: Mood Analysis, Interactive SVG Mood Chart & Daily Reflection Diary

import { EMOTION_TAGS, MOOD_LEVELS } from "../data.js";
import { icons } from "../icons.js";

function getMoodInfo(score) {
  return MOOD_LEVELS.find((m) => score >= m.min && score <= m.max) || MOOD_LEVELS[2];
}

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderMoodChart(entries) {
  if (!entries.length) {
    return `
      <div style="text-align:center; padding:34px 16px; color:var(--text-muted); font-size:14px;">
        Зафиксируйте первую отметку настроения, чтобы увидеть график динамики дня и недели.
      </div>
    `;
  }

  // Chronological order, up to 12 most recent points
  const pts = [...entries].slice(0, 12).reverse();
  const W = 560;
  const H = 200;
  const padL = 38;
  const padR = 22;
  const padT = 22;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const coords = pts.map((item, idx) => {
    const x = pts.length === 1 ? padL + plotW / 2 : padL + (idx / (pts.length - 1)) * plotW;
    const y = padT + ((10 - item.score) / 9) * plotH;
    return { x, y, item };
  });

  const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
      : "";

  const midY = padT + ((10 - 5.5) / 9) * plotH;

  return `
    <div class="mood-chart-wrap">
      <svg class="mood-chart-svg" viewBox="0 0 ${W} ${H}">
        <defs>
          <linearGradient id="moodAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#6d8eae" stop-opacity="0.28"/>
            <stop offset="100%" stop-color="#c58c94" stop-opacity="0.02"/>
          </linearGradient>
        </defs>

        <!-- Neutral dashed baseline (like wireframe) -->
        <line x1="${padL}" y1="${midY.toFixed(1)}" x2="${W - padR}" y2="${midY.toFixed(1)}" stroke="#c58c94" stroke-dasharray="4 4" stroke-width="1.2" opacity="0.6" />
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#2a3142" stroke-opacity="0.16" stroke-width="1" />

        <!-- Y-axis smiley guides -->
        <text x="12" y="${padT + 8}" font-size="14">😊</text>
        <text x="12" y="${padT + plotH}" font-size="14">😔</text>

        ${areaPath ? `<path d="${areaPath}" fill="url(#moodAreaGrad)" />` : ""}
        ${coords.length > 1 ? `<path d="${linePath}" fill="none" stroke="#6d8eae" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />` : ""}

        ${coords
          .map(({ x, y, item }) => {
            const label = item.entry_time || item.entry_date?.slice(5) || "";
            return `
              <g>
                <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="#ffffff" stroke="#c58c94" stroke-width="2.6" />
                <text x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#2a3142">${item.score}</text>
                <text x="${x.toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="10.5" fill="#5d677c">${escapeHtml(label)}</text>
              </g>
            `;
          })
          .join("")}
      </svg>
    </div>
  `;
}

export function renderMoodView(container, app) {
  const ui = app.state.moodUi;
  const moodInfo = getMoodInfo(ui.score);
  const allEntries = app.state.moodEntries;

  const todayStr = new Date().toISOString().slice(0, 10);
  const filteredEntries =
    ui.filter === "today"
      ? allEntries.filter((e) => e.entry_date === todayStr)
      : ui.filter === "week"
      ? allEntries.filter((e) => {
          const diff = (Date.now() - new Date(e.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return diff <= 7;
        })
      : allEntries;

  const avgScore =
    allEntries.length > 0
      ? (allEntries.reduce((s, e) => s + Number(e.score || 0), 0) / allEntries.length).toFixed(1)
      : "—";

  // Most common tag
  const tagCounts = {};
  allEntries.forEach((e) => (e.tags || []).forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));
  const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Анализ настроения и дневник</h1>
        <p class="page-subtitle">Отмечайте эмоциональное состояние и записывайте, как прошёл ваш день.</p>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <span class="badge">Средний балл: ${avgScore}/10</span>
        <span class="badge badge-warm">Частая эмоция: ${escapeHtml(topTag)}</span>
      </div>
    </div>

    <div class="grid-2" style="align-items:start;">
      <!-- Left: Mood Slider + Diary Form -->
      <div class="card">
        <div class="card-title">Ваше настроение сейчас</div>
        <div class="mood-slider-box">
          <div class="mood-face-display" id="mood-face">${moodInfo.emoji}</div>
          <div class="mood-label-text" id="mood-label">${moodInfo.label} · ${ui.score}/10</div>
          <div class="mood-slider-row">
            <span style="font-size:24px;">😔</span>
            <input type="range" id="mood-score-range" class="mood-range" min="1" max="10" value="${ui.score}" />
            <span style="font-size:24px;">😊</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="field-group">
          <label class="field-label">Какие эмоции вы чувствуете?</label>
          <div class="chip-row" id="emotion-tags-row">
            ${EMOTION_TAGS.map(
              (tag) => `
              <button type="button" class="chip ${ui.selectedTags.includes(tag) ? "active" : ""}" data-tag="${tag}">
                ${tag}
              </button>
            `
            ).join("")}
          </div>
        </div>

        <div class="field-group">
          <label class="field-label" for="diary-note-input">Дневник дня — как всё прошло?</label>
          <textarea
            id="diary-note-input"
            class="textarea"
            placeholder="Напишите о событиях дня, своих мыслях, переживаниях или приятных моментах..."
          >${escapeHtml(ui.note)}</textarea>
        </div>

        <div class="field-group">
          <label class="field-label" for="diary-gratitude-input">За что вы благодарны сегодня? (необязательно)</label>
          <input
            type="text"
            id="diary-gratitude-input"
            class="input"
            placeholder="Например: тёплая прогулка, поддержка друга, вкусный чай..."
            value="${escapeHtml(ui.gratitude)}"
          />
        </div>

        <button class="btn btn-primary btn-block" id="save-mood-btn">
          ${icons.star} Зафиксировать
        </button>
      </div>

      <!-- Right: Chart + History of Other Days -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="card">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
            <div class="card-title" style="margin:0;">График настроения</div>
            <div class="chip-row">
              <button class="chip ${ui.filter === "all" ? "active" : ""}" data-filter="all" style="padding:5px 11px; font-size:12px;">Все</button>
              <button class="chip ${ui.filter === "today" ? "active" : ""}" data-filter="today" style="padding:5px 11px; font-size:12px;">Сегодня</button>
              <button class="chip ${ui.filter === "week" ? "active" : ""}" data-filter="week" style="padding:5px 11px; font-size:12px;">Неделя</button>
            </div>
          </div>
          ${renderMoodChart(filteredEntries)}
        </div>

        <div class="card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div class="card-title" style="margin:0;">История других дней</div>
            <span style="font-size:12.5px; color:var(--text-muted);">Записей: ${filteredEntries.length}</span>
          </div>

          ${
            filteredEntries.length === 0
              ? `<p style="margin:0; font-size:14px; color:var(--text-secondary);">За выбранный период записей пока нет. Поделитесь своим состоянием слева — дневник сохранится автоматически.</p>`
              : `<div class="diary-list">
                  ${filteredEntries
                    .map((entry) => {
                      const info = getMoodInfo(entry.score);
                      const dateObj = new Date(entry.entry_date + "T12:00:00");
                      const dateLabel = isNaN(dateObj.getTime())
                        ? entry.entry_date
                        : dateObj.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
                      return `
                        <div class="diary-entry">
                          <div class="diary-entry-head">
                            <div>
                              <div style="font-size:13px; font-weight:700; color:var(--text-primary); text-transform:capitalize;">
                                ${dateLabel} · <span style="color:var(--text-muted); font-weight:500;">${escapeHtml(entry.entry_time || "")}</span>
                              </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px;">
                              <span class="diary-score-pill">${info.emoji} ${entry.score}/10</span>
                              <button class="icon-btn" data-delete-mood="${entry.id}" title="Удалить запись" style="width:30px; height:30px;">
                                ${icons.trash}
                              </button>
                            </div>
                          </div>
                          ${
                            entry.tags?.length
                              ? `<div class="chip-row" style="margin-bottom:8px;">
                                  ${entry.tags
                                    .map(
                                      (t) =>
                                        `<span class="badge" style="font-size:11.5px; padding:3px 9px;">${escapeHtml(t)}</span>`
                                    )
                                    .join("")}
                                </div>`
                              : ""
                          }
                          ${
                            entry.note
                              ? `<p style="margin:0 0 6px; font-size:14px; color:var(--text-primary); white-space:pre-line;">${escapeHtml(entry.note)}</p>`
                              : `<p style="margin:0 0 4px; font-size:13px; color:var(--text-muted); font-style:italic;">Без текстовой заметки</p>`
                          }
                          ${
                            entry.gratitude
                              ? `<div style="font-size:12.5px; color:var(--accent-hover); background:var(--bg-sage-soft); padding:7px 10px; border-radius:10px; margin-top:6px;">
                                  💛 Благодарность: ${escapeHtml(entry.gratitude)}
                                </div>`
                              : ""
                          }
                        </div>
                      `;
                    })
                    .join("")}
                </div>`
          }
        </div>
      </div>
    </div>
  `;

  const range = container.querySelector("#mood-score-range");
  range.addEventListener("input", () => {
    ui.score = Number(range.value);
    const info = getMoodInfo(ui.score);
    container.querySelector("#mood-face").textContent = info.emoji;
    container.querySelector("#mood-label").textContent = `${info.label} · ${ui.score}/10`;
  });

  container.querySelectorAll("[data-tag]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.tag;
      if (ui.selectedTags.includes(t)) {
        ui.selectedTags = ui.selectedTags.filter((x) => x !== t);
      } else {
        ui.selectedTags = [...ui.selectedTags, t];
      }
      btn.classList.toggle("active");
    });
  });

  const noteInput = container.querySelector("#diary-note-input");
  const gratInput = container.querySelector("#diary-gratitude-input");
  noteInput.addEventListener("input", () => {
    ui.note = noteInput.value;
  });
  gratInput.addEventListener("input", () => {
    ui.gratitude = gratInput.value;
  });

  container.querySelector("#save-mood-btn").addEventListener("click", async () => {
    const now = new Date();
    const entryDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const entryTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    await app.addMoodEntry({
      score: ui.score,
      tags: [...ui.selectedTags],
      note: noteInput.value.trim(),
      gratitude: gratInput.value.trim(),
      entry_date: entryDate,
      entry_time: entryTime,
    });

    ui.note = "";
    ui.gratitude = "";
    ui.selectedTags = [];
    app.toast("Запись в дневнике настроения сохранена ✨");
    renderMoodView(container, app);
  });

  container.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ui.filter = btn.dataset.filter;
      renderMoodView(container, app);
    });
  });

  container.querySelectorAll("[data-delete-mood]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await app.deleteMoodEntry(btn.dataset.deleteMood);
      app.toast("Запись удалена");
      renderMoodView(container, app);
    });
  });
}
