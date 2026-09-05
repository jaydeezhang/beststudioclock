const stage = document.querySelector(".clock-stage");
const canvas = document.querySelector("#artwork");
const context = canvas.getContext("2d", { alpha: true });

const elements = {
  hours: document.querySelector("#hours"),
  minutes: document.querySelector("#minutes"),
  seconds: document.querySelector("#seconds"),
  period: document.querySelector("#period"),
  weekday: document.querySelector("#weekday"),
  date: document.querySelector("#date"),
  dayProgress: document.querySelector("#dayProgress"),
  weekNumber: document.querySelector("#weekNumber"),
  timezone: document.querySelector("#timezone"),
  hudMode: document.querySelector("#hudMode"),
  analogClock: document.querySelector("#analogClock"),
  hourHand: document.querySelector("#hourHand"),
  minuteHand: document.querySelector("#minuteHand"),
  secondHand: document.querySelector("#secondHand"),
  dialNumbers: document.querySelector("#dialNumbers"),
  dialTicks: document.querySelector("#dialTicks"),
  rpmNumbers: document.querySelector("#rpmNumbers"),
  rpmTicks: document.querySelector("#rpmTicks"),
  dialSeries: document.querySelector("#dialSeries"),
  barrelDate: document.querySelector("#barrelDate"),
  barrelWeekday: document.querySelector("#barrelWeekday"),
  barrelMonth: document.querySelector("#barrelMonth"),
  barrelTime: document.querySelector("#barrelTime"),
  barrelPeriod: document.querySelector("#barrelPeriod"),
  barrelClock: document.querySelector("#barrelClock"),
  barrelHourHand: document.querySelector("#barrelHourHand"),
  barrelMinuteHand: document.querySelector("#barrelMinuteHand"),
  barrelSecondHand: document.querySelector("#barrelSecondHand"),
  calendarPointer: document.querySelector("#calendarPointer"),
  evTime: document.querySelector("#evTime"),
  evSeconds: document.querySelector("#evSeconds"),
  evDate: document.querySelector("#evDate"),
  evTimezone: document.querySelector("#evTimezone"),
  evStatus: document.querySelector("#evStatus"),
  evPeriod: document.querySelector("#evPeriod"),
  evDayLeft: document.querySelector("#evDayLeft"),
  evWeek: document.querySelector("#evWeek"),
  evYear: document.querySelector("#evYear"),
  evDayProgress: document.querySelector("#evDayProgress"),
  evDayBar: document.querySelector("#evDayBar"),
  settingsPanel: document.querySelector("#settingsPanel"),
  settingsTrigger: document.querySelector("#settingsTrigger"),
  panelScrim: document.querySelector("#panelScrim"),
  hourMode: document.querySelector("#hourMode"),
  showSeconds: document.querySelector("#showSeconds"),
  showDate: document.querySelector("#showDate"),
  antiBurn: document.querySelector("#antiBurn"),
  hourChime: document.querySelector("#hourChime"),
  brightness: document.querySelector("#brightness"),
  brightnessValue: document.querySelector("#brightnessValue"),
};

const themeColors = {
  nocturne: { line: "#9dc8c8", pulse: "#ff593d" },
  poster: { line: "#2254a3", pulse: "#e8492e" },
  signal: { line: "#3457dd", pulse: "#ff4d32" },
  carbon: { line: "#73808f", pulse: "#d5ff35" },
  gt: { line: "#cc9a5f", pulse: "#ff3b30" },
  ev: { line: "#68d8ff", pulse: "#b7ff31" },
};

const defaultSettings = {
  theme: "nocturne",
  hour24: true,
  seconds: true,
  date: true,
  antiBurn: true,
  hourChime: false,
  brightness: 100,
};

const cockpitThemes = ["carbon", "gt", "ev"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let settings = loadSettings();
let wakeTimer;
let animationFrame;
let lastChimedHour = -1;
let lastSecond = -1;
let artTime = 0;

function buildDialNumbers() {
  if (!elements.dialNumbers) return;
  const labels = ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
  labels.forEach((label, index) => {
    const number = document.createElement("span");
    number.className = "dial-number";
    number.textContent = label;
    const angle = index * Math.PI / 6;
    number.style.left = `${50 + Math.sin(angle) * 36}%`;
    number.style.top = `${50 - Math.cos(angle) * 36}%`;
    elements.dialNumbers.append(number);
  });

  for (let index = 0; index < 60; index += 1) {
    const tick = document.createElement("span");
    tick.className = `dial-tick${index % 5 === 0 ? " is-major" : ""}`;
    tick.style.setProperty("--tick-angle", `${index * 6}deg`);
    elements.dialTicks.append(tick);
  }

  for (let index = 0; index <= 40; index += 1) {
    const angle = -135 + index * 6.75;
    const redline = index >= 35 ? " is-redline" : "";
    const tick = document.createElement("span");
    tick.className = `rpm-tick${index % 5 === 0 ? " is-major" : ""}${redline}`;
    tick.style.setProperty("--tick-angle", `${angle}deg`);
    elements.rpmTicks.append(tick);
    if (index % 5 === 0) {
      const number = document.createElement("span");
      number.className = `rpm-number${redline}`;
      number.textContent = index / 5;
      number.style.left = `${50 + Math.sin(angle * Math.PI / 180) * 41.5}%`;
      number.style.top = `${50 - Math.cos(angle * Math.PI / 180) * 41.5}%`;
      elements.rpmNumbers.append(number);
    }
  }
}

function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem("still-time-settings") || "{}") };
  } catch {
    return { ...defaultSettings };
  }
}

function buildBarrelScale(id, labels, minimum, maximum, tickCount, fullCircle = false) {
  const scale = document.getElementById(id);
  const start = fullCircle ? 0 : -135;
  const sweep = fullCircle ? 360 : 270;
  for (let index = 0; index < tickCount; index += 1) {
    const tick = document.createElement("i");
    tick.className = `barrel-tick${index % 5 === 0 ? " is-major" : ""}`;
    tick.style.setProperty("--tick-angle", `${start + index / (fullCircle ? tickCount : tickCount - 1) * sweep}deg`);
    scale.append(tick);
  }
  labels.forEach((label) => {
    const angle = (start + (label - minimum) / (maximum - minimum) * sweep) * Math.PI / 180;
    const number = document.createElement("span");
    number.textContent = fullCircle && label === 0 ? "12" : label;
    number.style.left = `${50 + Math.sin(angle) * 36}%`;
    number.style.top = `${50 - Math.cos(angle) * 36}%`;
    scale.append(number);
  });
}

function saveSettings() {
  try {
    localStorage.setItem("still-time-settings", JSON.stringify(settings));
  } catch {
    // The clock still works when storage is disabled; preferences just remain temporary.
  }
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function getWeekNumber(date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
}

function updateCockpitDisplays(now) {
  const displayHour = settings.hour24 ? now.getHours() : now.getHours() % 12 || 12;
  const hours = pad(displayHour);
  const time = `${hours}:${pad(now.getMinutes())}`;
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(now).toUpperCase();
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(now).toUpperCase();
  const date = `${pad(now.getDate())} ${month}`;
  const fullDate = `${date} ${now.getFullYear()}`;

  elements.barrelDate.textContent = pad(now.getDate());
  elements.barrelMonth.textContent = `${month} ${now.getFullYear()}`;
  elements.barrelWeekday.textContent = weekday;
  elements.barrelTime.textContent = time;
  elements.barrelPeriod.textContent = settings.hour24 ? "24H" : elements.period.textContent;
  elements.calendarPointer.style.setProperty("--needle-angle", `${-135 + (now.getDate() - 1) / 30 * 270}deg`);
  elements.evTime.textContent = time;
  elements.evSeconds.textContent = pad(now.getSeconds());
  elements.evDate.textContent = fullDate;
  elements.evTimezone.textContent = elements.timezone.textContent;
  elements.evPeriod.textContent = settings.hour24 ? "24H" : elements.period.textContent;
  const elapsed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const minutesLeft = Math.ceil((86400 - elapsed) / 60);
  elements.evDayLeft.textContent = `${pad(Math.floor(minutesLeft / 60))}:${pad(minutesLeft % 60)}`;
  elements.evWeek.textContent = pad(getWeekNumber(now));
  elements.evYear.textContent = now.getFullYear();
  elements.evDayProgress.textContent = `${Math.floor(elapsed / 864)}%`;
  elements.evDayBar.style.width = `${elapsed / 864}%`;
}

function updateClockHands(now) {
  const seconds = now.getSeconds() + (reducedMotion.matches ? 0 : now.getMilliseconds() / 1000);
  const minutes = now.getMinutes() + seconds / 60;
  const hours = now.getHours() % 12 + minutes / 60;
  elements.hourHand.style.setProperty("--hand-angle", `${hours * 30}deg`);
  elements.minuteHand.style.setProperty("--hand-angle", `${minutes * 6}deg`);
  elements.secondHand.style.setProperty("--hand-angle", `${seconds * 6}deg`);
  elements.barrelHourHand.style.setProperty("--hand-angle", `${hours * 30}deg`);
  elements.barrelMinuteHand.style.setProperty("--hand-angle", `${minutes * 6}deg`);
  elements.barrelSecondHand.style.setProperty("--hand-angle", `${seconds * 6}deg`);
}

function updateClock(now = new Date()) {
  if (cockpitThemes.includes(settings.theme)) updateClockHands(now);
  const epochSecond = Math.floor(now.getTime() / 1000);
  if (epochSecond === lastSecond) return;
  lastSecond = epochSecond;

  let hour = now.getHours();
  elements.period.textContent = hour < 12 ? "AM" : "PM";
  if (!settings.hour24) hour = hour % 12 || 12;

  elements.hours.textContent = pad(hour);
  elements.minutes.textContent = pad(now.getMinutes());
  elements.seconds.textContent = pad(now.getSeconds());
  updateCockpitDisplays(now);

  const spokenTime = `${pad(hour)}:${pad(now.getMinutes())}${settings.seconds ? `:${pad(now.getSeconds())}` : ""}`;
  elements.analogClock.setAttribute("aria-label", `当前时间 ${spokenTime}${settings.hour24 ? "" : ` ${elements.period.textContent}`}`);
  elements.barrelClock.setAttribute("aria-label", elements.analogClock.getAttribute("aria-label"));

  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
  elements.weekday.textContent = weekday;
  elements.date.textContent = date;

  const progress = ((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400) * 100;
  elements.dayProgress.textContent = `DAY ${Math.floor(progress)}%`;
  elements.weekNumber.textContent = `WEEK ${pad(getWeekNumber(now))}`;

  if (settings.hourChime && now.getMinutes() === 0 && now.getSeconds() === 0 && lastChimedHour !== now.getHours()) {
    lastChimedHour = now.getHours();
    playChime();
  }
}

function playChime() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const audio = new AudioContext();
  const gain = audio.createGain();
  const first = audio.createOscillator();
  const second = audio.createOscillator();
  first.type = "sine";
  second.type = "sine";
  first.frequency.value = 523.25;
  second.frequency.value = 783.99;
  gain.gain.setValueAtTime(0, audio.currentTime);
  gain.gain.linearRampToValueAtTime(0.055, audio.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 2.6);
  first.connect(gain);
  second.connect(gain);
  gain.connect(audio.destination);
  first.start();
  second.start(audio.currentTime + 0.12);
  first.stop(audio.currentTime + 2.7);
  second.stop(audio.currentTime + 2.7);
  second.addEventListener("ended", () => audio.close());
}

function setTheme(theme, persist = true) {
  settings.theme = theme;
  document.body.dataset.theme = theme;
  document.body.classList.toggle("is-cockpit", cockpitThemes.includes(theme));
  if (elements.hudMode) {
    elements.hudMode.textContent = {
      carbon: "LAUNCH CONTROL",
      gt: "CORSA / STRADA",
      ev: "SILENT VELOCITY",
    }[theme] || "LAUNCH CONTROL";
  }
  if (elements.dialSeries) {
    elements.dialSeries.textContent = {
      carbon: "V12 / 01",
      gt: "V8 / GT",
      ev: "E-DRIVE / 01",
    }[theme] || "V12 / 01";
  }
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.body).getPropertyValue("--bg").trim();
  document.querySelectorAll(".theme-option").forEach((button) => {
    const active = button.dataset.themeValue === theme;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-checked", String(active));
  });
  updateClock();
  if (theme === "carbon") localWeather.refresh();
  if (persist) saveSettings();
}

function applySettings() {
  elements.hourMode.checked = settings.hour24;
  elements.showSeconds.checked = settings.seconds;
  elements.showDate.checked = settings.date;
  elements.antiBurn.checked = settings.antiBurn;
  elements.hourChime.checked = settings.hourChime;
  elements.brightness.value = settings.brightness;
  elements.brightnessValue.textContent = `${settings.brightness}%`;
  document.body.classList.toggle("mode-24", settings.hour24);
  document.body.classList.toggle("hide-seconds", !settings.seconds);
  document.body.classList.toggle("hide-date", !settings.date);
  stage.style.setProperty("--stage-brightness", settings.brightness / 100);
  setTheme(settings.theme, false);
  updateDrift(true);
  lastSecond = -1;
  updateClock();
}

function togglePanel(open) {
  const shouldOpen = open ?? !elements.settingsPanel.classList.contains("is-open");
  elements.settingsPanel.classList.toggle("is-open", shouldOpen);
  elements.panelScrim.classList.toggle("is-open", shouldOpen);
  elements.settingsPanel.setAttribute("aria-hidden", String(!shouldOpen));
  elements.settingsTrigger.setAttribute("aria-expanded", String(shouldOpen));
  // Mobile browsers may pan the visual viewport when focus moves into an off-canvas panel.
  if (shouldOpen && window.matchMedia("(min-width: 601px)").matches) {
    document.querySelector("#closeSettings").focus();
  }
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    stage.classList.add("is-awake");
  }
}

function updateFullscreenLabels() {
  const isFullscreen = Boolean(document.fullscreenElement);
  document.querySelector("#fullscreenTrigger").setAttribute("aria-label", isFullscreen ? "退出全屏" : "进入全屏");
  document.querySelector("#panelFullscreen span:last-child").textContent = isFullscreen ? "退出全屏" : "进入全屏";
}

function wakeControls() {
  stage.classList.add("is-awake");
  clearTimeout(wakeTimer);
  wakeTimer = setTimeout(() => {
    if (!elements.settingsPanel.classList.contains("is-open")) stage.classList.remove("is-awake");
  }, 3200);
}

function updateDrift(reset = false) {
  if (!settings.antiBurn || reset) {
    stage.style.setProperty("--drift-x", "0px");
    stage.style.setProperty("--drift-y", "0px");
    if (!settings.antiBurn) return;
  }
  const x = Math.round(Math.random() * 16 - 8);
  const y = Math.round(Math.random() * 12 - 6);
  stage.style.setProperty("--drift-x", `${x}px`);
  stage.style.setProperty("--drift-y", `${y}px`);
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawCockpitArtwork(width, height, colors) {
  const isCarbon = settings.theme === "carbon";

  context.save();
  context.lineCap = "round";
  context.lineWidth = 1;
  context.globalAlpha = isCarbon ? 0.12 : 0.18;
  for (let i = 0; i < 12; i += 1) {
    const phase = artTime * 4 + i * 0.46;
    const x = width * (0.05 + i * 0.07);
    const length = height * (0.16 + (i % 4) * 0.04);
    context.beginPath();
    context.moveTo(x + Math.sin(phase) * 8, height * 0.92);
    context.lineTo(x + length * 0.26 + Math.sin(phase) * 20, height * 0.92 - length);
    context.strokeStyle = i % 3 === 0 ? colors.pulse : colors.line;
    context.stroke();
  }

  context.restore();
}

function drawArtwork(timestamp) {
  const reduced = reducedMotion.matches;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const colors = themeColors[settings.theme];
  artTime = reduced ? 0 : timestamp * 0.000035;
  context.clearRect(0, 0, width, height);

  if (cockpitThemes.includes(settings.theme)) {
    updateClock();
    drawCockpitArtwork(width, height, colors);
    animationFrame = requestAnimationFrame(drawArtwork);
    return;
  }

  context.save();

  const count = width < 700 ? 6 : 11;
  context.lineWidth = 0.75;
  context.globalAlpha = settings.theme === "signal" ? 0.3 : 0.2;
  for (let i = 0; i < count; i += 1) {
    const phase = artTime + i * 0.24;
    const x = width * (0.1 + (i / count) * 0.86);
    const amplitude = height * (0.025 + (i % 3) * 0.008);
    context.beginPath();
    for (let y = -20; y <= height + 20; y += 18) {
      const wave = Math.sin(y * 0.007 + phase * 4) * amplitude;
      if (y === -20) context.moveTo(x + wave, y);
      else context.lineTo(x + wave, y);
    }
    context.strokeStyle = i % 4 === 0 ? colors.pulse : colors.line;
    context.stroke();
  }

  context.globalAlpha = 0.42;
  context.strokeStyle = colors.line;
  context.lineWidth = 1;
  const radius = Math.min(width, height) * 0.28;
  context.beginPath();
  context.arc(width * 0.72, height * 0.47, radius, artTime, artTime + Math.PI * 0.68);
  context.stroke();
  context.restore();
  animationFrame = requestAnimationFrame(drawArtwork);
}

function cycleTheme() {
  const themes = Object.keys(themeColors);
  const next = themes[(themes.indexOf(settings.theme) + 1) % themes.length];
  setTheme(next);
}

document.querySelectorAll(".theme-option").forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.themeValue));
});

[
  [elements.hourMode, "hour24", "mode-24", false],
  [elements.showSeconds, "seconds", "hide-seconds", true],
  [elements.showDate, "date", "hide-date", true],
  [elements.hourChime, "hourChime", null, false],
].forEach(([input, key, className, inverse]) => {
  input.addEventListener("change", () => {
    settings[key] = input.checked;
    if (className) document.body.classList.toggle(className, inverse ? !input.checked : input.checked);
    lastSecond = -1;
    updateClock();
    saveSettings();
  });
});

elements.antiBurn.addEventListener("change", () => {
  settings.antiBurn = elements.antiBurn.checked;
  updateDrift(true);
  saveSettings();
});

elements.brightness.addEventListener("input", () => {
  settings.brightness = Number(elements.brightness.value);
  elements.brightnessValue.textContent = `${settings.brightness}%`;
  stage.style.setProperty("--stage-brightness", settings.brightness / 100);
  saveSettings();
});

elements.settingsTrigger.addEventListener("click", () => togglePanel(true));
document.querySelector("#closeSettings").addEventListener("click", () => togglePanel(false));
elements.panelScrim.addEventListener("click", () => togglePanel(false));
document.querySelector("#fullscreenTrigger").addEventListener("click", toggleFullscreen);
document.querySelector("#panelFullscreen").addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", updateFullscreenLabels);

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, button")) return;
  const key = event.key.toLowerCase();
  if (key === "f") toggleFullscreen();
  if (key === "c") cycleTheme();
  if (key === "s") {
    elements.showSeconds.checked = !elements.showSeconds.checked;
    elements.showSeconds.dispatchEvent(new Event("change"));
  }
  if (key === "escape") togglePanel(false);
});

document.addEventListener("pointermove", wakeControls, { passive: true });
document.addEventListener("pointerdown", wakeControls, { passive: true });
window.addEventListener("resize", resizeCanvas, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    lastSecond = -1;
    updateClock();
  }
});

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "LOCAL TIME";
elements.timezone.textContent = timezone.replaceAll("_", " ").replace("/", " / ").toUpperCase();

applySettings();
buildDialNumbers();
buildBarrelScale("calendarScale", [1, 5, 10, 15, 20, 25, 31], 1, 31, 31);
buildBarrelScale("clockScale", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 0, 12, 60, true);
buildBarrelScale("temperatureScale", [-20, -10, 0, 10, 20, 30, 40, 50], -20, 50, 36);
resizeCanvas();
cancelAnimationFrame(animationFrame);
animationFrame = requestAnimationFrame(drawArtwork);
setInterval(updateClock, 250);
setInterval(() => updateDrift(), 120000);
wakeControls();
