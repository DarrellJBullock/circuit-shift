# App Store screenshots (6.9", 1320 × 2868)

Captured with `xcrun simctl io <udid> screenshot` from the **Release build** running on a dedicated
simulator ("Circuit Shift Screenshots", iPhone 18 Pro Max, iOS 27). No mock-ups, overlays or
edits; the only processing was removing the alpha channel, which App Store Connect requires.

| File | Shows |
|---|---|
| 01-gameplay.png | Chapter 2-16 "Backbone" mid-solve: two sources, flowing power, receivers lighting |
| 02-colors.png | Chapter 3-10 "Spectrum": separate cyan and violet networks, compatible receivers |
| 03-complete.png | Chapter 3-5 solved at the proven optimum (23/23, ★★★) |
| 04-daily.png | Daily Challenge with the previous days |
| 05-chapters.png | Chapter progress |
| 06-home.png | Home |

Setup for reproducibility: the status bar was overridden to 9:41, full signal and full battery.
Campaign progress was seeded in the simulator's local database so that chapters 2–3 were reachable.
Partial-solve states come from applying taps from each level's verified solution.
The build predates the 1.0.0 version bump and the Shop change; neither screen is shown.
