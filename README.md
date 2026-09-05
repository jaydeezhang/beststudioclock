# Still Time

A cinematic, zero-dependency standby clock designed for desk setups and ambient displays.

The display now includes three distinct cockpit-inspired supercar scenes:

- **GT 三联表** — three Porsche-inspired, deeply recessed gauge pods: a larger analog clock, a calendar and outside temperature.
- **Rosso GT** — deep red bodywork, warm instrument dials and the original central analog watch face.
- **Electric Apex** — a horizontal EV instrument display with digital time, a segmented day-cycle meter, time remaining in the day and calendar data.

The temperature pod requests browser location only after pressing its location button. Coordinates are rounded to two decimal places and used to fetch current outdoor temperature from Open-Meteo. It never infers a city from the timezone. When location is unavailable, select a city in settings; only manually selected cities are saved locally. Temperature refreshes every 15 minutes while the triple-gauge scene is visible. Network failures display an unavailable state with retry, and do not interrupt the clock.

Seconds and date settings apply to all three instruments. Hiding date or seconds preserves the layout. Reduced-motion preferences keep the analog hands moving once per second and stop decorative motion. No build or API key is required. Location access depends on browser permissions; localhost or HTTPS is recommended when a browser restricts location access for local files.

## Run

Open `index.html` directly, or start a local server:

```sh
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Controls

- `F`: toggle fullscreen
- `C`: cycle visual scenes
- `S`: toggle seconds
- Move the pointer to reveal controls

The scene picker is split into editorial scenes and a dedicated `COCKPIT / SUPERCAR` collection. Preferences are saved locally in the browser.
