// Tab 5: Community Hub — Live Chat, Articles & Bloggers, Events & Leaderboard, Personal Account

import {
  ARTICLES,
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  BLOGGERS,
  COMMUNITY_EVENTS,
  LEADERBOARD_SEED,
} from "../data.js";
import { icons } from "../icons.js";

const CHANNELS = [
  { id: "general", name: "Общий чат", badge: "3" },
  { id: "yoga", name: "Йога и дыхание", badge: "" },
  { id: "mindfulness", name: "Осознанность", badge: "1" },
  { id: "beginners", name: "Вопросы новичков", badge: "" },
];

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMsgTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function renderCommunityView(container, app) {
  const ui = app.state.communityUi;
  const user = app.state.currentUser;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Сообщество</h1>
        <p class="page-subtitle">Общайтесь с единомышленниками, читайте статьи, вдохновляйтесь блогерами и ведите свой профиль.</p>
      </div>
      <button class="btn ${user ? "btn-secondary" : "btn-primary"} btn-sm" id="quick-account-btn">
        ${icons.user} ${user ? `${user.avatar_emoji} ${escapeHtml(user.name)}` : "Создать аккаунт"}
      </button>
    </div>

    <div class="subtabs">
      <button class="subtab-btn ${ui.subtab === "chat" ? "active" : ""}" data-subtab="chat">
        💬 Чат и обсуждения
      </button>
      <button class="subtab-btn ${ui.subtab === "resources" ? "active" : ""}" data-subtab="resources">
        📚 Статьи и блогеры
      </button>
      <button class="subtab-btn ${ui.subtab === "events" ? "active" : ""}" data-subtab="events">
        🏆 События и лидерборд
      </button>
      <button class="subtab-btn ${ui.subtab === "account" ? "active" : ""}" data-subtab="account">
        👤 Мой аккаунт
      </button>
    </div>

    <div id="community-subtab-body"></div>
  `;

  container.querySelector("#quick-account-btn").addEventListener("click", () => {
    ui.subtab = "account";
    renderCommunityView(container, app);
  });

  container.querySelectorAll("[data-subtab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ui.subtab = btn.dataset.subtab;
      renderCommunityView(container, app);
    });
  });

  const body = container.querySelector("#community-subtab-body");
  if (ui.subtab === "chat") renderChatSubtab(body, app, container);
  else if (ui.subtab === "resources") renderResourcesSubtab(body, app);
  else if (ui.subtab === "events") renderEventsSubtab(body, app);
  else renderAccountSubtab(body, app, container);
}

function renderChatSubtab(body, app, rootContainer) {
  const ui = app.state.communityUi;
  const user = app.state.currentUser;
  const channelMsgs = app.state.chatMessages.filter((m) => m.channel === ui.channel);

  body.innerHTML = `
    ${
      !user
        ? `<div class="card-soft" style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:14px; padding:14px 18px;">
            <div style="font-size:13.5px;">
              <strong>Вы пишете как гость.</strong> Создайте свой аккаунт ZenTeam, чтобы общаться под своим именем и аватаром.
            </div>
            <button class="btn btn-primary btn-sm" id="chat-go-account">Создать профиль</button>
          </div>`
        : ""
    }

    <div class="chat-box">
      <div class="chat-channels">
        ${CHANNELS.map(
          (ch) => `
          <button class="chip ${ui.channel === ch.id ? "active" : ""}" data-channel="${ch.id}">
            # ${ch.name}
          </button>
        `
        ).join("")}
      </div>

      <div class="chat-messages" id="chat-messages-list">
        ${
          channelMsgs.length === 0
            ? `<div style="margin:auto; text-align:center; color:var(--text-muted); font-size:14px;">В этом канале пока тихо. Напишите первое сообщение!</div>`
            : channelMsgs
                .map((m) => {
                  const isMine = user && (m.author_handle === user.handle || m.author_name === user.name);
                  return `
                    <div class="chat-msg ${isMine ? "mine" : ""}">
                      <div class="avatar-circle avatar-sm" style="background:${m.author_color || "#4D6F61"};">
                        ${m.author_emoji || "🧘"}
                      </div>
                      <div class="chat-bubble">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px; font-size:12px;">
                          <strong style="color:var(--text-primary);">${escapeHtml(m.author_name)}</strong>
                          <span style="color:var(--text-muted);">${escapeHtml(m.author_handle || "")}</span>
                          <span style="color:var(--text-muted); margin-left:auto;">${formatMsgTime(m.created_at)}</span>
                        </div>
                        <div style="font-size:14px; color:var(--text-primary); white-space:pre-line;">${escapeHtml(m.text)}</div>
                        <div style="margin-top:6px; display:flex; justify-content:flex-end;">
                          <button
                            class="chip"
                            data-like-msg="${m.id}"
                            style="padding:2px 9px; font-size:11.5px; border-color:var(--border);"
                          >
                            💛 ${m.likes || 0}
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join("")
        }
      </div>

      <form class="chat-composer" id="chat-form">
        <input
          type="text"
          id="chat-input"
          class="input"
          style="background:#fff;"
          placeholder="Поделитесь мыслью, вопросом или впечатлением о практике..."
          autocomplete="off"
          required
        />
        <button type="submit" class="btn btn-primary" style="flex-shrink:0;">
          ${icons.send} Отправить
        </button>
      </form>
    </div>
  `;

  const msgList = body.querySelector("#chat-messages-list");
  if (msgList) msgList.scrollTop = msgList.scrollHeight;

  body.querySelector("#chat-go-account")?.addEventListener("click", () => {
    ui.subtab = "account";
    renderCommunityView(rootContainer, app);
  });

  body.querySelectorAll("[data-channel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ui.channel = btn.dataset.channel;
      renderChatSubtab(body, app, rootContainer);
    });
  });

  body.querySelectorAll("[data-like-msg]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await app.likeChatMessage(btn.dataset.likeMsg);
      renderChatSubtab(body, app, rootContainer);
    });
  });

  body.querySelector("#chat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = body.querySelector("#chat-input");
    const text = input.value.trim();
    if (!text) return;

    await app.sendChatMessage({
      channel: ui.channel,
      author_name: user ? user.name : "Гость ZenTeam",
      author_handle: user ? user.handle : "@guest",
      author_emoji: user ? user.avatar_emoji : "🌿",
      author_color: user ? user.avatar_color : "#4D6F61",
      text,
    });

    input.value = "";
    renderChatSubtab(body, app, rootContainer);
  });
}

function renderResourcesSubtab(body, app) {
  body.innerHTML = `
    <div style="margin-bottom:24px;">
      <div class="card-title" style="font-size:18px; margin-bottom:12px;">
        ${icons.book} Популярные статьи и гайды
      </div>
      <div class="grid-2">
        ${ARTICLES.map(
          (art) => `
          <div class="article-card">
            <div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                <span class="badge">${escapeHtml(art.category)}</span>
                <span style="font-size:12px; color:var(--text-muted);">⏱ ${art.readTime}</span>
              </div>
              <h3 style="font-size:16.5px; margin:0 0 8px; line-height:1.3;">${escapeHtml(art.title)}</h3>
              <p style="margin:0; font-size:13.5px; color:var(--text-secondary);">${escapeHtml(art.summary)}</p>
            </div>
            <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" data-read-article="${art.id}">Читать в приложении</button>
              <a class="btn btn-ghost btn-sm" href="${art.externalUrl}" target="_blank" rel="noopener noreferrer">
                Источник ${icons.external}
              </a>
            </div>
          </div>
        `
        ).join("")}
      </div>
    </div>

    <div>
      <div class="card-title" style="font-size:18px; margin-bottom:12px;">
        🌿 Популярные блогеры и каналы по йоге и медитации
      </div>
      <div class="grid-2">
        ${BLOGGERS.map(
          (b) => `
          <div class="blogger-card">
            <div class="avatar-circle" style="background:${b.color}; width:48px; height:48px; font-size:24px;">
              ${b.emoji}
            </div>
            <div style="flex:1; min-width:0;">
              <div style="font-weight:700; font-size:15.5px;">${escapeHtml(b.name)}</div>
              <div style="font-size:12px; color:var(--accent); font-weight:600; margin-bottom:4px;">${escapeHtml(b.handle)}</div>
              <p style="margin:0 0 10px; font-size:13px; color:var(--text-secondary);">${escapeHtml(b.focus)}</p>
              <a class="btn btn-ghost btn-sm" href="${b.url}" target="_blank" rel="noopener noreferrer">
                Открыть канал ${icons.external}
              </a>
            </div>
          </div>
        `
        ).join("")}
      </div>
    </div>
  `;

  body.querySelectorAll("[data-read-article]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const art = ARTICLES.find((a) => a.id === btn.dataset.readArticle);
      if (!art) return;
      app.openModal(`
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px;">
          <span class="badge">${escapeHtml(art.category)} · ${art.readTime}</span>
          <button class="icon-btn" id="art-close-btn">${icons.close}</button>
        </div>
        <h2 style="font-family:var(--font-serif); font-size:30px; margin:0 0 14px; line-height:1.15;">${escapeHtml(art.title)}</h2>
        ${art.content
          .map((p) => `<p style="font-size:15px; color:var(--text-primary); margin:0 0 12px; line-height:1.65;">${escapeHtml(p)}</p>`)
          .join("")}
        <div class="divider"></div>
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <a class="btn btn-ghost btn-sm" href="${art.externalUrl}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(art.externalLabel)} ${icons.external}
          </a>
          <button class="btn btn-primary btn-sm" id="art-practice-btn">Попробовать в таймере</button>
        </div>
      `);
      document.getElementById("art-close-btn")?.addEventListener("click", () => app.closeModal());
      document.getElementById("art-practice-btn")?.addEventListener("click", () => {
        app.closeModal();
        app.navigate("timer");
      });
    });
  });
}

function renderEventsSubtab(body, app) {
  const joined = app.state.communityUi.joinedEvents;
  const userMinutes = app.getTotalMinutes();
  const user = app.state.currentUser;

  const board = [
    ...LEADERBOARD_SEED,
    {
      name: user ? `${user.name} (Вы)` : "Вы (Гость)",
      emoji: user ? user.avatar_emoji : "🧘",
      minutes: userMinutes,
      streak: app.getStreakDays(),
      isMe: true,
    },
  ].sort((a, b) => b.minutes - a.minutes);

  body.innerHTML = `
    <div class="grid-2" style="align-items:start;">
      <div class="card">
        <div class="card-title">📅 Доска объявлений и встречи</div>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${COMMUNITY_EVENTS.map((ev) => {
            const isGoing = joined.includes(ev.id);
            return `
              <div style="padding:15px; border-radius:16px; background:var(--bg-surface-soft); border:1px solid var(--border);">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
                  <span class="badge">${escapeHtml(ev.date)}</span>
                  <span style="font-size:12px; color:var(--text-muted);">${escapeHtml(ev.format)}</span>
                </div>
                <div style="font-weight:700; font-size:15px; margin-bottom:4px;">${escapeHtml(ev.title)}</div>
                <div style="font-size:12.5px; color:var(--text-secondary); margin-bottom:10px;">
                  Ведущий: ${escapeHtml(ev.host)} · ${escapeHtml(ev.spots)}
                </div>
                <button class="btn ${isGoing ? "btn-secondary" : "btn-primary"} btn-sm" data-join-event="${ev.id}">
                  ${isGoing ? `${icons.check} Вы записаны` : "Я пойду!"}
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="card">
        <div class="card-title">🏆 Лидерборд недели</div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:18px;">
          ${board
            .map(
              (row, idx) => `
            <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; background:${row.isMe ? "var(--bg-sage-soft)" : "var(--bg-surface-soft)"}; border:1px solid ${row.isMe ? "rgba(109,142,174,0.34)" : "var(--border)"};">
              <strong style="width:22px; color:var(--accent); font-size:15px;">#${idx + 1}</strong>
              <span style="font-size:20px;">${row.emoji}</span>
              <div style="flex:1;">
                <div style="font-weight:700; font-size:14px;">${escapeHtml(row.name)}</div>
                <div style="font-size:12px; color:var(--text-muted);">Серия: ${row.streak} дн.</div>
              </div>
              <span class="badge">${row.minutes} мин</span>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="card-title" style="font-size:15px;">Ваши достижения</div>
        <div class="chip-row">
          <span class="badge ${app.state.sessions.length >= 1 ? "" : "badge-warm"}" style="opacity:${app.state.sessions.length >= 1 ? 1 : 0.5};">
            🪷 Первая медитация
          </span>
          <span class="badge ${app.state.moodEntries.length >= 1 ? "" : "badge-warm"}" style="opacity:${app.state.moodEntries.length >= 1 ? 1 : 0.5};">
            📓 Осознанный дневник
          </span>
          <span class="badge ${app.state.scheduleItems.length >= 1 ? "" : "badge-warm"}" style="opacity:${app.state.scheduleItems.length >= 1 ? 1 : 0.5};">
            ⏰ План практик
          </span>
          <span class="badge ${user ? "" : "badge-warm"}" style="opacity:${user ? 1 : 0.5};">
            🌿 Участник ZenTeam
          </span>
        </div>
      </div>
    </div>
  `;

  body.querySelectorAll("[data-join-event]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.joinEvent;
      if (joined.includes(id)) {
        app.state.communityUi.joinedEvents = joined.filter((x) => x !== id);
        app.toast("Запись отменена");
      } else {
        app.state.communityUi.joinedEvents = [...joined, id];
        app.toast("Вы записаны на встречу! ✨");
      }
      renderEventsSubtab(body, app);
    });
  });
}

function renderAccountSubtab(body, app, rootContainer) {
  const user = app.state.currentUser;
  const draftEmoji = app.state.communityUi.draftEmoji || user?.avatar_emoji || "🐑";
  const draftColor = app.state.communityUi.draftColor || user?.avatar_color || "#6D8EAE";

  body.innerHTML = `
    <div class="grid-2" style="align-items:start;">
      <!-- Left: Create or Edit Account Form -->
      <div class="card">
        <div class="card-title">
          ${user ? "Редактирование профиля ZenTeam" : "Создать свой аккаунт ZenTeam"}
        </div>
        <p style="margin:0 0 16px; font-size:13.5px; color:var(--text-secondary);">
          Ваш профиль отображается в общем чате сообщества и в отзывах к местам для медитаций.
        </p>

        <form id="account-form">
          <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
            <div id="preview-avatar" class="avatar-circle avatar-lg" style="background:${draftColor};">
              ${draftEmoji}
            </div>
            <div style="flex:1;">
              <div class="field-label" style="margin-bottom:5px;">Выберите символ и цвет</div>
              <div class="chip-row" style="gap:6px; margin-bottom:8px;">
                ${AVATAR_EMOJIS.map(
                  (em) => `
                  <button type="button" data-pick-emoji="${em}" style="border:1px solid ${em === draftEmoji ? "var(--accent)" : "var(--border)"}; background:${em === draftEmoji ? "var(--bg-sage-soft)" : "#fff"}; border-radius:10px; width:34px; height:34px; font-size:17px;">
                    ${em}
                  </button>
                `
                ).join("")}
              </div>
              <div style="display:flex; gap:8px;">
                ${AVATAR_COLORS.map(
                  (col) => `
                  <button type="button" data-pick-color="${col}" style="width:24px; height:24px; border-radius:50%; background:${col}; border:${col === draftColor ? "3px solid var(--text-primary)" : "2px solid #fff"}; box-shadow:0 2px 6px rgba(0,0,0,0.15);"></button>
                `
                ).join("")}
              </div>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label" for="acc-name">Ваше имя</label>
            <input id="acc-name" class="input" placeholder="Например: Алиса Смирнова" value="${escapeHtml(user?.name || "")}" required />
          </div>

          <div class="grid-2" style="gap:10px;">
            <div class="field-group">
              <label class="field-label" for="acc-handle">Никнейм</label>
              <input id="acc-handle" class="input" placeholder="@alice_zen" value="${escapeHtml(user?.handle || "")}" />
            </div>
            <div class="field-group">
              <label class="field-label" for="acc-email">Email (необязательно)</label>
              <input id="acc-email" type="email" class="input" placeholder="name@example.com" value="${escapeHtml(user?.email || "")}" />
            </div>
          </div>

          <div class="grid-2" style="gap:10px;">
            <div class="field-group">
              <label class="field-label" for="acc-level">Уровень практики</label>
              <select id="acc-level" class="select">
                ${["Новичок", "Практикующий", "Опытный практик", "Преподаватель йоги"]
                  .map((lvl) => `<option value="${lvl}" ${user?.level === lvl ? "selected" : ""}>${lvl}</option>`)
                  .join("")}
              </select>
            </div>
            <div class="field-group">
              <label class="field-label" for="acc-goal">Главная цель</label>
              <input id="acc-goal" class="input" value="${escapeHtml(user?.goal || "Снижение стресса и спокойствие")}" />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label" for="acc-bio">О себе</label>
            <textarea id="acc-bio" class="textarea" style="min-height:72px;" placeholder="Люблю утренние прогулки, йогу и тишину...">${escapeHtml(user?.bio || "")}</textarea>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button type="submit" class="btn btn-primary" style="flex:1;">
              ${user ? "Сохранить изменения" : "Создать аккаунт"}
            </button>
            ${user ? `<button type="button" class="btn btn-ghost" id="logout-btn">Выйти</button>` : ""}
          </div>
        </form>
      </div>

      <!-- Right: Profile Summary + Saved Accounts Switcher -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="card">
          <div class="card-title">Статистика вашей практики</div>
          <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">
            <div class="card-soft" style="padding:14px; text-align:center;">
              <div style="font-size:26px; font-weight:700; color:var(--accent);">${app.getTotalMinutes()}</div>
              <div style="font-size:12px; color:var(--text-muted);">Минут медитации</div>
            </div>
            <div class="card-soft" style="padding:14px; text-align:center;">
              <div style="font-size:26px; font-weight:700; color:var(--accent-warm);">${app.state.sessions.length}</div>
              <div style="font-size:12px; color:var(--text-muted);">Сессий пройдено</div>
            </div>
            <div class="card-soft" style="padding:14px; text-align:center;">
              <div style="font-size:26px; font-weight:700; color:var(--accent-indigo);">${app.state.moodEntries.length}</div>
              <div style="font-size:12px; color:var(--text-muted);">Записей в дневнике</div>
            </div>
            <div class="card-soft" style="padding:14px; text-align:center;">
              <div style="font-size:26px; font-weight:700; color:var(--accent);">${app.state.scheduleItems.length}</div>
              <div style="font-size:12px; color:var(--text-muted);">Напоминаний в графике</div>
            </div>
          </div>
        </div>

        ${
          app.state.users.length > 0
            ? `<div class="card-soft">
                <div class="card-title" style="font-size:15px;">Сохранённые аккаунты на устройстве</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${app.state.users
                    .map(
                      (u) => `
                    <button
                      class="schedule-item-card"
                      data-switch-user="${u.id}"
                      style="text-align:left; background:#fff; border-color:${user?.id === u.id ? "var(--accent)" : "var(--border)"};"
                    >
                      <div style="display:flex; align-items:center; gap:10px;">
                        <div class="avatar-circle avatar-sm" style="background:${u.avatar_color};">${u.avatar_emoji}</div>
                        <div>
                          <div style="font-weight:700; font-size:14px;">${escapeHtml(u.name)}</div>
                          <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(u.handle)} · ${escapeHtml(u.level)}</div>
                        </div>
                      </div>
                      ${user?.id === u.id ? `<span class="badge">Активен</span>` : `<span style="font-size:12px; color:var(--accent);">Войти</span>`}
                    </button>
                  `
                    )
                    .join("")}
                </div>
              </div>`
            : ""
        }
      </div>
    </div>
  `;

  body.querySelectorAll("[data-pick-emoji]").forEach((btn) => {
    btn.addEventListener("click", () => {
      app.state.communityUi.draftEmoji = btn.dataset.pickEmoji;
      renderAccountSubtab(body, app, rootContainer);
    });
  });

  body.querySelectorAll("[data-pick-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      app.state.communityUi.draftColor = btn.dataset.pickColor;
      renderAccountSubtab(body, app, rootContainer);
    });
  });

  body.querySelector("#account-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      id: user?.id,
      name: body.querySelector("#acc-name").value.trim(),
      handle: body.querySelector("#acc-handle").value.trim(),
      email: body.querySelector("#acc-email").value.trim(),
      level: body.querySelector("#acc-level").value,
      goal: body.querySelector("#acc-goal").value.trim(),
      bio: body.querySelector("#acc-bio").value.trim(),
      avatar_emoji: app.state.communityUi.draftEmoji || user?.avatar_emoji || "🧘",
      avatar_color: app.state.communityUi.draftColor || user?.avatar_color || "#4D6F61",
    };
    await app.saveCurrentUser(payload);
    app.toast(`Добро пожаловать в ZenTeam, ${payload.name}! 🪷`);
    app.render();
  });

  body.querySelector("#logout-btn")?.addEventListener("click", () => {
    app.logoutUser();
    app.toast("Вы вышли из аккаунта");
    app.render();
  });

  body.querySelectorAll("[data-switch-user]").forEach((btn) => {
    btn.addEventListener("click", () => {
      app.selectUserById(btn.dataset.switchUser);
      app.toast("Аккаунт переключён");
      app.render();
    });
  });
}
