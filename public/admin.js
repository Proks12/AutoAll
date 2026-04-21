const API = "http://localhost:3000";
const THEME_KEY = "theme-preference";

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("Service Worker registrovan:", registration.scope);
  } catch (error) {
    console.error("Registrace Service Workeru selhala:", error);
  }
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function getTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

function applyTheme(theme) {
  document.body?.setAttribute("data-theme", theme);
  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  }
}

function setupThemeToggle() {
  applyTheme(getTheme());
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const nextTheme = getTheme() === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

const user = getUser();
if (!user || user.role !== "admin") {
  alert("Pristup zakazan - nejsi admin");
  location.href = "index.html";
}

async function loadStats() {
  const r = await fetch(API + "/admin/stats");
  const d = await r.json();
  document.getElementById("userCount").textContent = d.users;
  document.getElementById("postCount").textContent = d.posts;
  document.getElementById("pendingSuggestions").textContent = d.pendingSuggestions;
}

async function loadUsers() {
  const r = await fetch(API + "/admin/users");
  const users = await r.json();

  document.getElementById("users").innerHTML = users.map((u) => `
    <div class="flex items-center justify-between gap-3 border-b border-white/10 p-4 last:border-b-0">
      <div>
        <div class="display-font text-lg font-bold text-slate-900">${u.username}</div>
        <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Role uzivatele</div>
      </div>
      <select class="select-surface max-w-[140px] px-3 py-2" data-id="${u.id}">
        <option value="user" ${u.role === "user" ? "selected" : ""}>user</option>
        <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
      </select>
    </div>
  `).join("");

  document.querySelectorAll("#users select[data-id]").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const id = sel.getAttribute("data-id");
      const role = sel.value;
      await fetch(API + "/admin/users/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
    });
  });
}

async function loadLastPosts() {
  const r = await fetch(API + "/admin/posts");
  const posts = await r.json();

  document.getElementById("posts").innerHTML = posts.map((p) => `
    <div class="flex items-center justify-between gap-4 border-b border-white/10 p-4 last:border-b-0">
      <span class="text-slate-700"><strong class="text-slate-900">${p.username}:</strong> ${p.text}</span>
      <button class="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-400/20" data-delpost="${p.id}">Smazat</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-delpost]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delpost");
      await fetch(API + "/posts/" + id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: "admin" })
      });
      await loadLastPosts();
      await loadStats();
    });
  });
}

async function loadSuggestions() {
  const r = await fetch(API + "/admin/car-suggestions");
  const suggestions = await r.json();
  const container = document.getElementById("suggestions");

  if (!suggestions.length) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-400">
        Zatim neprisel zadny navrh na nove auto.
      </div>
    `;
    return;
  }

  const statusLabel = {
    pending: "Ceka na rozhodnuti",
    approved: "Schvaleno",
    rejected: "Zamitnuto"
  };

  const statusClass = {
    pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    approved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    rejected: "border-rose-400/30 bg-rose-400/10 text-rose-200"
  };

  container.innerHTML = suggestions.map((item) => `
    <div class="border-b border-white/10 p-5 last:border-b-0">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-3">
            <div class="display-font text-2xl font-bold text-slate-900">${item.name}</div>
            <span class="rounded-full border px-3 py-1 text-xs ${statusClass[item.status]}">${statusLabel[item.status]}</span>
          </div>
          <div class="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <div><span class="text-slate-500">Uzivatel:</span> ${item.username}</div>
            <div><span class="text-slate-500">Motor:</span> ${item.engine}</div>
            <div><span class="text-slate-500">Spotreba:</span> ${item.consumption}</div>
            <div><span class="text-slate-500">Roky:</span> ${item.years}</div>
          </div>
          <div class="text-sm text-slate-700 break-all"><span class="text-slate-500">Obrazek:</span> ${item.image}</div>
          ${item.note ? `<div class="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700"><span class="text-slate-500">Poznamka:</span> ${item.note}</div>` : ""}
        </div>
        <div class="flex shrink-0 flex-col gap-2">
          ${item.status === "pending" ? `
            <button class="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/25" data-approve="${item.id}">Schvalit</button>
            <button class="rounded-full bg-rose-400/15 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/25" data-reject="${item.id}">Zamitnout</button>
          ` : ""}
        </div>
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-approve]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-approve");
      const r = await fetch(API + `/admin/car-suggestions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: "admin" })
      });

      if (!r.ok) {
        const error = await r.json();
        alert(typeof error === "string" ? error : "Navrh se nepodarilo schvalit.");
        return;
      }

      await loadSuggestions();
      await loadCars();
      await loadStats();
    });
  });

  container.querySelectorAll("[data-reject]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-reject");
      const r = await fetch(API + `/admin/car-suggestions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: "admin" })
      });

      if (!r.ok) {
        const error = await r.json();
        alert(typeof error === "string" ? error : "Navrh se nepodarilo zamitnout.");
        return;
      }

      await loadSuggestions();
      await loadStats();
    });
  });
}

async function loadCars() {
  const r = await fetch(API + "/cars");
  const cars = await r.json();

  document.getElementById("carsList").innerHTML = cars.map((c) => `
    <div class="flex items-center justify-between gap-4 border-b border-white/10 p-4 last:border-b-0">
      <div>
        <div class="display-font text-lg font-bold text-slate-900">${c.name}</div>
        <div class="text-sm text-slate-400">${c.engine} • ${c.consumption} • ${c.years}</div>
      </div>
      <button class="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-400/20" data-delcar="${c.id}">Smazat</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-delcar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delcar");
      await fetch(API + "/cars/" + id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: "admin" })
      });
      await loadCars();
    });
  });
}

async function addCar() {
  const name = document.getElementById("carName").value.trim();
  const engine = document.getElementById("carEngine").value.trim();
  const consumption = document.getElementById("carConsumption").value.trim();
  const years = document.getElementById("carYears").value.trim();
  const image = document.getElementById("carImage").value.trim();

  if (!name || !engine || !consumption || !years || !image) {
    alert("Vypln vsechny udaje.");
    return;
  }

  const r = await fetch(API + "/cars", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userRole: "admin", name, engine, consumption, years, image })
  });

  if (!r.ok) {
    alert("Chyba pri pridani auta.");
    return;
  }

  document.getElementById("carName").value = "";
  document.getElementById("carEngine").value = "";
  document.getElementById("carConsumption").value = "";
  document.getElementById("carYears").value = "";
  document.getElementById("carImage").value = "";

  await loadCars();
}

document.addEventListener("DOMContentLoaded", async () => {
  setupThemeToggle();
  await registerServiceWorker();
  document.getElementById("addCarBtn").addEventListener("click", addCar);

  await loadStats();
  await loadUsers();
  await loadSuggestions();
  await loadLastPosts();
  await loadCars();
});
