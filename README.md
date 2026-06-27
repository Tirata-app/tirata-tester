# Tirata · Program Preview

A tiny standalone web tool to generate a **full training program through the live
production engine** and read it as a coherent whole — built for reviewing whether
the program builder meets the methodology spec (Docs 01–05b), without onboarding
through the app or running a script.

It is **not** part of the Tirata app codebase. It's static HTML/CSS/JS that talks
to the same Supabase backend the app uses.

## How it works

```
[ Browser: this page ]  →  signs in (public anon key) as a shared test account
        │                  →  calls the DEPLOYED generate-program edge function
        │                  →  reads the written program back via Row-Level Security
        │                  →  renders it
        └───────────────── →  deletes the account's older programs (stays ~1 program)
```

Everything runs as the logged-in test user. There is **no server and no secret in
this repo**:

- The **anon key** in `config.js` is the same public key shipped in the mobile app.
  It grants nothing beyond what RLS allows for the signed-in user.
- The test account's **password is never stored here** — it's typed at login.

Because it calls the real edge function, the program it shows is exactly what
onboarding produces on **staging** — which currently runs the **mux-only** builder
(only exercises that have a Mux video are selected). Prod is not mux-ready yet, so
staging is the source while videos are imported.

## Use it

Visit the deployed page (see **Deploy** below), or run locally:

```bash
# from this folder — any static server works
python3 -m http.server 8080
# open http://localhost:8080
```

Then:
1. Sign in with the review account (`tester@tirata.app`, on **staging**) — ask Charlie for the password.
2. Pick inputs (or hit **Randomize**), then **Generate program**.
3. Read the rendered program. Rides default to Tue/intervals, Thu/easy, Sat/long;
   start date is the next Monday.

## Deploy (GitHub Pages)

This repo is the deploy unit. In the GitHub repo:

1. **Settings → Pages**.
2. **Source:** Deploy from a branch → **`main`** / **`/ (root)`** → Save.
3. Wait ~1 min; the URL appears at the top of the Pages settings (e.g.
   `https://tirata-app.github.io/tirata-tester/`). Share that with Matt.

The page is publicly reachable — the login is the gate. Keep the test password private.

## Notes

- **Test account:** `tester@tirata.app` on the **staging** project (staging data only —
  never touches real users or prod analytics).
- **Self-cleaning:** after each generate, the tool deletes the account's `completed`
  programs (RLS allows a user to delete their own rows), so its DB footprint stays at
  ~1 active program. Real users' data is never touched.
- **Pinned dependency:** `supabase-js` is loaded from jsDelivr at a fixed version with
  Subresource Integrity (`index.html`).
- **Config:** edit `config.js` to point at a different project / test account.
