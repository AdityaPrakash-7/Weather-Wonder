
// --- Replace with your OpenWeather API key ---
const weatherApiKey = "73e5c40881013f4bfb9206eb2ea897b2"; 
// ---------------------------------------------

async function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  const resultBox = document.getElementById("weatherResult");

  if (!city) {
    resultBox.innerHTML = "<p style='color: red;'>Please enter a city name.</p>";
    return;
  }

  // Show a lightweight loader
  resultBox.innerHTML = `<p>Loading weather & monuments…</p>`;

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("City not found. Please check the name.");
      } else {
        throw new Error("Something went wrong. Try again later.");
      }
    }

    const data = await response.json();
    const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

    // Fetch monuments from Wikipedia (top matches for "<city> monuments" and "<city> landmarks")
    const monuments = await getMonumentsForCity(data.name);

    const weatherMarkup = `
      <div class="topline">
        <div class="cityname">${data.name}, ${data.sys?.country ?? ""}</div>
        <img src="${iconUrl}" alt="weather icon" class="weather-icon" />
        <div class="temp">${Math.round(data.main.temp)}°C</div>
      </div>
      <div class="meta">
        <span>Condition: <strong>${capitalize(data.weather[0].description)}</strong></span>
        <span>Humidity: <strong>${data.main.humidity}%</strong></span>
        <span>Wind: <strong>${data.wind.speed} m/s</strong></span>
      </div>

      <h3 style="margin-top:18px;">Famous Monuments & Landmarks</h3>
      <div class="monuments">
        ${monuments}
      </div>
    `;

    resultBox.innerHTML = weatherMarkup;

    // retrigger fade animation
    resultBox.style.animation = "none";
    // force reflow
    void resultBox.offsetWidth;
    resultBox.style.animation = "fadeUp 0.6s forwards";

  } catch (error) {
    console.error(error);
    resultBox.innerHTML = `<p style="color: red;">${error.message}</p>`;
  }
}

/**
 * Get monuments for a city from Wikipedia:
 * 1) Search "<city> monuments" and "<city> landmarks"
 * 2) For top results, fetch page summaries (image + extract)
 */
async function getMonumentsForCity(city) {
  const q1 = `${city} monuments`;
  const q2 = `${city} landmarks`;

  // Helper: search query -> titles
  async function wikiSearch(query) {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    return (data?.query?.search ?? []).map(item => item.title);
  }

  // Helper: title -> summary (image + extract)
  async function wikiSummary(title) {
    const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(sumUrl);
    if (!res.ok) throw new Error("Summary fetch failed");
    return res.json();
  }

  try {
    const [t1, t2] = await Promise.all([wikiSearch(q1), wikiSearch(q2)]);
    // Merge & dedupe titles, keep first 5 unique
    const titles = Array.from(new Set([...t1, ...t2])).slice(0, 5);

    if (titles.length === 0) {
      return `<p>No monument information available.</p>`;
    }

    const cards = [];
    for (const title of titles) {
      try {
        const page = await wikiSummary(title);
        const img = page?.thumbnail?.source || "https://source.unsplash.com/600x400/?monument,landmark";
        const extract = page?.extract || "No description available.";
        const url = page?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

        cards.push(`
          <div class="monument-card">
            <img src="${img}" alt="${escapeHtml(page?.title || title)}" loading="lazy">
            <div class="content">
              <h4>${escapeHtml(page?.title || title)}</h4>
              <p>${escapeHtml(extract)}</p>
              <a href="${url}" target="_blank" rel="noopener">Read more</a>
            </div>
          </div>
        `);
      } catch {
        // skip failed summaries silently
      }
    }

    return cards.join("") || `<p>No monument information available.</p>`;
  } catch (e) {
    console.error("Wikipedia error:", e);
    return `<p>Could not fetch monuments.</p>`;
  }
}

/* Utilities */
function goHome() { window.location.reload(); }
function clearResult() {
  document.getElementById("cityInput").value = "";
  document.getElementById("weatherResult").innerHTML = "";
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Modals */
function openAbout() { document.getElementById("aboutModal").style.display = "flex"; }
function closeAbout() { document.getElementById("aboutModal").style.display = "none"; }
function openContact() { document.getElementById("contactModal").style.display = "flex"; }
function closeContact() { document.getElementById("contactModal").style.display = "none"; }
window.addEventListener("click", (e) => {
  const about = document.getElementById("aboutModal");
  const contact = document.getElementById("contactModal");
  if (e.target === about) about.style.display = "none";
  if (e.target === contact) contact.style.display = "none";
});