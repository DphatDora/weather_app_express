"use strict";

const form = document.getElementById("weather-form");
const cityInput = document.getElementById("city");
const cityList = document.getElementById("city-list");
const resultEl = document.getElementById("result");
const errorEl = document.getElementById("error");

function show(el) {
  el.classList.remove("hidden");
}
function hide(el) {
  el.classList.add("hidden");
}

// Load cities list for autocomplete
async function loadCities() {
  try {
    const resp = await fetch("/api/cities");
    const data = await resp.json();
    if (data.cities) {
      data.cities.forEach((city) => {
        const option = document.createElement("option");
        option.value = city;
        cityList.appendChild(option);
      });
    }
  } catch (err) {
    console.warn("Failed to load cities list:", err);
  }
}

// Load cities on page load
loadCities();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  hide(errorEl);
  hide(resultEl);

  const start = performance.now();
  try {
    const resp = await fetch(`/weather?city=${encodeURIComponent(city)}`);
    const data = await resp.json();
    const end = performance.now();
    const clientMs = Math.round(end - start);

    if (!resp.ok) {
      errorEl.textContent = data?.message || "An error occurred";
      show(errorEl);
      return;
    }

    const blocks = [];
    blocks.push(`<div><strong>City:</strong> ${data.city}</div>`);
    blocks.push(
      `<div><strong>Temperature:</strong> ${data.temperature} °C</div>`
    );
    blocks.push(`<div><strong>Status:</strong> ${data.status}</div>`);
    blocks.push(`<div><strong>Response Time:</strong> ${clientMs} ms</div>`);
    blocks.push(
      `<div><strong>Cache Hit:</strong> ${data.cache?.hit ? "Yes" : "No"}</div>`
    );
    if (data.warning) {
      blocks.push(
        `<div class="warn"><strong>Warning:</strong> ${data.warning}</div>`
      );
    }

    resultEl.innerHTML = blocks.join("");
    show(resultEl);
  } catch (err) {
    errorEl.textContent = err?.message || "An error occurred";
    show(errorEl);
  }
});
