// Unified API client: talks to Python SQLite backend with seamless localStorage fallback

const LS_KEY = "zenteam_local_state_v1";

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    users: [],
    sessions: [],
    mood_entries: [],
    schedule_items: [],
    custom_places: [],
    place_reviews: [],
    chat_messages: [],
  };
}

function saveLocal(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      if (json.error) errText = json.error;
    } catch {
      // ignore
    }
    throw new Error(errText);
  }
  return res.json();
}

export const api = {
  online: true,

  async bootstrap() {
    try {
      const data = await request("/api/bootstrap");
      this.online = true;
      saveLocal(data);
      return data;
    } catch {
      this.online = false;
      return loadLocal();
    }
  },

  async saveUser(payload) {
    try {
      return await request("/api/users", { method: "POST", body: JSON.stringify(payload) });
    } catch {
      const local = loadLocal();
      const user = {
        id: payload.id || `usr-${Date.now()}`,
        name: payload.name,
        handle: payload.handle?.startsWith("@") ? payload.handle : `@${payload.handle || "zen"}`,
        email: payload.email || "",
        bio: payload.bio || "",
        level: payload.level || "Новичок",
        goal: payload.goal || "Снижение стресса",
        avatar_emoji: payload.avatar_emoji || "🧘",
        avatar_color: payload.avatar_color || "#4D6F61",
        created_at: new Date().toISOString(),
      };
      local.users = [user, ...local.users.filter((u) => u.id !== user.id)];
      saveLocal(local);
      return user;
    }
  },

  async createSession(payload) {
    try {
      return await request("/api/sessions", { method: "POST", body: JSON.stringify(payload) });
    } catch {
      const local = loadLocal();
      const item = { id: `ses-${Date.now()}`, completed_at: new Date().toISOString(), ...payload };
      local.sessions.unshift(item);
      saveLocal(local);
      return item;
    }
  },

  async createMood(payload) {
    try {
      return await request("/api/moods", { method: "POST", body: JSON.stringify(payload) });
    } catch {
      const local = loadLocal();
      const item = { id: `mood-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
      local.mood_entries.unshift(item);
      saveLocal(local);
      return item;
    }
  },

  async deleteMood(id) {
    try {
      return await request(`/api/moods/${id}`, { method: "DELETE" });
    } catch {
      const local = loadLocal();
      local.mood_entries = local.mood_entries.filter((m) => m.id !== id);
      saveLocal(local);
      return { deleted: id };
    }
  },

  async createSchedule(payload) {
    try {
      return await request("/api/schedules", { method: "POST", body: JSON.stringify(payload) });
    } catch {
      const local = loadLocal();
      const item = {
        id: `sch-${Date.now()}`,
        completed_dates: [],
        created_at: new Date().toISOString(),
        ...payload,
      };
      local.schedule_items.push(item);
      saveLocal(local);
      return item;
    }
  },

  async updateSchedule(id, patch) {
    try {
      return await request(`/api/schedules/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    } catch {
      const local = loadLocal();
      local.schedule_items = local.schedule_items.map((s) => (s.id === id ? { ...s, ...patch } : s));
      saveLocal(local);
      return local.schedule_items.find((s) => s.id === id);
    }
  },

  async deleteSchedule(id) {
    try {
      return await request(`/api/schedules/${id}`, { method: "DELETE" });
    } catch {
      const local = loadLocal();
      local.schedule_items = local.schedule_items.filter((s) => s.id !== id);
      saveLocal(local);
      return { deleted: id };
    }
  },

  async createPlace(payload) {
    try {
      return await request("/api/places", { method: "POST", body: JSON.stringify(payload) });
    } catch {
      const local = loadLocal();
      const item = { id: `custom-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
      local.custom_places.unshift(item);
      saveLocal(local);
      return item;
    }
  },

  async createReview(payload) {
    try {
      return await request("/api/reviews", { method: "POST", body: JSON.stringify(payload) });
    } catch {
      const local = loadLocal();
      const item = { id: `rev-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
      local.place_reviews.unshift(item);
      saveLocal(local);
      return item;
    }
  },

  async fetchChat() {
    try {
      return await request("/api/chat");
    } catch {
      return loadLocal().chat_messages;
    }
  },

  async postChat(payload) {
    try {
      return await request("/api/chat", { method: "POST", body: JSON.stringify(payload) });
    } catch {
      const local = loadLocal();
      const item = { id: `msg-${Date.now()}`, likes: 0, created_at: new Date().toISOString(), ...payload };
      local.chat_messages.push(item);
      saveLocal(local);
      return item;
    }
  },

  async likeChat(id) {
    try {
      return await request(`/api/chat/${id}/like`, { method: "POST" });
    } catch {
      const local = loadLocal();
      const msg = local.chat_messages.find((m) => m.id === id);
      if (msg) msg.likes = (msg.likes || 0) + 1;
      saveLocal(local);
      return msg;
    }
  },
};
