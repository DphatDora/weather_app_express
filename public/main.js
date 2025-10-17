"use strict";

const form = document.getElementById("weather-form");
const cityInput = document.getElementById("city");
const cityList = document.getElementById("city-list");
const resultEl = document.getElementById("result");
const messageEl = document.getElementById("message");

function show(el) {
  el.classList.remove("hidden");
}
function hide(el) {
  el.classList.add("hidden");
}

function showMessage(text, type = "error") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  show(messageEl);
}

function hideMessage() {
  hide(messageEl);
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

  // Cho phép submit ngay cả khi không nhập gì (server sẽ validate)
  hideMessage();
  hide(resultEl);

  const start = performance.now();
  try {
    const resp = await fetch(`/weather?city=${encodeURIComponent(city)}`);
    const data = await resp.json();
    const end = performance.now();
    const clientMs = Math.round(end - start);

    if (!resp.ok) {
      showMessage(data?.message || "An error occurred", "error");
      return;
    }

    // Hiển thị warning nếu có
    if (data.warning) {
      showMessage(data.warning, "warning");
    }

    // Hiển thị kết quả với style đẹp hơn
    const blocks = [];
    blocks.push(`<div><strong>City:</strong> ${data.city}</div>`);
    blocks.push(`<div class="temperature">${data.temperature}°C</div>`);
    blocks.push(`<div><strong>Status:</strong> ${data.status}</div>`);
    blocks.push(`<div><strong>Response Time:</strong> ${clientMs} ms</div>`);
    blocks.push(
      `<div><strong>Cache:</strong> ${
        data.cache?.hit ? "✓ Hit" : "✗ Miss"
      }</div>`
    );
    if (data.cache?.stale) {
      blocks.push(
        `<div style="color: #ff8800;"><strong>⚠️ Stale data</strong></div>`
      );
    }

    resultEl.innerHTML = blocks.join("");
    show(resultEl);
  } catch (err) {
    showMessage(err?.message || "Network error occurred", "error");
  }
});
