# 60-Second Demo Recording Script

The single highest-ROI polish on this repo is a demo GIF/video in the README hero.

## Quick path (60 seconds, ~5MB GIF)

1. Start dev server: `npm run dev`
2. Open http://localhost:3000/builder in a 1280×800 window (clean, no devtools)
3. Record with QuickTime → New Screen Recording → select window
4. Script:

| Second | Action                                                     |
| ------ | ---------------------------------------------------------- |
| 0–5    | Start on default 40×60 building. Orbit the camera once.   |
| 5–10   | Click `60x100 Warehouse` preset. Pause on the result.      |
| 10–15  | Click `40x60 Garage` preset.                               |
| 15–22  | Switch roof to `Single Slope`, then back to `Gable`.       |
| 22–30  | Click `Rollup` door button → door lands on front wall.     |
| 30–38  | Add an `Enclosed` lean-to, change Wall to `right`.         |
| 38–45  | Click a color swatch (e.g., Forest Green).                 |
| 45–55  | Click `Get a Quote`, fill name/email, Submit.              |
| 55–60  | (If in CRM mode) lead detail opens with same 3D view.      |

5. Convert MOV → GIF:

```bash
# Option A: ffmpeg (best quality)
ffmpeg -i demo.mov -vf "fps=15,scale=800:-1:flags=lanczos" -loop 0 docs/demo.gif

# Option B: cloudconvert.com (drag & drop)
```

6. Commit `docs/demo.gif` — the README already references this path.

## Longer demo (3 minutes, post to YouTube + embed)

Same structure, but add:

- Nested lean-to (child attached to parent lean-to)
- Wraparound corner
- Log into CRM as `admin@buildforge.com` / `admin123`
- Navigate to lead, click `Edit Building`, change a value, `Save Changes`
- Reload page, click `Edit Building` again → show the change persisted

Upload to YouTube (unlisted), paste the link in the README next to the GIF.

## Why this matters

Recruiters and hiring managers will spend **~11 seconds** scanning this repo.

- No GIF → "cool, I guess" → close tab
- GIF in first scroll → "wait, this is real" → open the live demo

The GIF is worth more than any other README polish combined.
