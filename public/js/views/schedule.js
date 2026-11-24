// Tab 3: Meditation Calendar, Schedule & Alarm Reminders

import { icons } from "../icons.js";

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function toIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMondayIndex(jsDay) {
  // JS: 0=Sun..6=Sat -> 0=Mon..6=Sun
  return (jsDay + 6) % 7;
}

export function isScheduledOnDate(item, dateStr) {
  if (item.repeat_mode === "daily") return true;
  const d = new Date(dateStr + "T12:00:00");
  const dow = getMondayIndex(d.getDay()); // 0=Mon..6=Sun
  if (item.repeat_mode === "weekdays") return dow >= 0 && dow <= 4;
  if (item.repeat_mode === "custom") return Array.isArray(item.weekdays) && item.weekdays.includes(dow);
  return item.specific_date === dateStr;
}

function repeatLabel(item) {
  if (item.repeat_mode === "daily") return "Каждый день";
  if (item.repeat_mode === "weekdays") return "По будням (Пн–Пт)";
  if (item.repeat_mode === "custom") {
    const names = (item.weekdays || []).map((i) => WEEKDAYS_RU[i]).filter(Boolean);
    return names.length ? names.join(", ") : "Выбранные дни";
  }
  return item.specific_date ? `Дата: ${item.specific_date}` : "Один раз";
}

function escapeHtml(str = "") {
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function renderScheduleView(container, app) {
  const ui = app.state.scheduleUi;
  const todayStr = toIsoDate(new Date());
  const year = ui.viewYear;
  const month = ui.viewMonth;

  // Build calendar cells (6 rows x 7 cols)
  const firstDay = new Date(year, month, 1);
  const startOffset = getMondayIndex(firstDay.getDay());
  const gridStart = new Date(year, month, 1 - startOffset);

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const iso = toIsoDate(d);
    const items = app.state.scheduleItems.filter((item) => isScheduledOnDate(item, iso));
    const hasDone = items.some((item) => (item.completed_dates || []).includes(iso));
    cells.push({
      dayNum: d.getDate(),
      iso,
      inMonth: d.getMonth() === month,
      isToday: iso === todayStr,
      isSelected: iso === ui.selectedDate,
      count: items.length,
      hasDone,
    });
  }

  const dayItems = app.state.scheduleItems
    .filter((item) => isScheduledOnDate(item, ui.selectedDate))
    .sort((a, b) => (a.time_str || "").localeCompare(b.time_str || ""));

  const notifSupported = "Notification" in window;
  const notifPermission = notifSupported ? Notification.permission : "unsupported";

  const selectedLabel = new Date(ui.selectedDate + "T12:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">График медитаций</h1>
        <p class="page-subtitle">Составьте спокойное расписание и включите будильник, чтобы приложение мягко напомнило о практике.</p>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="test-alarm-btn">${icons.bell} Проверить будильник</button>
        ${
          notifSupported && notifPermission !== "granted"
            ? `<button class="btn btn-primary btn-sm" id="enable-notif-btn">Разрешить уведомления</button>`
            : notifPermission === "granted"
            ? `<span class="badge">${icons.check} Уведомления включены</span>`
            : ""
        }
      </div>
    </div>

    <div class="grid-2" style="align-items:start;">
      <!-- Left: Interactive Calendar + Selected Day List -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
            <button class="icon-btn" id="cal-prev-btn" aria-label="Предыдущий месяц">${icons.chevronLeft}</button>
            <div style="font-family:var(--font-serif); font-size:24px; font-weight:600;">
              ${MONTHS_RU[month]} ${year}
            </div>
            <button class="icon-btn" id="cal-next-btn" aria-label="Следующий месяц">${icons.chevronRight}</button>
          </div>

          <div class="calendar-grid">
            ${WEEKDAYS_RU.map((w) => `<div class="calendar-dow">${w}</div>`).join("")}
            ${cells
              .map(
                (c) => `
              <button
                class="calendar-day ${c.inMonth ? "" : "other-month"} ${c.isToday ? "today" : ""} ${c.isSelected ? "selected" : ""}"
                data-date="${c.iso}"
              >
                <span>${c.dayNum}</span>
                <span class="calendar-dots">
                  ${c.count > 0 ? `<span class="cal-dot"></span>` : ""}
                  ${c.hasDone ? `<span class="cal-dot done"></span>` : ""}
                </span>
              </button>
            `
              )
              .join("")}
          </div>

          <div style="display:flex; gap:16px; margin-top:14px; font-size:12px; color:var(--text-muted); justify-content:center;">
            <span style="display:inline-flex; align-items:center; gap:5px;"><span class="cal-dot"></span> Запланировано</span>
            <span style="display:inline-flex; align-items:center; gap:5px;"><span class="cal-dot done"></span> Выполнено</span>
          </div>
        </div>

        <div class="card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div class="card-title" style="margin:0; text-transform:capitalize;">${selectedLabel}</div>
            <span class="badge">${dayItems.length} шт.</span>
          </div>

          ${
            dayItems.length === 0
              ? `<p style="margin:0; font-size:14px; color:var(--text-secondary);">На этот день пока нет запланированных сессий. Добавьте напоминание в форме справа.</p>`
              : `<div style="display:flex; flex-direction:column; gap:10px;">
                  ${dayItems
                    .map((item) => {
                      const done = (item.completed_dates || []).includes(ui.selectedDate);
                      return `
                        <div class="schedule-item-card">
                          <div style="min-width:0; flex:1;">
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:3px;">
                              <span class="schedule-time">${escapeHtml(item.time_str)}</span>
                              <span class="badge" style="font-size:11.5px;">${item.duration_minutes} мин</span>
                              ${done ? `<span class="badge badge-warm" style="font-size:11.5px;">✓ Выполнено</span>` : ""}
                            </div>
                            <div style="font-weight:700; font-size:14.5px;">${escapeHtml(item.title)}</div>
                            <div style="font-size:12px; color:var(--text-muted);">${repeatLabel(item)}</div>
                          </div>

                          <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                            <button
                              class="switch ${item.alarm_enabled ? "on" : ""}"
                              data-toggle-alarm="${item.id}"
                              title="Вкл/выкл будильник"
                              aria-label="Переключить будильник"
                            ></button>
                            <button
                              class="icon-btn"
                              data-start-schedule="${item.id}"
                              title="Запустить сейчас"
                              style="width:34px; height:34px; color:var(--accent);"
                            >${icons.play}</button>
                            <button
                              class="icon-btn"
                              data-done-schedule="${item.id}"
                              title="Отметить выполненным"
                              style="width:34px; height:34px; ${done ? "background:var(--bg-sage-soft); color:var(--accent);" : ""}"
                            >${icons.check}</button>
                            <button
                              class="icon-btn"
                              data-del-schedule="${item.id}"
                              title="Удалить"
                              style="width:34px; height:34px;"
                            >${icons.trash}</button>
                          </div>
                        </div>
                      `;
                    })
                    .join("")}
                </div>`
          }
        </div>
      </div>

      <!-- Right: Add Reminder Form -->
      <div class="card">
        <div class="card-title">${icons.bell} Новое напоминание / будильник</div>
        <form id="schedule-form">
          <div class="field-group">
            <label class="field-label" for="sch-title">Название практики</label>
            <input
              id="sch-title"
              type="text"
              class="input"
              placeholder="Например: Утренняя осознанность"
              value="${escapeHtml(ui.draftTitle)}"
              required
            />
          </div>

          <div class="grid-2" style="gap:12px;">
            <div class="field-group">
              <label class="field-label" for="sch-time">Время будильника</label>
              <input id="sch-time" type="time" class="input" value="${ui.draftTime}" required />
            </div>
            <div class="field-group">
              <label class="field-label" for="sch-duration">Длительность</label>
              <select id="sch-duration" class="select">
                <option value="5" ${ui.draftDuration === 5 ? "selected" : ""}>5 минут (Короткая)</option>
                <option value="10" ${ui.draftDuration === 10 ? "selected" : ""}>10 минут</option>
                <option value="15" ${ui.draftDuration === 15 ? "selected" : ""}>15 минут (Средняя)</option>
                <option value="20" ${ui.draftDuration === 20 ? "selected" : ""}>20 минут</option>
                <option value="30" ${ui.draftDuration === 30 ? "selected" : ""}>30 минут (Длинная)</option>
              </select>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label" for="sch-repeat">Повторение</label>
            <select id="sch-repeat" class="select">
              <option value="daily" ${ui.draftRepeat === "daily" ? "selected" : ""}>Каждый день</option>
              <option value="weekdays" ${ui.draftRepeat === "weekdays" ? "selected" : ""}>По будням (Пн–Пт)</option>
              <option value="once" ${ui.draftRepeat === "once" ? "selected" : ""}>Один раз (${ui.selectedDate})</option>
              <option value="custom" ${ui.draftRepeat === "custom" ? "selected" : ""}>Выбрать дни недели</option>
            </select>
          </div>

          <div class="field-group ${ui.draftRepeat === "custom" ? "" : "hidden"}" id="custom-weekdays-box">
            <label class="field-label">Выберите дни недели</label>
            <div class="chip-row">
              ${WEEKDAYS_RU.map(
                (day, idx) => `
                <button
                  type="button"
                  class="chip ${ui.draftWeekdays.includes(idx) ? "active" : ""}"
                  data-dow="${idx}"
                  style="padding:7px 12px;"
                >${day}</button>
              `
              ).join("")}
            </div>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:var(--bg-surface-soft); border-radius:14px; border:1px solid var(--border); margin-bottom:16px;">
            <div>
              <div style="font-size:14px; font-weight:700;">Звуковой будильник и уведомление</div>
              <div style="font-size:12px; color:var(--text-muted);">Мягкий сигнал напомнит открыть ZenTeam вовремя</div>
            </div>
            <button type="button" id="draft-alarm-switch" class="switch ${ui.draftAlarm ? "on" : ""}"></button>
          </div>

          <button type="submit" class="btn btn-primary btn-block">
            ${icons.plus} Добавить в расписание
          </button>
        </form>

        <div class="divider"></div>
        <div style="font-size:12.5px; color:var(--text-secondary); line-height:1.5;">
          <strong>Совет:</strong> при срабатывании будильника прозвучит спокойный мелодичный сигнал и появится окно быстрого запуска медитации на выбранную длительность.
        </div>
      </div>
    </div>
  `;

  container.querySelector("#cal-prev-btn").addEventListener("click", () => {
    if (ui.viewMonth === 0) {
      ui.viewMonth = 11;
      ui.viewYear -= 1;
    } else {
      ui.viewMonth -= 1;
    }
    renderScheduleView(container, app);
  });

  container.querySelector("#cal-next-btn").addEventListener("click", () => {
    if (ui.viewMonth === 11) {
      ui.viewMonth = 0;
      ui.viewYear += 1;
    } else {
      ui.viewMonth += 1;
    }
    renderScheduleView(container, app);
  });

  container.querySelectorAll("[data-date]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ui.selectedDate = btn.dataset.date;
      renderScheduleView(container, app);
    });
  });

  const enableBtn = container.querySelector("#enable-notif-btn");
  if (enableBtn) {
    enableBtn.addEventListener("click", async () => {
      try {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          app.toast("Уведомления браузера включены 🔔");
        } else {
          app.toast("Уведомления отклонены — будильник будет работать внутри приложения");
        }
        renderScheduleView(container, app);
      } catch {
        app.toast("Будильник работает внутри приложения");
      }
    });
  }

  container.querySelector("#test-alarm-btn").addEventListener("click", () => {
    app.triggerMeditationAlarm({
      title: ui.draftTitle || "Время для спокойной медитации",
      duration_minutes: ui.draftDuration || 15,
      time_str: new Date().toTimeString().slice(0, 5),
    });
  });

  container.querySelector("#sch-repeat").addEventListener("change", (e) => {
    ui.draftRepeat = e.target.value;
    container.querySelector("#custom-weekdays-box").classList.toggle("hidden", ui.draftRepeat !== "custom");
  });

  container.querySelectorAll("[data-dow]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.dow);
      if (ui.draftWeekdays.includes(idx)) {
        ui.draftWeekdays = ui.draftWeekdays.filter((x) => x !== idx);
      } else {
        ui.draftWeekdays = [...ui.draftWeekdays, idx].sort();
      }
      btn.classList.toggle("active");
    });
  });

  container.querySelector("#draft-alarm-switch").addEventListener("click", (e) => {
    ui.draftAlarm = !ui.draftAlarm;
    e.currentTarget.classList.toggle("on", ui.draftAlarm);
  });

  container.querySelector("#schedule-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = container.querySelector("#sch-title").value.trim() || "Медитация";
    const time_str = container.querySelector("#sch-time").value || "09:00";
    const duration_minutes = Number(container.querySelector("#sch-duration").value) || 15;
    const repeat_mode = container.querySelector("#sch-repeat").value;

    ui.draftTitle = title;
    ui.draftTime = time_str;
    ui.draftDuration = duration_minutes;

    await app.addScheduleItem({
      title,
      time_str,
      duration_minutes,
      repeat_mode,
      specific_date: repeat_mode === "once" ? ui.selectedDate : "",
      weekdays: repeat_mode === "custom" ? ui.draftWeekdays : [],
      alarm_enabled: ui.draftAlarm,
    });

    app.toast(`Напоминание «${title}» на ${time_str} сохранено 🔔`);
    renderScheduleView(container, app);
  });

  container.querySelectorAll("[data-toggle-alarm]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = app.state.scheduleItems.find((s) => s.id === btn.dataset.toggleAlarm);
      if (!item) return;
      await app.updateScheduleItem(item.id, { alarm_enabled: !item.alarm_enabled });
      app.toast(item.alarm_enabled ? "Будильник включён 🔔" : "Будильник выключен");
      renderScheduleView(container, app);
    });
  });

  container.querySelectorAll("[data-done-schedule]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = app.state.scheduleItems.find((s) => s.id === btn.dataset.doneSchedule);
      if (!item) return;
      const dates = new Set(item.completed_dates || []);
      if (dates.has(ui.selectedDate)) dates.delete(ui.selectedDate);
      else dates.add(ui.selectedDate);
      await app.updateScheduleItem(item.id, { completed_dates: Array.from(dates) });
      renderScheduleView(container, app);
    });
  });

  container.querySelectorAll("[data-start-schedule]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = app.state.scheduleItems.find((s) => s.id === btn.dataset.startSchedule);
      if (!item) return;
      app.startMeditation({ minutes: item.duration_minutes });
    });
  });

  container.querySelectorAll("[data-del-schedule]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await app.deleteScheduleItem(btn.dataset.delSchedule);
      app.toast("Сессия удалена из расписания");
      renderScheduleView(container, app);
    });
  });
}
