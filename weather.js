const localWeather = (() => {
  const temperature = document.querySelector("#barrelTemp");
  const locationLabel = document.querySelector("#barrelLocation");
  const pointer = document.querySelector("#temperaturePointer");
  const action = document.querySelector("#weatherAction");
  const locateButton = document.querySelector("#locateWeather");
  const status = document.querySelector("#weatherStatus");
  const results = document.querySelector("#cityResults");
  const cityInput = document.querySelector("#weatherCity");
  let location = null;
  let updatedAt = 0;
  let pending = false;
  let revision = 0;
  let searchRevision = 0;
  let weatherController;
  let searchController;
  let needsCity = false;

  // Only manually selected cities persist. Geolocation stays in this session.
  try {
    const saved = JSON.parse(localStorage.getItem("still-time-weather-city"));
    if (saved && typeof saved.label === "string" && Number.isFinite(saved.latitude) && Math.abs(saved.latitude) <= 90 && Number.isFinite(saved.longitude) && Math.abs(saved.longitude) <= 180) location = saved;
  } catch { /* Storage may be unavailable for local files. */ }

  async function getJSON(url, controller) {
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Request failed");
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function setPending(value, message) {
    pending = value;
    action.disabled = value;
    locateButton.disabled = value;
    status.textContent = message;
    if (value) {
      temperature.textContent = "--°C";
      pointer.hidden = true;
      action.textContent = "获取中";
    }
  }

  async function refresh(force = false) {
    if (!location || pending || (!force && Date.now() - updatedAt < 900000)) return;
    const requestRevision = ++revision;
    weatherController?.abort();
    weatherController = new AbortController();
    locationLabel.textContent = location.label;
    setPending(true, "正在获取温度…");
    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.search = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude, current: "temperature_2m", temperature_unit: "celsius" });
      const data = await getJSON(url, weatherController);
      if (requestRevision !== revision) return;
      const value = data.current?.temperature_2m;
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Temperature unavailable");
      updatedAt = Date.now();
      const rounded = Math.round(value);
      temperature.textContent = `${rounded}°C`;
      pointer.style.setProperty("--needle-angle", `${(Math.max(-20, Math.min(50, value)) + 20) / 70 * 270 - 135}deg`);
      pointer.hidden = false;
      action.textContent = "刷新温度";
      setPending(false, `${location.label} · ${rounded}°C · ${new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} 更新 · Open-Meteo`);
    } catch {
      if (requestRevision !== revision) return;
      temperature.textContent = "--°C";
      pointer.hidden = true;
      action.textContent = "重新获取";
      setPending(false, "温度暂不可用，请重试");
    }
  }

  function locate() {
    if (pending) return;
    const requestRevision = ++revision;
    weatherController?.abort();
    location = null;
    needsCity = false;
    locationLabel.textContent = "正在定位";
    setPending(true, "正在获取当前位置…");
    const onFailure = (error) => {
      if (requestRevision !== revision) return;
      needsCity = true;
      locationLabel.textContent = "定位不可用";
      action.textContent = "选择城市";
      setPending(false, error?.code === 1 ? "定位权限未开启，可搜索城市" : "无法获取位置，可搜索城市或重新定位");
    };
    if (!navigator.geolocation) {
      onFailure();
      return;
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (requestRevision !== revision) return;
      location = { label: "当前位置", latitude: Number(coords.latitude.toFixed(2)), longitude: Number(coords.longitude.toFixed(2)) };
      try { localStorage.removeItem("still-time-weather-city"); } catch { /* Optional preference storage. */ }
      pending = false;
      refresh(true);
    }, onFailure, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }

  document.querySelector("#citySearch").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = cityInput.value.trim();
    if (!name) return;
    const requestRevision = ++searchRevision;
    searchController?.abort();
    searchController = new AbortController();
    results.replaceChildren();
    status.textContent = "正在搜索城市…";
    try {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.search = new URLSearchParams({ name, count: 5, language: "zh", format: "json" });
      const data = await getJSON(url, searchController);
      if (requestRevision !== searchRevision) return;
      const cities = (data.results || []).filter((city) => Number.isFinite(city.latitude) && Number.isFinite(city.longitude));
      status.textContent = cities.length ? "选择城市" : "未找到城市，可尝试英文名称";
      cities.forEach((city) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = [city.name, city.admin1, city.country].filter(Boolean).join(" · ");
        button.addEventListener("click", () => {
          revision += 1;
          weatherController?.abort();
          pending = false;
          needsCity = false;
          location = { label: city.name, latitude: city.latitude, longitude: city.longitude };
          try { localStorage.setItem("still-time-weather-city", JSON.stringify(location)); } catch { /* Optional preference storage. */ }
          results.replaceChildren();
          refresh(true);
        });
        results.append(button);
      });
    } catch {
      if (requestRevision === searchRevision) status.textContent = "城市搜索暂不可用，请重试";
    }
  });

  action.addEventListener("click", () => {
    if (needsCity) {
      document.querySelector("#settingsTrigger").click();
      cityInput.focus({ preventScroll: true });
      cityInput.scrollIntoView({ block: "center" });
    } else if (location) refresh(true);
    else locate();
  });
  locateButton.addEventListener("click", locate);
  const refreshWhenVisible = () => {
    if (!document.hidden && document.body.dataset.theme === "carbon") refresh();
  };
  setInterval(refreshWhenVisible, 900000);
  document.addEventListener("visibilitychange", refreshWhenVisible);
  return { refresh };
})();
