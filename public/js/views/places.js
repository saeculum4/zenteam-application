// Tab 4: Interactive Meditation Places Map (Leaflet + SVG Fallback), Spot Details & User Reviews

import { BUILTIN_PLACES, CITIES } from "../data.js";
import { icons } from "../icons.js";

let leafletMap = null;
let leafletMarkers = [];

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderStars(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

function getAllPlaces(app) {
  const custom = (app.state.customPlaces || []).map((p) => ({
    ...p,
    categoryLabel:
      p.category === "garden" ? "Ботанический сад" : p.category === "water" ? "У воды" : "Парк / сквер",
    gradient: "linear-gradient(135deg, #6d8eae, #a2bad0)",
    emoji: "📍",
    isCustom: true,
  }));
  return [...custom, ...BUILTIN_PLACES];
}

function getPlaceReviews(app, placeId) {
  return (app.state.placeReviews || []).filter((r) => r.place_id === placeId);
}

function getAvgRating(reviews) {
  if (!reviews.length) return 5.0;
  return reviews.reduce((s, r) => s + Number(r.rating || 5), 0) / reviews.length;
}

export function destroyPlacesMap() {
  if (leafletMap) {
    try {
      leafletMap.remove();
    } catch {
      // ignore
    }
    leafletMap = null;
    leafletMarkers = [];
  }
}

export function renderPlacesView(container, app) {
  destroyPlacesMap();
  const ui = app.state.placesUi;
  const allPlaces = getAllPlaces(app);
  const cityPlaces = allPlaces.filter((p) => p.city === ui.city);
  const filteredPlaces =
    ui.category === "all" ? cityPlaces : cityPlaces.filter((p) => p.category === ui.category);

  let selectedPlace = filteredPlaces.find((p) => p.id === ui.selectedId) || filteredPlaces[0] || null;
  if (selectedPlace) ui.selectedId = selectedPlace.id;

  const selectedReviews = selectedPlace ? getPlaceReviews(app, selectedPlace.id) : [];
  const selectedAvg = selectedPlace ? getAvgRating(selectedReviews).toFixed(1) : "5.0";

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Места для медитаций</h1>
        <p class="page-subtitle">Тихие парки, сады и набережные города с отзывами участников ZenTeam.</p>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="add-place-btn">${icons.plus} Добавить место</button>
      </div>
    </div>

    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:16px;">
      <div class="chip-row">
        ${Object.values(CITIES)
          .map(
            (c) => `
          <button class="chip ${ui.city === c.id ? "active" : ""}" data-city="${c.id}">
            ${c.name}
          </button>
        `
          )
          .join("")}
      </div>

      <div class="chip-row">
        <button class="chip ${ui.category === "all" ? "active" : ""}" data-cat="all">Все (${cityPlaces.length})</button>
        <button class="chip ${ui.category === "park" ? "active" : ""}" data-cat="park">Парки</button>
        <button class="chip ${ui.category === "garden" ? "active" : ""}" data-cat="garden">Сады</button>
        <button class="chip ${ui.category === "water" ? "active" : ""}" data-cat="water">У воды</button>
      </div>
    </div>

    <div class="places-layout">
      <!-- Left Column: Interactive Map + Spot List -->
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div id="zen-map" class="map-container"></div>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">
          ${filteredPlaces
            .map((p) => {
              const revs = getPlaceReviews(app, p.id);
              const avg = getAvgRating(revs).toFixed(1);
              return `
                <div class="place-card ${selectedPlace?.id === p.id ? "active" : ""}" data-place-id="${p.id}">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px;">
                    <span style="font-size:18px;">${p.emoji || "🌿"}</span>
                    <span style="font-size:12px; font-weight:700; color:#b37a32;">★ ${avg} <span style="color:var(--text-muted); font-weight:500;">(${revs.length})</span></span>
                  </div>
                  <div style="font-weight:700; font-size:14.5px; margin-bottom:3px;">${escapeHtml(p.name)}</div>
                  <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(p.address || p.categoryLabel)}</div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>

      <!-- Right Column: Selected Spot Details & Reviews -->
      <div class="card">
        ${
          !selectedPlace
            ? `<p style="margin:0; color:var(--text-secondary);">Выберите место на карте, чтобы посмотреть описание и отзывы.</p>`
            : `
            <div class="place-banner" style="background:${selectedPlace.gradient};">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                <span style="font-size:12px; font-weight:700; background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:999px;">
                  ${escapeHtml(selectedPlace.categoryLabel || "Тихое место")}
                </span>
                <span style="font-size:13.5px; font-weight:700;">★ ${selectedAvg} (${selectedReviews.length})</span>
              </div>
              <h2 style="font-family:var(--font-serif); font-size:28px; margin:0 0 6px; line-height:1.15;">
                ${selectedPlace.emoji || "🌿"} ${escapeHtml(selectedPlace.name)}
              </h2>
              <div style="font-size:13px; opacity:0.92;">📍 ${escapeHtml(selectedPlace.address || "На карте города")}</div>
            </div>

            <p style="margin:0 0 12px; font-size:14.5px; color:var(--text-primary);">${escapeHtml(selectedPlace.description)}</p>

            <div style="font-size:13px; color:var(--accent-hover); background:var(--bg-sage-soft); padding:10px 13px; border-radius:12px; margin-bottom:12px;">
              🕒 <strong>Лучшее время:</strong> ${escapeHtml(selectedPlace.best_time || "Утренние часы")}
            </div>

            <div class="chip-row" style="margin-bottom:16px;">
              ${(selectedPlace.tags || [])
                .map((t) => `<span class="badge" style="font-size:12px;">#${escapeHtml(t)}</span>`)
                .join("")}
            </div>

            <button class="btn btn-secondary btn-block btn-sm" id="meditate-here-btn" style="margin-bottom:18px;">
              ${icons.timer} Запустить медитацию в этом месте
            </button>

            <div class="divider"></div>

            <div class="card-title" style="font-size:15.5px; margin-bottom:10px;">
              Отзывы людей (${selectedReviews.length})
            </div>

            <form id="review-form" style="margin-bottom:16px; padding:14px; background:var(--bg-surface-soft); border-radius:16px; border:1px solid var(--border);">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                <span style="font-size:13px; font-weight:700;">Оставить свой отзыв</span>
                <div id="star-picker" style="display:flex; gap:3px;">
                  ${[1, 2, 3, 4, 5]
                    .map(
                      (n) => `
                    <button
                      type="button"
                      data-star="${n}"
                      style="border:none; background:none; font-size:20px; padding:0 2px; color:${n <= ui.draftRating ? "#d69648" : "#cfd6d2"};"
                    >★</button>
                  `
                    )
                    .join("")}
                </div>
              </div>
              <textarea
                id="review-comment-input"
                class="textarea"
                style="min-height:68px; margin-bottom:8px; background:#fff;"
                placeholder="Как вам тишина и атмосфера в этом месте?"
                required
              ></textarea>
              <button type="submit" class="btn btn-primary btn-sm">Опубликовать отзыв</button>
            </form>

            ${
              selectedReviews.length === 0
                ? `<p style="margin:0; font-size:13.5px; color:var(--text-muted);">Пока нет отзывов. Станьте первым, кто поделится впечатлением!</p>`
                : `<div style="display:flex; flex-direction:column; gap:10px; max-height:280px; overflow-y:auto;">
                    ${selectedReviews
                      .map((r) => {
                        const dt = new Date(r.created_at);
                        return `
                          <div class="review-item">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:5px;">
                              <div style="display:flex; align-items:center; gap:7px; font-weight:700; font-size:13.5px;">
                                <span>${r.author_emoji || "🌿"}</span>
                                <span>${escapeHtml(r.author_name)}</span>
                              </div>
                              <span class="stars">${renderStars(r.rating)}</span>
                            </div>
                            <p style="margin:0 0 4px; font-size:13.5px; color:var(--text-primary);">${escapeHtml(r.comment)}</p>
                            <div style="font-size:11.5px; color:var(--text-muted);">
                              ${isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          </div>
                        `;
                      })
                      .join("")}
                  </div>`
            }
          `
        }
      </div>
    </div>
  `;

  // Initialize Leaflet Map (or clean SVG interactive fallback if Leaflet unavailable)
  const mapEl = container.querySelector("#zen-map");
  const cityMeta = CITIES[ui.city] || CITIES.moscow;

  function renderSvgFallbackMap() {
    destroyPlacesMap();
    const lats = filteredPlaces.map((p) => p.lat);
    const lngs = filteredPlaces.map((p) => p.lng);
    const minLat = Math.min(...lats, cityMeta.center[0] - 0.08);
    const maxLat = Math.max(...lats, cityMeta.center[0] + 0.08);
    const minLng = Math.min(...lngs, cityMeta.center[1] - 0.12);
    const maxLng = Math.max(...lngs, cityMeta.center[1] + 0.12);

    mapEl.innerHTML = `
      <div style="width:100%; height:100%; position:relative; background:radial-gradient(circle at 30% 30%, #eef4fa, #dde7f2); padding:16px;">
        <div style="font-size:12px; font-weight:700; color:var(--accent-hover); opacity:0.85;">Интерактивная схема (офлайн) · ${cityMeta.name}</div>
        ${filteredPlaces
          .map((p) => {
            const x = 12 + ((p.lng - minLng) / (maxLng - minLng || 1)) * 76;
            const y = 84 - ((p.lat - minLat) / (maxLat - minLat || 1)) * 68;
            return `
              <button
                data-svg-pin="${p.id}"
                title="${escapeHtml(p.name)}"
                style="position:absolute; left:${x.toFixed(1)}%; top:${y.toFixed(1)}%; transform:translate(-50%,-50%); border:none; background:none;"
              >
                <div class="zen-pin ${selectedPlace?.id === p.id ? "selected" : ""}">
                  <span class="zen-pin-inner">${p.emoji || "🌿"}</span>
                </div>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
    mapEl.querySelectorAll("[data-svg-pin]").forEach((btn) => {
      btn.addEventListener("click", () => {
        ui.selectedId = btn.dataset.svgPin;
        renderPlacesView(container, app);
      });
    });
  }

  if (window.L && mapEl) {
    leafletMap = window.L.map(mapEl, { zoomControl: true }).setView(
      selectedPlace ? [selectedPlace.lat, selectedPlace.lng] : cityMeta.center,
      selectedPlace ? 12 : cityMeta.zoom
    );
    leafletMap.attributionControl?.setPrefix(false);

    const tileLayer = window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(leafletMap);

    let tileErrors = 0;
    tileLayer.on("tileerror", () => {
      tileErrors += 1;
      if (tileErrors >= 4) {
        renderSvgFallbackMap();
      }
    });

    filteredPlaces.forEach((p) => {
      const isSelected = selectedPlace?.id === p.id;
      const pinIcon = window.L.divIcon({
        className: "",
        html: `<div class="zen-pin ${isSelected ? "selected" : ""}"><span class="zen-pin-inner">${p.emoji || "🌿"}</span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });
      const marker = window.L.marker([p.lat, p.lng], { icon: pinIcon }).addTo(leafletMap);
      marker.bindTooltip(p.name, { direction: "top", offset: [0, -28] });
      marker.on("click", () => {
        ui.selectedId = p.id;
        renderPlacesView(container, app);
      });
      leafletMarkers.push(marker);
    });

    setTimeout(() => {
      leafletMap?.invalidateSize();
    }, 120);
  } else if (mapEl) {
    renderSvgFallbackMap();
  }

  // Event listeners
  container.querySelectorAll("[data-city]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ui.city = btn.dataset.city;
      ui.selectedId = null;
      renderPlacesView(container, app);
    });
  });

  container.querySelectorAll("[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ui.category = btn.dataset.cat;
      ui.selectedId = null;
      renderPlacesView(container, app);
    });
  });

  container.querySelectorAll("[data-place-id]").forEach((el) => {
    el.addEventListener("click", () => {
      ui.selectedId = el.dataset.placeId;
      renderPlacesView(container, app);
    });
  });

  const medHereBtn = container.querySelector("#meditate-here-btn");
  if (medHereBtn) {
    medHereBtn.addEventListener("click", () => {
      app.navigate("timer");
      app.toast(`Отличный выбор: ${selectedPlace.name} 🌿`);
    });
  }

  container.querySelectorAll("[data-star]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ui.draftRating = Number(btn.dataset.star);
      container.querySelectorAll("[data-star]").forEach((s) => {
        s.style.color = Number(s.dataset.star) <= ui.draftRating ? "#d69648" : "#cfd6d2";
      });
    });
  });

  const reviewForm = container.querySelector("#review-form");
  if (reviewForm && selectedPlace) {
    reviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const comment = container.querySelector("#review-comment-input").value.trim();
      if (!comment) return;
      const user = app.state.currentUser;
      await app.addPlaceReview({
        place_id: selectedPlace.id,
        author_name: user ? user.name : "Гость ZenTeam",
        author_emoji: user ? user.avatar_emoji : "🌿",
        rating: ui.draftRating,
        comment,
      });
      ui.draftRating = 5;
      app.toast("Спасибо! Ваш отзыв добавлен 🌟");
      renderPlacesView(container, app);
    });
  }

  container.querySelector("#add-place-btn").addEventListener("click", () => {
    openAddPlaceModal(app, () => renderPlacesView(container, app));
  });
}

function openAddPlaceModal(app, onAdded) {
  const city = CITIES[app.state.placesUi.city] || CITIES.moscow;
  const jitterLat = (Math.random() - 0.5) * 0.04;
  const jitterLng = (Math.random() - 0.5) * 0.06;

  app.openModal(`
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
      <h2 style="font-family:var(--font-serif); font-size:28px; margin:0;">Добавить тихое место</h2>
      <button class="icon-btn" id="modal-close-btn">${icons.close}</button>
    </div>
    <p style="margin:0 0 16px; font-size:13.5px; color:var(--text-secondary);">
      Поделитесь любимым парком, набережной или сквером в городе <strong>${city.name}</strong>.
    </p>
    <form id="add-place-form">
      <div class="field-group">
        <label class="field-label">Название места</label>
        <input id="np-name" class="input" placeholder="Например: Сиреневый сад в Сокольниках" required />
      </div>
      <div class="grid-2" style="gap:10px;">
        <div class="field-group">
          <label class="field-label">Категория</label>
          <select id="np-cat" class="select">
            <option value="park">Парк / сквер</option>
            <option value="garden">Ботанический сад</option>
            <option value="water">У воды</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Лучшее время</label>
          <input id="np-time" class="input" value="Утро 7:30–10:00" />
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Адрес или ориентир</label>
        <input id="np-address" class="input" placeholder="Улица, вход в парк или метро" />
      </div>
      <div class="field-group">
        <label class="field-label">Описание атмосферы</label>
        <textarea id="np-desc" class="textarea" placeholder="Почему здесь приятно медитировать?" required></textarea>
      </div>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button type="button" class="btn btn-ghost" id="modal-cancel-btn">Отмена</button>
        <button type="submit" class="btn btn-primary">Добавить на карту</button>
      </div>
    </form>
  `);

  document.getElementById("modal-close-btn")?.addEventListener("click", () => app.closeModal());
  document.getElementById("modal-cancel-btn")?.addEventListener("click", () => app.closeModal());

  document.getElementById("add-place-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const created = await app.addCustomPlace({
      city: city.id,
      name: document.getElementById("np-name").value.trim(),
      category: document.getElementById("np-cat").value,
      best_time: document.getElementById("np-time").value.trim(),
      address: document.getElementById("np-address").value.trim(),
      description: document.getElementById("np-desc").value.trim(),
      lat: Number((city.center[0] + jitterLat).toFixed(5)),
      lng: Number((city.center[1] + jitterLng).toFixed(5)),
      tags: ["От сообщества", "Тишина"],
      author_name: app.state.currentUser?.name || "Участник ZenTeam",
    });
    app.state.placesUi.selectedId = created.id;
    app.closeModal();
    app.toast("Новое место добавлено на карту! 📍");
    onAdded();
  });
}
