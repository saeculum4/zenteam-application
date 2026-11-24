#!/usr/bin/env python3
"""
ZenTeam — Meditation & Mindfulness Web/Mobile App Server
Zero-dependency Python 3 server with SQLite persistence and static file hosting.
Run: python server.py
"""

import json
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
DB_PATH = BASE_DIR / "zenteam.db"
PORT = int(os.environ.get("PORT", "8080"))


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_db()
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            handle TEXT UNIQUE NOT NULL,
            email TEXT DEFAULT '',
            bio TEXT DEFAULT '',
            level TEXT DEFAULT 'Новичок',
            goal TEXT DEFAULT 'Снижение стресса и спокойствие',
            avatar_emoji TEXT DEFAULT '🧘',
            avatar_color TEXT DEFAULT '#6B8E7F',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            duration_minutes INTEGER NOT NULL,
            soundscape TEXT DEFAULT 'bowls',
            breathing TEXT DEFAULT 'calm',
            completed_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS mood_entries (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            score INTEGER NOT NULL,
            tags TEXT DEFAULT '[]',
            note TEXT DEFAULT '',
            gratitude TEXT DEFAULT '',
            entry_date TEXT NOT NULL,
            entry_time TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS schedule_items (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            time_str TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            repeat_mode TEXT DEFAULT 'once',
            specific_date TEXT DEFAULT '',
            weekdays TEXT DEFAULT '[]',
            alarm_enabled INTEGER DEFAULT 1,
            completed_dates TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS custom_places (
            id TEXT PRIMARY KEY,
            city TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            address TEXT DEFAULT '',
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            description TEXT DEFAULT '',
            best_time TEXT DEFAULT 'Утро 7:00–10:00',
            tags TEXT DEFAULT '[]',
            author_name TEXT DEFAULT 'Участник ZenTeam',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS place_reviews (
            id TEXT PRIMARY KEY,
            place_id TEXT NOT NULL,
            author_name TEXT NOT NULL,
            author_emoji TEXT DEFAULT '🌿',
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            channel TEXT NOT NULL,
            author_name TEXT NOT NULL,
            author_handle TEXT DEFAULT '',
            author_emoji TEXT DEFAULT '🧘',
            author_color TEXT DEFAULT '#6B8E7F',
            text TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
        """
    )

    # Seed starter chat messages if empty
    cur.execute("SELECT COUNT(*) as cnt FROM chat_messages")
    if cur.fetchone()["cnt"] == 0:
        starter_messages = [
            (
                "msg-1",
                "general",
                "Анна Соколова",
                "@anna_zen",
                "🌸",
                "#C98E6B",
                "Доброе утро всем! Сегодня впервые попробовала 15 минут с тибетскими чашами — голова стала такой ясной ✨",
                5,
                "2026-11-24T08:15:00+03:00",
            ),
            (
                "msg-2",
                "general",
                "Дмитрий Волков",
                "@dima_breath",
                "🌲",
                "#4F6F62",
                "Привет! Подскажите, кто-нибудь медитирует в Аптекарском огороде утром? Там правда тихо до 10 часов?",
                3,
                "2026-11-24T09:40:00+03:00",
            ),
            (
                "msg-3",
                "general",
                "Мария Лебедева",
                "@masha_yoga",
                "🪷",
                "#6A7B9C",
                "Да, Дмитрий! Особенно возле пруда в будни утром — идеальная тишина и пение птиц. Очень советую взять плед.",
                7,
                "2026-11-24T10:05:00+03:00",
            ),
            (
                "msg-4",
                "yoga",
                "Елена Кравцова",
                "@elena_flow",
                "☀️",
                "#B8865B",
                "Поделюсь наблюдением: 5 минут дыхания 4-7-8 перед сном реально помогают уснуть в два раза быстрее.",
                9,
                "2026-11-24T11:20:00+03:00",
            ),
            (
                "msg-5",
                "mindfulness",
                "Артём Орлов",
                "@artem_mind",
                "🌊",
                "#527988",
                "Веду дневник настроения уже 10 дней подряд — заметил, что настроение сильно растёт в дни, когда не пропускаю утреннюю практику.",
                6,
                "2026-11-24T12:10:00+03:00",
            ),
            (
                "msg-6",
                "beginners",
                "Ольга Морозова",
                "@olga_start",
                "🌱",
                "#75927B",
                "Всем привет! Я только начинаю, мысли постоянно разбегаются на 2-й минуте. Это нормально?",
                4,
                "2026-11-24T13:00:00+03:00",
            ),
            (
                "msg-7",
                "beginners",
                "Дмитрий Волков",
                "@dima_breath",
                "🌲",
                "#4F6F62",
                "Абсолютно нормально! Сам момент, когда ты замечаешь, что отвлеклась, и мягко возвращаешься к дыханию — и есть тренировка внимания 💛",
                11,
                "2026-11-24T13:12:00+03:00",
            ),
        ]
        cur.executemany(
            """
            INSERT INTO chat_messages (id, channel, author_name, author_handle, author_emoji, author_color, text, likes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            starter_messages,
        )

    # Seed starter reviews if empty
    cur.execute("SELECT COUNT(*) as cnt FROM place_reviews")
    if cur.fetchone()["cnt"] == 0:
        starter_reviews = [
            (
                "rev-1",
                "msk-aptekarsky",
                "Мария Л.",
                "🪷",
                5,
                "Невероятная атмосфера у пруда с карпами. Утром почти нет людей, воздух пахнет зеленью — идеально для 15-минутной практики.",
                "2026-11-20T09:15:00+03:00",
            ),
            (
                "rev-2",
                "msk-aptekarsky",
                "Игорь К.",
                "🌿",
                5,
                "Одно из самых спокойных мест в центре Москвы. Люблю приходить сюда после работы, чтобы перезагрузиться.",
                "2026-11-22T18:30:00+03:00",
            ),
            (
                "rev-3",
                "msk-neskuchny",
                "Анна С.",
                "🌸",
                5,
                "Глубокие тенистые аллеи, слышно только шелест листьев и птиц. Нашла уютную лавочку вдали от набережной.",
                "2026-11-19T11:00:00+03:00",
            ),
            (
                "rev-4",
                "msk-japanese",
                "Денис В.",
                "🎋",
                5,
                "Настоящий дзен! Каменный сад, журчание ручья и мостики мгновенно настраивают на внутреннюю тишину.",
                "2026-11-21T14:20:00+03:00",
            ),
            (
                "rev-5",
                "msk-serebryany",
                "Светлана Р.",
                "🌲",
                4,
                "Сосны и вид на воду потрясающие. Лучше приходить рано утром, пока на пляже совсем пусто.",
                "2026-11-18T08:45:00+03:00",
            ),
            (
                "rev-6",
                "spb-elagin",
                "Кирилл М.",
                "🌊",
                5,
                "На западной стрелке Елагина острова потрясающий закат и шум воды. Идеально для вечерней медитации.",
                "2026-11-21T19:10:00+03:00",
            ),
            (
                "rev-7",
                "spb-summer",
                "Екатерина П.",
                "🍃",
                5,
                "Классика Петербурга. В утренние часы аллеи пустынны и наполнены особым спокойствием.",
                "2026-11-23T09:05:00+03:00",
            ),
        ]
        cur.executemany(
            """
            INSERT INTO place_reviews (id, place_id, author_name, author_emoji, rating, comment, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            starter_reviews,
        )

    conn.commit()
    conn.close()


class ZenTeamHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def log_message(self, format: str, *args) -> None:
        # Clean concise log
        sys.stdout.write(f"[ZenTeam] {self.address_string()} - {format % args}\n")

    def send_json(self, payload, status: int = HTTPStatus.OK) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_get(parsed)
            return
        # Serve static files (SPA fallback to index.html for unknown non-asset paths)
        target = PUBLIC_DIR / parsed.path.lstrip("/")
        if parsed.path != "/" and not target.exists() and "." not in parsed.path.split("/")[-1]:
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_post(parsed)
            return
        self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_PATCH(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_patch(parsed)
            return
        self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_delete(parsed)
            return
        self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def handle_api_get(self, parsed) -> None:
        path = parsed.path
        qs = parse_qs(parsed.query)
        conn = get_db()
        cur = conn.cursor()
        try:
            if path == "/api/health":
                self.send_json({"status": "ok", "app": "ZenTeam"})
            elif path == "/api/bootstrap":
                # Return full state snapshot for snappy startup
                cur.execute("SELECT * FROM users ORDER BY created_at DESC")
                users = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM sessions ORDER BY completed_at DESC")
                sessions = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM mood_entries ORDER BY created_at DESC")
                moods = []
                for r in cur.fetchall():
                    d = dict(r)
                    d["tags"] = json.loads(d.get("tags") or "[]")
                    moods.append(d)
                cur.execute("SELECT * FROM schedule_items ORDER BY time_str ASC")
                schedules = []
                for r in cur.fetchall():
                    d = dict(r)
                    d["weekdays"] = json.loads(d.get("weekdays") or "[]")
                    d["completed_dates"] = json.loads(d.get("completed_dates") or "[]")
                    d["alarm_enabled"] = bool(d["alarm_enabled"])
                    schedules.append(d)
                cur.execute("SELECT * FROM custom_places ORDER BY created_at DESC")
                custom_places = []
                for r in cur.fetchall():
                    d = dict(r)
                    d["tags"] = json.loads(d.get("tags") or "[]")
                    custom_places.append(d)
                cur.execute("SELECT * FROM place_reviews ORDER BY created_at DESC")
                reviews = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT * FROM chat_messages ORDER BY created_at ASC")
                messages = [dict(r) for r in cur.fetchall()]
                self.send_json(
                    {
                        "users": users,
                        "sessions": sessions,
                        "mood_entries": moods,
                        "schedule_items": schedules,
                        "custom_places": custom_places,
                        "place_reviews": reviews,
                        "chat_messages": messages,
                    }
                )
            elif path == "/api/chat":
                channel = qs.get("channel", [None])[0]
                if channel:
                    cur.execute(
                        "SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at ASC",
                        (channel,),
                    )
                else:
                    cur.execute("SELECT * FROM chat_messages ORDER BY created_at ASC")
                self.send_json([dict(r) for r in cur.fetchall()])
            else:
                self.send_json({"error": "Endpoint not found"}, HTTPStatus.NOT_FOUND)
        finally:
            conn.close()

    def handle_api_post(self, parsed) -> None:
        path = parsed.path
        body = self.read_json_body()
        conn = get_db()
        cur = conn.cursor()
        try:
            if path == "/api/users":
                name = (body.get("name") or "").strip()
                handle = (body.get("handle") or "").strip()
                if not name:
                    self.send_json({"error": "Имя обязательно"}, HTTPStatus.BAD_REQUEST)
                    return
                if not handle:
                    handle = "@" + "".join(ch for ch in name.lower() if ch.isalnum())[:12] + str(uuid.uuid4().hex[:3])
                if not handle.startswith("@"):
                    handle = "@" + handle
                user_id = body.get("id") or f"usr-{uuid.uuid4().hex[:8]}"
                now = utc_now_iso()
                # Upsert by id or handle
                cur.execute("SELECT id FROM users WHERE id = ? OR handle = ?", (user_id, handle))
                existing = cur.fetchone()
                if existing:
                    user_id = existing["id"]
                    cur.execute(
                        """
                        UPDATE users
                        SET name=?, email=?, bio=?, level=?, goal=?, avatar_emoji=?, avatar_color=?
                        WHERE id=?
                        """,
                        (
                            name,
                            body.get("email", ""),
                            body.get("bio", ""),
                            body.get("level", "Новичок"),
                            body.get("goal", "Снижение стресса и спокойствие"),
                            body.get("avatar_emoji", "🧘"),
                            body.get("avatar_color", "#4F6F62"),
                            user_id,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO users (id, name, handle, email, bio, level, goal, avatar_emoji, avatar_color, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            user_id,
                            name,
                            handle,
                            body.get("email", ""),
                            body.get("bio", ""),
                            body.get("level", "Новичок"),
                            body.get("goal", "Снижение стресса и спокойствие"),
                            body.get("avatar_emoji", "🧘"),
                            body.get("avatar_color", "#4F6F62"),
                            now,
                        ),
                    )
                conn.commit()
                cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
                self.send_json(dict(cur.fetchone()), HTTPStatus.CREATED)

            elif path == "/api/sessions":
                sid = f"ses-{uuid.uuid4().hex[:8]}"
                now = body.get("completed_at") or utc_now_iso()
                cur.execute(
                    """
                    INSERT INTO sessions (id, user_id, duration_minutes, soundscape, breathing, completed_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        sid,
                        body.get("user_id", ""),
                        int(body.get("duration_minutes", 5)),
                        body.get("soundscape", "bowls"),
                        body.get("breathing", "calm"),
                        now,
                    ),
                )
                conn.commit()
                cur.execute("SELECT * FROM sessions WHERE id = ?", (sid,))
                self.send_json(dict(cur.fetchone()), HTTPStatus.CREATED)

            elif path == "/api/moods":
                mid = f"mood-{uuid.uuid4().hex[:8]}"
                now = utc_now_iso()
                score = max(1, min(10, int(body.get("score", 7))))
                tags = json.dumps(body.get("tags") or [], ensure_ascii=False)
                cur.execute(
                    """
                    INSERT INTO mood_entries (id, user_id, score, tags, note, gratitude, entry_date, entry_time, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        mid,
                        body.get("user_id", ""),
                        score,
                        tags,
                        (body.get("note") or "").strip(),
                        (body.get("gratitude") or "").strip(),
                        body.get("entry_date") or datetime.now().strftime("%Y-%m-%d"),
                        body.get("entry_time") or datetime.now().strftime("%H:%M"),
                        now,
                    ),
                )
                conn.commit()
                cur.execute("SELECT * FROM mood_entries WHERE id = ?", (mid,))
                row = dict(cur.fetchone())
                row["tags"] = json.loads(row["tags"])
                self.send_json(row, HTTPStatus.CREATED)

            elif path == "/api/schedules":
                scid = f"sch-{uuid.uuid4().hex[:8]}"
                now = utc_now_iso()
                cur.execute(
                    """
                    INSERT INTO schedule_items (id, user_id, title, time_str, duration_minutes, repeat_mode, specific_date, weekdays, alarm_enabled, completed_dates, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        scid,
                        body.get("user_id", ""),
                        (body.get("title") or "Медитация").strip(),
                        body.get("time_str") or "09:00",
                        int(body.get("duration_minutes", 15)),
                        body.get("repeat_mode", "once"),
                        body.get("specific_date", ""),
                        json.dumps(body.get("weekdays") or []),
                        1 if body.get("alarm_enabled", True) else 0,
                        json.dumps([]),
                        now,
                    ),
                )
                conn.commit()
                cur.execute("SELECT * FROM schedule_items WHERE id = ?", (scid,))
                row = dict(cur.fetchone())
                row["weekdays"] = json.loads(row["weekdays"])
                row["completed_dates"] = json.loads(row["completed_dates"])
                row["alarm_enabled"] = bool(row["alarm_enabled"])
                self.send_json(row, HTTPStatus.CREATED)

            elif path == "/api/places":
                pid = f"custom-{uuid.uuid4().hex[:8]}"
                now = utc_now_iso()
                name = (body.get("name") or "").strip()
                if not name:
                    self.send_json({"error": "Название места обязательно"}, HTTPStatus.BAD_REQUEST)
                    return
                cur.execute(
                    """
                    INSERT INTO custom_places (id, city, name, category, address, lat, lng, description, best_time, tags, author_name, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        pid,
                        body.get("city", "moscow"),
                        name,
                        body.get("category", "park"),
                        (body.get("address") or "").strip(),
                        float(body.get("lat", 55.7558)),
                        float(body.get("lng", 37.6173)),
                        (body.get("description") or "").strip(),
                        body.get("best_time", "Утро 7:00–10:00"),
                        json.dumps(body.get("tags") or ["Тишина", "Природа"], ensure_ascii=False),
                        body.get("author_name", "Участник ZenTeam"),
                        now,
                    ),
                )
                conn.commit()
                cur.execute("SELECT * FROM custom_places WHERE id = ?", (pid,))
                row = dict(cur.fetchone())
                row["tags"] = json.loads(row["tags"])
                self.send_json(row, HTTPStatus.CREATED)

            elif path == "/api/reviews":
                rid = f"rev-{uuid.uuid4().hex[:8]}"
                now = utc_now_iso()
                comment = (body.get("comment") or "").strip()
                if not comment:
                    self.send_json({"error": "Текст отзыва обязателен"}, HTTPStatus.BAD_REQUEST)
                    return
                cur.execute(
                    """
                    INSERT INTO place_reviews (id, place_id, author_name, author_emoji, rating, comment, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rid,
                        body.get("place_id", ""),
                        body.get("author_name", "Гость"),
                        body.get("author_emoji", "🌿"),
                        max(1, min(5, int(body.get("rating", 5)))),
                        comment,
                        now,
                    ),
                )
                conn.commit()
                cur.execute("SELECT * FROM place_reviews WHERE id = ?", (rid,))
                self.send_json(dict(cur.fetchone()), HTTPStatus.CREATED)

            elif path == "/api/chat":
                cid = f"msg-{uuid.uuid4().hex[:8]}"
                now = utc_now_iso()
                text = (body.get("text") or "").strip()
                if not text:
                    self.send_json({"error": "Сообщение пустое"}, HTTPStatus.BAD_REQUEST)
                    return
                cur.execute(
                    """
                    INSERT INTO chat_messages (id, channel, author_name, author_handle, author_emoji, author_color, text, likes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        cid,
                        body.get("channel", "general"),
                        body.get("author_name", "Гость"),
                        body.get("author_handle", "@guest"),
                        body.get("author_emoji", "🧘"),
                        body.get("author_color", "#4F6F62"),
                        text,
                        0,
                        now,
                    ),
                )
                conn.commit()
                cur.execute("SELECT * FROM chat_messages WHERE id = ?", (cid,))
                self.send_json(dict(cur.fetchone()), HTTPStatus.CREATED)

            elif path.startswith("/api/chat/") and path.endswith("/like"):
                msg_id = path.split("/")[3]
                cur.execute("UPDATE chat_messages SET likes = likes + 1 WHERE id = ?", (msg_id,))
                conn.commit()
                cur.execute("SELECT * FROM chat_messages WHERE id = ?", (msg_id,))
                row = cur.fetchone()
                if not row:
                    self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
                    return
                self.send_json(dict(row))

            else:
                self.send_json({"error": "Endpoint not found"}, HTTPStatus.NOT_FOUND)
        finally:
            conn.close()

    def handle_api_patch(self, parsed) -> None:
        path = parsed.path
        body = self.read_json_body()
        conn = get_db()
        cur = conn.cursor()
        try:
            if path.startswith("/api/schedules/"):
                scid = path.split("/")[3]
                cur.execute("SELECT * FROM schedule_items WHERE id = ?", (scid,))
                existing = cur.fetchone()
                if not existing:
                    self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
                    return
                alarm_enabled = (
                    1 if body["alarm_enabled"] else 0
                    if "alarm_enabled" in body
                    else existing["alarm_enabled"]
                )
                completed_dates = (
                    json.dumps(body["completed_dates"])
                    if "completed_dates" in body
                    else existing["completed_dates"]
                )
                cur.execute(
                    "UPDATE schedule_items SET alarm_enabled=?, completed_dates=? WHERE id=?",
                    (alarm_enabled, completed_dates, scid),
                )
                conn.commit()
                cur.execute("SELECT * FROM schedule_items WHERE id = ?", (scid,))
                row = dict(cur.fetchone())
                row["weekdays"] = json.loads(row["weekdays"])
                row["completed_dates"] = json.loads(row["completed_dates"])
                row["alarm_enabled"] = bool(row["alarm_enabled"])
                self.send_json(row)
            else:
                self.send_json({"error": "Endpoint not found"}, HTTPStatus.NOT_FOUND)
        finally:
            conn.close()

    def handle_api_delete(self, parsed) -> None:
        path = parsed.path
        conn = get_db()
        cur = conn.cursor()
        try:
            if path.startswith("/api/moods/"):
                mid = path.split("/")[3]
                cur.execute("DELETE FROM mood_entries WHERE id = ?", (mid,))
                conn.commit()
                self.send_json({"deleted": mid})
            elif path.startswith("/api/schedules/"):
                scid = path.split("/")[3]
                cur.execute("DELETE FROM schedule_items WHERE id = ?", (scid,))
                conn.commit()
                self.send_json({"deleted": scid})
            else:
                self.send_json({"error": "Endpoint not found"}, HTTPStatus.NOT_FOUND)
        finally:
            conn.close()


def main() -> None:
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ZenTeamHandler)
    print(f"ZenTeam server running at http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping ZenTeam server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
