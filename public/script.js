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

function setLoginUI() {
  const loginStatus = document.getElementById("loginStatus");
  const adminLink = document.getElementById("adminLink");
  const user = getUser();

  if (adminLink) {
    adminLink.classList.toggle("hidden", !(user && user.role === "admin"));
  }

  if (!loginStatus) return;

  if (user) {
    loginStatus.textContent = `Odhlasit (${user.username})`;
    loginStatus.href = "#";
    loginStatus.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem("user");
      location.href = "index.html";
    };
  } else {
    loginStatus.textContent = "Prihlasit se";
    loginStatus.href = "login.html";
    loginStatus.onclick = null;
  }
}

function setMessage(el, message, type = "error", extraClasses = "") {
  if (!el) return;

  el.textContent = message;
  el.className = `${extraClasses} rounded-2xl px-4 py-3 text-sm`;
  if (type === "success") {
    el.classList.add("border", "border-emerald-300", "bg-emerald-50", "text-emerald-700");
  } else {
    el.classList.add("border", "border-rose-300", "bg-rose-50", "text-rose-700");
  }
}

function showLoginMessage(message, type = "error") {
  setMessage(document.getElementById("loginMessage"), message, type);
}

function showSuggestionMessage(message, type = "error") {
  setMessage(document.getElementById("suggestMessage"), message, type, "mt-4");
}

function showRatingMessage(message, type = "error") {
  setMessage(document.getElementById("ratingMessage"), message, type, "mt-4");
}

function renderStars(averageRating) {
  const rounded = Math.round(averageRating);
  return Array.from({ length: 5 }, (_, i) => (
    `<span class="${i < rounded ? "text-amber-500" : "text-slate-300"}">★</span>`
  )).join("");
}

async function authRequest(path, username, password) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await r.json();
  if (!r.ok) {
    throw new Error(typeof data === "string" ? data : "Autentizace se nezdarila");
  }

  localStorage.setItem("user", JSON.stringify(data));
  return data;
}

async function submitCarSuggestion(payload) {
  const r = await fetch(API + "/car-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await r.json();
  if (!r.ok) {
    throw new Error(typeof data === "string" ? data : "Navrh se nepodarilo odeslat");
  }

  return data;
}

async function fetchCars() {
  const r = await fetch(API + "/cars");
  if (!r.ok) throw new Error("Nepodarilo se nacist auta");
  return await r.json();
}

async function fetchCarById(id) {
  const r = await fetch(API + "/cars/" + id);
  if (!r.ok) return null;
  return await r.json();
}

async function fetchRating(carId) {
  const r = await fetch(API + `/cars/${carId}/rating`);
  if (!r.ok) throw new Error("Nepodarilo se nacist hodnoceni");
  return await r.json();
}

async function submitRating(carId, rating) {
  const user = getUser();
  if (!user) throw new Error("Pro hodnoceni se nejdriv prihlas.");

  const r = await fetch(API + `/cars/${carId}/rating`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id, rating })
  });

  const data = await r.json();
  if (!r.ok) {
    throw new Error(typeof data === "string" ? data : "Hodnoceni se nepodarilo ulozit");
  }

  return data;
}

async function fetchPosts(carId) {
  const r = await fetch(API + "/posts/" + carId);
  if (!r.ok) throw new Error("Nepodarilo se nacist prispevky");
  return await r.json();
}

async function addPost(carId, text) {
  const user = getUser();
  if (!user) throw new Error("Neprihlaseny uzivatel");

  const r = await fetch(API + "/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carId, userId: user.id, text })
  });

  if (!r.ok) throw new Error("Nepodarilo se pridat prispevek");
}

async function deletePost(postId) {
  const user = getUser();
  if (!user || user.role !== "admin") return;

  const r = await fetch(API + "/posts/" + postId, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userRole: user.role })
  });

  if (!r.ok) throw new Error("Nepodarilo se smazat prispevek");
}

document.addEventListener("DOMContentLoaded", async () => {
  await registerServiceWorker();
  setupThemeToggle();
  setLoginUI();

  const loginButton = document.getElementById("loginButton");
  const registerButton = document.getElementById("registerButton");
  const loginName = document.getElementById("loginName");
  const loginPassword = document.getElementById("loginPassword");

  if (loginButton && registerButton && loginName && loginPassword) {
    const handleAuth = async (path, successMessage) => {
      const username = loginName.value.trim();
      const password = loginPassword.value.trim();

      if (!username || !password) {
        showLoginMessage("Vypln uzivatelske jmeno i heslo.");
        return;
      }

      try {
        const user = await authRequest(path, username, password);
        showLoginMessage(successMessage, "success");

        window.setTimeout(() => {
          location.href = user.role === "admin" ? "admin.html" : "index.html";
        }, 500);
      } catch (e) {
        showLoginMessage(e.message);
      }
    };

    loginButton.addEventListener("click", async () => {
      await handleAuth("/login", "Prihlaseni probehlo uspesne.");
    });

    registerButton.addEventListener("click", async () => {
      await handleAuth("/register", "Registrace probehla uspesne.");
    });

    loginPassword.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        await handleAuth("/login", "Prihlaseni probehlo uspesne.");
      }
    });

    return;
  }

  const searchInput = document.getElementById("searchInput");
  const results = document.getElementById("results");
  if (searchInput && results) {
    let cars = [];
    try {
      cars = await fetchCars();
    } catch (e) {
      results.innerHTML = `<div class="glass-card col-span-full rounded-[1.75rem] p-8 text-center text-rose-200">Chyba: ${e.message}</div>`;
      return;
    }

    const suggestCarBtn = document.getElementById("suggestCarBtn");
    const suggestName = document.getElementById("suggestName");
    const suggestEngine = document.getElementById("suggestEngine");
    const suggestConsumption = document.getElementById("suggestConsumption");
    const suggestYears = document.getElementById("suggestYears");
    const suggestImage = document.getElementById("suggestImage");
    const suggestNote = document.getElementById("suggestNote");

    const renderCars = (filtered) => {
      if (!filtered.length) {
        results.innerHTML = `
          <div class="glass-card col-span-full rounded-[1.75rem] p-8 text-center">
            <div class="display-font text-2xl font-bold text-slate-900">Nic jsme nenasli</div>
            <p class="mt-2 text-slate-500">Zkus jiny nazev auta nebo uprav hledany vyraz.</p>
          </div>
        `;
        return;
      }

      results.innerHTML = filtered.map((car, index) => `
        <article class="glass-card fade-up overflow-hidden rounded-[1.75rem] p-4 text-left" style="animation-delay:${index * 70}ms">
          <div class="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100">
            <img src="${car.image}" alt="${car.name}" class="h-56 w-full object-cover transition duration-500 hover:scale-105">
          </div>
          <div class="mt-5 flex items-start justify-between gap-4">
            <div>
              <div class="text-xs uppercase tracking-[0.25em] text-sky-700">Model</div>
              <h3 class="display-font mt-2 text-2xl font-bold text-slate-900">${car.name}</h3>
            </div>
            <div class="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600">AutoAll</div>
          </div>
          <div class="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-white p-3">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Motor</div>
              <div class="mt-1 text-base font-semibold text-slate-900">${car.engine}</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-3">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Spotreba</div>
              <div class="mt-1 text-base font-semibold text-slate-900">${car.consumption}</div>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between gap-3">
            <div class="text-sm text-slate-400">Rok vyroby: ${car.years}</div>
            <a href="detail.html?id=${car.id}" class="shine-button primary px-5 py-3 text-sm">Detail</a>
          </div>
        </article>
      `).join("");
    };

    renderCars(cars);

    searchInput.addEventListener("input", () => {
      const term = searchInput.value.toLowerCase();
      const filtered = cars.filter((car) => car.name.toLowerCase().includes(term));
      renderCars(filtered);
    });

    if (suggestCarBtn) {
      suggestCarBtn.addEventListener("click", async () => {
        const user = getUser();
        if (!user) {
          showSuggestionMessage("Pro odeslani navrhu se nejdriv prihlas.");
          return;
        }

        const payload = {
          userId: user.id,
          name: suggestName.value.trim(),
          engine: suggestEngine.value.trim(),
          consumption: suggestConsumption.value.trim(),
          years: suggestYears.value.trim(),
          image: suggestImage.value.trim(),
          note: suggestNote.value.trim()
        };

        if (!payload.name || !payload.engine || !payload.consumption || !payload.years || !payload.image) {
          showSuggestionMessage("Vypln vsechny povinne udaje.");
          return;
        }

        try {
          await submitCarSuggestion(payload);
          showSuggestionMessage("Navrh byl odeslan adminovi ke schvaleni.", "success");
          suggestName.value = "";
          suggestEngine.value = "";
          suggestConsumption.value = "";
          suggestYears.value = "";
          suggestImage.value = "";
          suggestNote.value = "";
        } catch (e) {
          showSuggestionMessage(e.message);
        }
      });
    }

    return;
  }

  if (window.location.pathname.includes("detail.html")) {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get("id"), 10);
    const container = document.getElementById("detailContent");
    const ratingSection = document.getElementById("ratingSection");

    const car = await fetchCarById(id);
    if (!car) {
      container.textContent = "Auto nebylo nalezeno.";
      return;
    }

    container.innerHTML = `
      <div class="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div class="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100">
          <img src="${car.image}" alt="${car.name}" class="h-full min-h-[280px] w-full object-cover">
        </div>
        <div class="text-left">
          <div class="accent-pill mb-4">Detail modelu</div>
          <h2 class="display-font text-4xl font-bold text-slate-900 md:text-5xl">${car.name}</h2>
          <p class="mt-4 text-base leading-7 text-slate-700">
            Zakladni technicke informace k vozu na jednom miste. Pokud mas vlastni zkusenosti, muzes je hned sdilet ve foru.
          </p>
          <div class="mt-6 grid gap-3 sm:grid-cols-3">
            <div class="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-400">Motor</div>
              <div class="mt-2 font-semibold text-slate-900">${car.engine}</div>
            </div>
            <div class="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-400">Spotreba</div>
              <div class="mt-2 font-semibold text-slate-900">${car.consumption}</div>
            </div>
            <div class="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <div class="text-xs uppercase tracking-[0.2em] text-slate-400">Roky</div>
              <div class="mt-2 font-semibold text-slate-900">${car.years}</div>
            </div>
          </div>
          <a href="forum.html?id=${car.id}" class="shine-button primary mt-6 inline-flex">Prejit na forum</a>
        </div>
      </div>
    `;

    try {
      const rating = await fetchRating(id);
      const user = getUser();

      ratingSection.innerHTML = `
        <div class="glass-card rounded-[1.75rem] p-6">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div class="section-title text-slate-900">Hodnoceni auta</div>
              <div class="mt-3 flex items-center gap-3">
                <div class="text-3xl">${renderStars(Number(rating.averageRating || 0))}</div>
                <div>
                  <div class="display-font text-2xl font-bold text-slate-900">${rating.averageRating || 0}/5</div>
                  <div class="text-sm text-slate-400">Celkem hodnoceni: ${rating.ratingCount}</div>
                </div>
              </div>
            </div>
            <div class="w-full max-w-xl">
              <div class="text-sm text-slate-400">Ohodnot auto 1 az 5 hvezdami.</div>
              <div class="mt-3 flex flex-wrap gap-2">
                ${[1, 2, 3, 4, 5].map((star) => `
                  <button class="rating-star rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100" data-rating="${star}">
                    ${star} ★
                  </button>
                `).join("")}
              </div>
              <p id="ratingMessage" class="hidden mt-4 rounded-2xl px-4 py-3 text-sm"></p>
              <div class="mt-3 text-sm text-slate-500">${user ? "Tvoje hodnoceni se ulozi k tvemu uctu." : "Pro hodnoceni se prihlas do sveho uctu."}</div>
            </div>
          </div>
        </div>
      `;

      ratingSection.querySelectorAll(".rating-star").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const value = parseInt(btn.getAttribute("data-rating"), 10);

          try {
            const updated = await submitRating(id, value);
            showRatingMessage(`Hodnoceni ${value}★ bylo ulozeno. Aktualni prumer je ${updated.averageRating}/5.`, "success");
            ratingSection.querySelector(".display-font.text-2xl").textContent = `${updated.averageRating || 0}/5`;
            ratingSection.querySelector(".text-sm.text-slate-400").textContent = `Celkem hodnoceni: ${updated.ratingCount}`;
            ratingSection.querySelector(".text-3xl").innerHTML = renderStars(Number(updated.averageRating || 0));
          } catch (e) {
            showRatingMessage(e.message);
          }
        });
      });
    } catch (e) {
      ratingSection.innerHTML = `<div class="glass-card rounded-[1.75rem] p-6 text-rose-200">${e.message}</div>`;
    }

    return;
  }

  if (window.location.pathname.includes("forum.html")) {
    const params = new URLSearchParams(window.location.search);
    const carId = parseInt(params.get("id"), 10);

    const forumPosts = document.getElementById("forumPosts");
    const newPost = document.getElementById("newPost");
    const addPostBtn = document.getElementById("addPost");
    const header = document.getElementById("forumHeader");

    const car = await fetchCarById(carId);
    if (car && header) header.textContent = `Forum - ${car.name}`;

    const renderPosts = async () => {
      const user = getUser();
      const posts = await fetchPosts(carId);

      if (!posts.length) {
        forumPosts.innerHTML = `
          <div class="glass-card rounded-[1.5rem] p-8 text-center">
            <div class="display-font text-2xl font-bold text-slate-900">Forum je zatim prazdne</div>
            <p class="mt-2 text-slate-500">Bud prvni, kdo prida uzitecnou zkusenost k tomuto modelu.</p>
          </div>
        `;
        return;
      }

      forumPosts.innerHTML = posts.map((post, index) => `
        <article class="glass-card fade-up rounded-[1.5rem] p-5" style="animation-delay:${index * 60}ms">
          <div class="mb-3 flex items-center justify-between gap-4">
            <div>
              <div class="text-xs uppercase tracking-[0.22em] text-slate-500">Uzivatel</div>
              <span class="display-font text-xl font-bold text-slate-900">${post.username}</span>
            </div>
            ${user?.role === "admin"
              ? `<button class="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-400/20" data-del="${post.id}">Smazat</button>`
              : ""
            }
          </div>
          <p class="text-base leading-7 text-slate-700">${post.text}</p>
        </article>
      `).join("");

      if (user?.role === "admin") {
        forumPosts.querySelectorAll("[data-del]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            await deletePost(parseInt(btn.getAttribute("data-del"), 10));
            await renderPosts();
          });
        });
      }
    };

    await renderPosts();

    addPostBtn.addEventListener("click", async () => {
      const user = getUser();
      if (!user) return alert("Nejdriv se prihlas.");

      const text = newPost.value.trim();
      if (!text) return;

      await addPost(carId, text);
      newPost.value = "";
      await renderPosts();
    });
  }
});
