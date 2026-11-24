// ZenTeam Main Application Controller: State, Navigation, Welcome/Menu Shell, Alarm Daemon

import { api } from "./api.js";
import { zenAudio } from "./audio.js";
import { DAILY_QUOTES } from "./data.js";
import { icons } from "./icons.js";
import { renderTimerView, launchMeditationSession } from "./views/timer.js";
import { renderMoodView } from "./views/mood.js";
import { renderScheduleView, isScheduledOnDate } from "./views/schedule.js";
import { renderPlacesView, destroyPlacesMap } from "./views/places.js";
import { renderCommunityView } from "./views/community.js";

const WELCOME_SEEN_KEY = "zenteam_welcome_seen";
const ACTIVE_USER_KEY = "zenteam_active_user_id";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const now = new Date();

class ZenTeamApp {
  constructor() {
    this.state = {
      showWelcome: !localStorage.getItem(WELCOME_SEEN_KEY),
      route: "home", // home | timer | mood | schedule | places | community
      users: [],
      currentUser: null,
      sessions: [],
      moodEntries: [],
      scheduleItems: [],
      customPlaces: [],
      placeReviews: [],
      chatMessages: [],

      timerConfig: {
        presetId: "medium",
        customMinutes: 10,
        soundscape: "bowls",
        breathing: "calm",
      },

      moodUi: {
        score: 7,
        selectedTags: [],
        note: "",
        gratitude: "",
        filter: "all",
      },

      scheduleUi: {
        viewYear: now.getFullYear(),
        viewMonth: now.getMonth(),
        selectedDate: todayIso(),
        draftTitle: "Утренняя осознанность",
        draftTime: "08:30",
        draftDuration: 15,
        draftRepeat: "daily",
        draftWeekdays: [0, 2, 4],
        draftAlarm: true,
      },

      placesUi: {
        city: "moscow",
        category: "all",
        selectedId: "msk-aptekarsky",
        draftRating: 5,
      },

      communityUi: {
        subtab: "chat",
        channel: "general",
        joinedEvents: [],
        draftEmoji: null,
        draftColor: null,
      },
    };

    this.lastTriggeredAlarmKey = "";
    this.broadcast = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("zenteam_sync") : null;
  }

  async init() {
    const data = await api.bootstrap();
    this.state.users = data.users || [];
    this.state.sessions = data.sessions || [];
    this.state.moodEntries = data.mood_entries || [];
    this.state.scheduleItems = data.schedule_items || [];
    this.state.customPlaces = data.custom_places || [];
    this.state.placeReviews = data.place_reviews || [];
    this.state.chatMessages = data.chat_messages || [];

    const savedUserId = localStorage.getItem(ACTIVE_USER_KEY);
    if (savedUserId) {
      this.state.currentUser = this.state.users.find((u) => u.id === savedUserId) || null;
    }

    if (this.broadcast) {
      this.broadcast.onmessage = async (ev) => {
        if (ev.data?.type === "chat_updated") {
          this.state.chatMessages = await api.fetchChat();
          if (this.state.route === "community" && this.state.communityUi.subtab === "chat") {
            this.renderCurrentRoute();
          }
        }
      };
    }

    this.startAlarmChecker();
    this.render();
  }

  navigate(route) {
    if (this.state.route === "places" && route !== "places") {
      destroyPlacesMap();
    }
    this.state.route = route;
    this.state.showWelcome = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.render();
  }

  getTotalMinutes() {
    return this.state.sessions.reduce((sum, s) => sum + Number(s.duration_minutes || 0), 0);
  }

  getStreakDays() {
    const dates = new Set(
      this.state.sessions.map((s) => (s.completed_at || "").slice(0, 10)).filter(Boolean)
    );
    return dates.size;
  }

  getNextAlarmLabel() {
    const active = this.state.scheduleItems.filter((s) => s.alarm_enabled);
    if (!active.length) return "Нет активных будильников";
    const sorted = [...active].sort((a, b) => (a.time_str || "").localeCompare(b.time_str || ""));
    return `Ближайший: ${sorted[0].time_str} · ${sorted[0].title}`;
  }

  // --- Data Mutations ---

  async recordCompletedSession(payload) {
    const item = await api.createSession({
      ...payload,
      user_id: this.state.currentUser?.id || "",
    });
    this.state.sessions.unshift(item);
    return item;
  }

  async addMoodEntry(payload) {
    const item = await api.createMood({
      ...payload,
      user_id: this.state.currentUser?.id || "",
    });
    this.state.moodEntries.unshift(item);
    return item;
  }

  async deleteMoodEntry(id) {
    await api.deleteMood(id);
    this.state.moodEntries = this.state.moodEntries.filter((m) => m.id !== id);
  }

  async addScheduleItem(payload) {
    const item = await api.createSchedule({
      ...payload,
      user_id: this.state.currentUser?.id || "",
    });
    this.state.scheduleItems.push(item);
    return item;
  }

  async updateScheduleItem(id, patch) {
    const updated = await api.updateSchedule(id, patch);
    this.state.scheduleItems = this.state.scheduleItems.map((s) => (s.id === id ? updated : s));
    return updated;
  }

  async deleteScheduleItem(id) {
    await api.deleteSchedule(id);
    this.state.scheduleItems = this.state.scheduleItems.filter((s) => s.id !== id);
  }

  async addCustomPlace(payload) {
    const created = await api.createPlace(payload);
    this.state.customPlaces.unshift(created);
    return created;
  }

  async addPlaceReview(payload) {
    const created = await api.createReview(payload);
    this.state.placeReviews.unshift(created);
    return created;
  }

  async sendChatMessage(payload) {
    const created = await api.postChat(payload);
    this.state.chatMessages.push(created);
    this.broadcast?.postMessage({ type: "chat_updated" });
    return created;
  }

  async likeChatMessage(id) {
    const updated = await api.likeChat(id);
    if (updated) {
      this.state.chatMessages = this.state.chatMessages.map((m) => (m.id === id ? updated : m));
    }
  }

  async saveCurrentUser(payload) {
    const saved = await api.saveUser(payload);
    this.state.currentUser = saved;
    this.state.users = [saved, ...this.state.users.filter((u) => u.id !== saved.id)];
    localStorage.setItem(ACTIVE_USER_KEY, saved.id);
    this.state.communityUi.draftEmoji = saved.avatar_emoji;
    this.state.communityUi.draftColor = saved.avatar_color;
    return saved;
  }

  selectUserById(id) {
    const found = this.state.users.find((u) => u.id === id);
    if (found) {
      this.state.currentUser = found;
      localStorage.setItem(ACTIVE_USER_KEY, found.id);
      this.state.communityUi.draftEmoji = found.avatar_emoji;
      this.state.communityUi.draftColor = found.avatar_color;
    }
  }

  logoutUser() {
    this.state.currentUser = null;
    localStorage.removeItem(ACTIVE_USER_KEY);
    this.state.communityUi.draftEmoji = "🧘";
    this.state.communityUi.draftColor = "#4D6F61";
  }

  startMeditation(opts) {
    launchMeditationSession(this, opts);
  }

  // --- Alarm & Reminder System ---

  startAlarmChecker() {
    setInterval(() => {
      const d = new Date();
      const dateStr = todayIso();
      const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

      for (const item of this.state.scheduleItems) {
        if (!item.alarm_enabled) continue;
        if (item.time_str !== hhmm) continue;
        if (!isScheduledOnDate(item, dateStr)) continue;

        const key = `${item.id}_${dateStr}_${hhmm}`;
        if (this.lastTriggeredAlarmKey === key) continue;
        this.lastTriggeredAlarmKey = key;
        this.triggerMeditationAlarm(item);
        break;
      }
    }, 10000);
  }

  triggerMeditationAlarm(item) {
    zenAudio.playAlarmChime();

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("ZenTeam — Время для медитации 🪷", {
          body: `${item.title} (${item.duration_minutes} мин). Откройте приложение и начните практику.`,
        });
      } catch {
        // ignore
      }
    }

    const modal = document.getElementById("alarm-modal");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.innerHTML = `
      <div class="modal-sheet" style="text-align:center; max-width:420px;">
        <div class="welcome-orb" style="width:92px; height:92px; border-radius:24px; margin-bottom:16px;">
          <img src="/assets/logo.png" alt="ZENTEAM" />
        </div>
        <div class="brand-overline" style="font-size:13px;">ZENTEAM · ${item.time_str || ""}</div>
        <h2 style="font-family:var(--font-serif); font-size:32px; margin:0 0 10px;">Время для медитации</h2>
        <p style="color:var(--text-secondary); margin:0 0 22px;">
          Запланированная практика: <strong>${item.title}</strong> · ${item.duration_minutes} мин.
          Сделайте глубокий вдох и начните сессию.
        </p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button class="btn btn-primary btn-block" id="alarm-start-btn">${icons.play} Начать медитацию сейчас</button>
          <button class="btn btn-ghost btn-block" id="alarm-snooze-btn">Отложить на 5 минут</button>
          <button class="btn btn-ghost btn-sm" id="alarm-dismiss-btn" style="border:none;">Закрыть</button>
        </div>
      </div>
    `;

    const closeAlarm = () => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML = "";
    };

    modal.querySelector("#alarm-start-btn").addEventListener("click", () => {
      closeAlarm();
      this.startMeditation({ minutes: item.duration_minutes });
    });

    modal.querySelector("#alarm-snooze-btn").addEventListener("click", () => {
      closeAlarm();
      this.toast("Хорошо, напомним снова через 5 минут 🔔");
      setTimeout(() => this.triggerMeditationAlarm(item), 5 * 60 * 1000);
    });

    modal.querySelector("#alarm-dismiss-btn").addEventListener("click", closeAlarm);
  }

  // --- Generic Modal & Toast ---

  openModal(html) {
    const el = document.getElementById("app-modal");
    el.classList.remove("hidden");
    el.setAttribute("aria-hidden", "false");
    el.innerHTML = `<div class="modal-sheet">${html}</div>`;
    el.onclick = (e) => {
      if (e.target === el) this.closeModal();
    };
  }

  closeModal() {
    const el = document.getElementById("app-modal");
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "";
  }

  toast(message) {
    const box = document.getElementById("toast-container");
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    box.appendChild(node);
    setTimeout(() => {
      node.style.opacity = "0";
      node.style.transition = "opacity 0.25s ease";
      setTimeout(() => node.remove(), 260);
    }, 3000);
  }

  // --- Rendering ---

  render() {
    const root = document.getElementById("app");
    if (this.state.showWelcome) {
      this.renderWelcomeScreen(root);
      return;
    }

    const user = this.state.currentUser;
    const navItems = [
      { id: "home", label: "Меню", icon: icons.home },
      { id: "timer", label: "Таймер", full: "Таймер медитации", icon: icons.timer },
      { id: "mood", label: "Настроение", full: "Анализ настроения", icon: icons.mood },
      { id: "schedule", label: "График", full: "График медитаций", icon: icons.calendar },
      { id: "places", label: "Места", full: "Места медитаций", icon: icons.map },
      { id: "community", label: "Сообщество", full: "Сообщество", icon: icons.community, badge: "3" },
    ];

    const routeTitles = {
      home: "ZenTeam",
      timer: "Таймер медитации",
      mood: "Анализ настроения",
      schedule: "График медитаций",
      places: "Места медитаций",
      community: "Сообщество",
    };

    root.innerHTML = `
      <div class="app-shell">
        <!-- Desktop Sidebar -->
        <aside class="sidebar">
          <div class="brand-lockup" id="brand-home-btn">
            <div class="brand-mark"><img src="/assets/logo.png" alt="ZENTEAM" /></div>
            <div>
              <div class="brand-name">ZENTEAM</div>
              <div class="brand-sub">Гармония и осознанность</div>
            </div>
          </div>

          <nav class="sidebar-nav">
            ${navItems
              .map(
                (item) => `
              <button class="nav-item ${this.state.route === item.id ? "active" : ""}" data-nav="${item.id}">
                ${item.icon}
                <span>${item.full || item.label}</span>
                ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ""}
              </button>
            `
              )
              .join("")}
          </nav>

          <div class="sidebar-profile" id="sidebar-profile-btn">
            <div class="avatar-circle" style="background:${user ? user.avatar_color : "#8ea9c4"};">
              ${user ? user.avatar_emoji : "🧘"}
            </div>
            <div style="min-width:0; flex:1;">
              <div style="font-weight:700; font-size:13.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${user ? user.name : "Создать профиль"}
              </div>
              <div style="font-size:11.5px; color:var(--text-muted);">
                ${user ? `${user.level} · ${this.getTotalMinutes()} мин` : "Нажмите, чтобы войти"}
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Column -->
        <div class="main-area">
          <!-- Mobile Topbar -->
          <header class="mobile-topbar">
            <div class="topbar-left">
              ${
                this.state.route !== "home"
                  ? `<button class="icon-btn" id="mobile-back-btn" aria-label="Назад в меню">${icons.chevronLeft}</button>`
                  : `<div class="brand-mark" style="width:38px; height:38px; border-radius:11px;"><img src="/assets/logo.png" alt="ZENTEAM" /></div>`
              }
              <div class="topbar-title ${this.state.route === "home" ? "logo-font" : ""}" style="${this.state.route === "home" ? "font-size:19px;" : ""}">${this.state.route === "home" ? "ZENTEAM" : routeTitles[this.state.route]}</div>
            </div>
            <button class="icon-btn" id="mobile-profile-btn" title="Профиль">
              <span style="font-size:17px;">${user ? user.avatar_emoji : "👤"}</span>
            </button>
          </header>

          <main class="page-container" id="page-container"></main>
        </div>

        <!-- Mobile Bottom Navigation -->
        <nav class="bottom-nav">
          ${navItems
            .map(
              (item) => `
            <button class="bottom-nav-btn ${this.state.route === item.id ? "active" : ""}" data-nav="${item.id}">
              ${item.icon}
              <span>${item.label}</span>
            </button>
          `
            )
            .join("")}
        </nav>
      </div>
    `;

    root.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => this.navigate(btn.dataset.nav));
    });

    root.querySelector("#brand-home-btn")?.addEventListener("click", () => this.navigate("home"));
    root.querySelector("#mobile-back-btn")?.addEventListener("click", () => this.navigate("home"));

    const openProfile = () => {
      this.state.communityUi.subtab = "account";
      this.navigate("community");
    };
    root.querySelector("#sidebar-profile-btn")?.addEventListener("click", openProfile);
    root.querySelector("#mobile-profile-btn")?.addEventListener("click", openProfile);

    this.renderCurrentRoute();
  }

  renderCurrentRoute() {
    const container = document.getElementById("page-container");
    if (!container) return;

    switch (this.state.route) {
      case "timer":
        renderTimerView(container, this);
        break;
      case "mood":
        renderMoodView(container, this);
        break;
      case "schedule":
        renderScheduleView(container, this);
        break;
      case "places":
        renderPlacesView(container, this);
        break;
      case "community":
        renderCommunityView(container, this);
        break;
      default:
        this.renderHomeMenu(container);
        break;
    }
  }

  renderWelcomeScreen(root) {
    root.innerHTML = `
      <div class="welcome-screen">
        <div class="welcome-card">
          <div class="welcome-orb"><img src="/assets/logo.png" alt="ZENTEAM" /></div>
          <div class="brand-overline">ZENTEAM</div>
          <h1 class="welcome-title">Добро пожаловать в <span class="logo-font" style="font-size:28px;">ZENTEAM</span>!</h1>
          <p class="welcome-copy">
            Ваш путь к гармонии, силе и спокойствию начинается здесь.
            Начните практику и почувствуйте баланс внутри себя.
          </p>
          <p class="welcome-copy" style="font-weight:600; color:var(--accent-hover);">
            Готовы к новой практике осознанности? Давайте начнём!
          </p>
          <button class="btn btn-primary welcome-cta" id="welcome-start-btn">
            Начать ${icons.chevronRight}
          </button>
        </div>
      </div>
    `;

    root.querySelector("#welcome-start-btn").addEventListener("click", () => {
      localStorage.setItem(WELCOME_SEEN_KEY, "1");
      this.state.showWelcome = false;
      this.render();
    });
  }

  renderHomeMenu(container) {
    const user = this.state.currentUser;
    const quote = DAILY_QUOTES[new Date().getDate() % DAILY_QUOTES.length];
    const latestMood = this.state.moodEntries[0];

    const menuCards = [
      {
        id: "timer",
        title: "Таймер медитации",
        desc: "Спокойная музыка, плавная абстрактная анимация дыхания и гибкий таймер.",
        meta: `Пройдено практик: ${this.state.sessions.length}`,
        icon: icons.timer,
        bg: "#EAF1F8",
        color: "#537394",
      },
      {
        id: "mood",
        title: "Анализ настроения",
        desc: "Шкала эмоций, личный дневник дня, благодарность и график динамики.",
        meta: latestMood ? `Последняя отметка: ${latestMood.score}/10` : "Отметьте настроение сегодня",
        icon: icons.mood,
        bg: "#F9EDF0",
        color: "#A86670",
      },
      {
        id: "schedule",
        title: "График медитаций",
        desc: "Календарь практик, расписание по дням недели и мягкий будильник-напоминание.",
        meta: this.getNextAlarmLabel(),
        icon: icons.calendar,
        bg: "#EDF0F8",
        color: "#5B6D94",
      },
      {
        id: "places",
        title: "Места медитаций",
        desc: "Интерактивная карта тихих парков и садов города с отзывами других людей.",
        meta: `Локаций на карте: ${10 + this.state.customPlaces.length}`,
        icon: icons.map,
        bg: "#F7EEF2",
        color: "#9A6274",
      },
      {
        id: "community",
        title: "Сообщество",
        desc: "Живой чат с участниками, популярные статьи, блогеры по йоге и ваш аккаунт.",
        meta: `Сообщений в чате: ${this.state.chatMessages.length}`,
        icon: icons.community,
        bg: "#E9F2F7",
        color: "#527B96",
      },
    ];

    container.innerHTML = `
      <div class="hero-banner">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:14px;">
          <div>
            <h1 class="hero-greeting">
              ${user ? `Здравствуйте, ${user.name}!` : 'Добро пожаловать в <span class="logo-font" style="font-size:26px;">ZENTEAM</span>'}
            </h1>
            <p class="hero-quote">«${quote}»</p>
          </div>
          <button class="glass-pill" id="hero-quick-start">
            ${icons.play} Быстрая медитация · 5 мин
          </button>
        </div>

        <div class="hero-stats">
          <div class="hero-stat-pill">🧘 <strong>${this.getTotalMinutes()}</strong> мин практики</div>
          <div class="hero-stat-pill">📓 <strong>${this.state.moodEntries.length}</strong> записей в дневнике</div>
          <div class="hero-stat-pill">🔔 <strong>${this.state.scheduleItems.filter((s) => s.alarm_enabled).length}</strong> активных будильников</div>
        </div>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
        <h2 style="font-family:var(--font-serif); font-size:28px; margin:0;">Разделы приложения</h2>
        <button class="btn btn-ghost btn-sm" id="replay-welcome-btn">Экран приветствия</button>
      </div>

      <div class="menu-list">
        ${menuCards
          .map(
            (card) => `
          <button class="menu-card" data-open="${card.id}">
            <div class="menu-card-icon" style="background:${card.bg}; color:${card.color};">
              ${card.icon}
            </div>
            <div style="min-width:0; flex:1;">
              <h3 class="menu-card-title">${card.title}</h3>
              <p class="menu-card-desc">${card.desc}</p>
              <div class="menu-card-meta">${card.meta}</div>
            </div>
            <div class="menu-card-arrow">${icons.chevronRight}</div>
          </button>
        `
          )
          .join("")}
      </div>
    `;

    container.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => this.navigate(btn.dataset.open));
    });

    container.querySelector("#hero-quick-start").addEventListener("click", () => {
      this.startMeditation({ minutes: 5, soundscape: "bowls", breathing: "calm" });
    });

    container.querySelector("#replay-welcome-btn").addEventListener("click", () => {
      this.state.showWelcome = true;
      this.render();
    });
  }
}

const app = new ZenTeamApp();
window.__zenteam = app;
app.init();
