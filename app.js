/* Tirata Program Preview — static client.
 *
 * Logs into the shared review account with the PUBLIC anon key, calls the
 * deployed generate-program edge function (the real production engine), reads
 * the written program back through Row-Level Security, renders it, then deletes
 * the account's older (completed) programs so its footprint stays at ~1 program.
 *
 * No secrets here: the anon key is public, the password is typed at login.
 */

const cfg = window.PREVIEW_CONFIG;
const db = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "tirata-preview-auth" },
});

const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");

// --- equipment tiles (verbatim from the app's EquipmentScreen) ---------------
const EQUIPMENT = {
  full: ["barbell", "trap_bar", "dumbbell", "kettlebell", "bench", "cable", "band", "swiss_ball", "plyo_box", "pull_up_bar"],
  minimalist: ["dumbbell", "kettlebell", "band", "bench", "pull_up_bar"],
};
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --- date helpers (UTC, no locale surprises) ---------------------------------
function isoAddDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
function nextMonday() {
  const now = new Date();
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // 0=Mon
  return isoAddDays(today, dow === 0 ? 0 : 7 - dow);
}
function weekday(iso) { return DOW[(new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7]; }

// --- profile from the form ---------------------------------------------------
function readProfile() {
  const tier = $("equipment").value;
  const weeks = Math.max(3, Math.min(32, parseInt($("weeks").value, 10) || 16));
  const startDate = nextMonday();
  const age = $("age").value;
  return {
    startDate,
    aRaceDate: isoAddDays(startDate, weeks * 7 - 2),
    discipline: $("discipline").value,
    experienceLevel: $("experience").value,
    trainingStatus: $("status").value,
    equipment: EQUIPMENT[tier],
    volume: $("volume").value,
    frequency: parseInt($("frequency").value, 10),
    rideSchedule: [
      { day: "tue", type: "intervals" },
      { day: "thu", type: "easy" },
      { day: "sat", type: "long" },
    ],
    ageGroup: age === "none" ? undefined : age,
    _weeks: weeks,
    _tier: tier,
  };
}

function randomize() {
  const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  $("experience").value = r(["advanced", "intermediate"]);
  $("status").value = r(["current", "recent", "long", "never"]);
  $("discipline").value = r(["road", "gravel", "mtb"]);
  $("equipment").value = r(["full", "minimalist"]);
  $("volume").value = r(["standard", "low"]);
  $("frequency").value = r(["3", "2"]);
  $("weeks").value = String(6 + Math.floor(Math.random() * 22));
  $("age").value = r(["none", "none", "40_49", "50_59", "60_69"]);
}

// --- read the written program back via RLS -----------------------------------
async function readProgram(uid) {
  const { data: program, error: pErr } = await db.from("programs")
    .select("id, start_date, total_weeks").eq("user_id", uid).eq("status", "active").single();
  if (pErr) throw new Error(`read program: ${pErr.message}`);

  const [{ data: phases }, { data: weeks }, { data: sessions }, { data: sx }] = await Promise.all([
    db.from("phases").select("id, phase_code, week_count").eq("program_id", program.id),
    db.from("program_weeks").select("id, week_number, week_in_phase, is_deload, race_week_type, phase_id").eq("program_id", program.id).order("week_number"),
    db.from("sessions").select("id, session_type, scheduled_date, placement_reason, program_week_id").eq("program_id", program.id).order("scheduled_date"),
    db.from("session_exercises").select("session_id, slot_name, slot_group, position, prescribed_sets, prescribed_reps, prescribed_rpe, rest_seconds, exercise:exercises!session_exercises_exercise_id_fkey(name)").eq("user_id", uid).order("position"),
  ]);

  return { program, phases: phases || [], weeks: weeks || [], sessions: sessions || [], sx: sx || [] };
}

// --- render ------------------------------------------------------------------
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function esc(s) { return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function render(profile, data) {
  const { program, phases, weeks, sessions, sx } = data;
  const phaseById = new Map(phases.map((p) => [p.id, p]));
  const sxBySession = new Map();
  for (const e of sx) { const a = sxBySession.get(e.session_id) || []; a.push(e); sxBySession.set(e.session_id, a); }
  const sessByWeek = new Map();
  for (const s of sessions) { const a = sessByWeek.get(s.program_week_id) || []; a.push(s); sessByWeek.set(s.program_week_id, a); }

  const root = $("result");
  root.innerHTML = "";
  root.appendChild(el("h2", null, `Sample Program`));
  root.appendChild(el("p", "meta",
    `<b>${esc(profile.experienceLevel)}</b> · ${esc(profile.trainingStatus)} · ${esc(profile.discipline)} · ` +
    `<b>${esc(profile.volume)}</b> volume · ${esc(profile._tier)} gym · ${profile.frequency} strength/wk` +
    `${profile.ageGroup ? ` · age ${esc(profile.ageGroup)}` : ""}<br>` +
    `${esc(program.start_date)} → A-race ${esc(profile.aRaceDate)} · ${program.total_weeks} weeks · built by the live production engine`));

  for (const w of weeks) {
    const ph = phaseById.get(w.phase_id);
    const startDate = isoAddDays(program.start_date, (w.week_number - 1) * 7);
    const wkSessions = sessByWeek.get(w.id) || [];

    const week = el("div", "week");
    const head = el("div", "week-head");
    head.appendChild(el("span", "wk", `Week ${w.week_number}`));
    head.appendChild(el("span", "phase", `${ph ? esc(ph.phase_code) : "?"} (wk ${w.week_in_phase}/${ph ? ph.week_count : "?"})`));
    head.appendChild(el("span", "date", `${esc(startDate)} · ${wkSessions.length} session(s)`));
    if (w.is_deload) head.appendChild(el("span", "flag deload", "DELOAD"));
    if (w.race_week_type === "a_race") head.appendChild(el("span", "flag race", "A-RACE"));
    if (w.race_week_type === "b_race") head.appendChild(el("span", "flag race", "B-RACE"));
    week.appendChild(head);

    for (const s of wkSessions) {
      const exs = (sxBySession.get(s.id) || []).slice().sort((a, b) => a.position - b.position);
      const sh = el("div", "session");
      sh.innerHTML = `<span class="stype">${esc(s.session_type)}</span> ` +
        `<span class="sday">${weekday(s.scheduled_date)} ${esc(s.scheduled_date)}</span>` +
        `${s.placement_reason ? ` <span class="reason">— ${esc(s.placement_reason)}</span>` : ""}`;
      week.appendChild(sh);

      const table = el("table");
      table.innerHTML = "<thead><tr><th>Slot</th><th>Exercise</th><th>Sets×Reps</th><th>RPE</th><th>Rest</th></tr></thead>";
      const tb = el("tbody");
      for (const e of exs) {
        const ex = Array.isArray(e.exercise) ? e.exercise[0] : e.exercise;
        const isWarm = (e.slot_group || "").toUpperCase() === "W";
        const tr = el("tr", isWarm ? "warmup" : null);
        tr.innerHTML =
          `<td class="slot">${esc(e.slot_name)}/${esc(e.slot_group)}</td>` +
          `<td>${esc(ex ? ex.name : "?")}</td>` +
          `<td class="rx">${esc(e.prescribed_sets)}×${esc(e.prescribed_reps)}</td>` +
          `<td>${e.prescribed_rpe != null ? esc(e.prescribed_rpe) : "—"}</td>` +
          `<td>${esc(e.rest_seconds)}s</td>`;
        tb.appendChild(tr);
      }
      table.appendChild(tb);
      week.appendChild(table);
    }
    root.appendChild(week);
  }
  show("result");
}

// --- self-clean: drop the account's completed programs (option 2) ------------
async function selfClean(uid) {
  const { error } = await db.from("programs").delete().eq("user_id", uid).eq("status", "completed");
  if (error) console.warn("self-clean skipped:", error.message); // non-fatal
}

// --- generate flow -----------------------------------------------------------
async function generate() {
  const profile = readProfile();
  const { data: sess } = await db.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) { setStatus("Not signed in.", "fail"); showLoginState(); return; }

  $("generate-btn").disabled = true;
  setStatus("Generating through the live engine…", "busy");
  try {
    const { _weeks, _tier, ...body } = profile;
    const { error: invErr } = await db.functions.invoke("generate-program", { body });
    if (invErr) throw new Error(invErr.message || "generate-program failed");

    setStatus("Reading the program back…", "busy");
    const data = await readProgram(uid);
    render(profile, data);
    await selfClean(uid);
    setStatus(`Done — ${data.program.total_weeks}-week program built and rendered.`, "done");
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    setStatus(`Failed: ${err.message}`, "fail");
  } finally {
    $("generate-btn").disabled = false;
  }
}

function setStatus(msg, kind) {
  const s = $("status");
  s.textContent = msg;
  s.className = "status" + (kind ? " " + kind : "");
}

// --- auth / view state -------------------------------------------------------
async function showLoginState() {
  const { data } = await db.auth.getSession();
  if (data.session) {
    hide("login"); show("generator");
  } else {
    show("login"); hide("generator"); hide("result");
    $("email").value = cfg.TEST_EMAIL || "";
  }
}

async function signIn() {
  $("login-error").textContent = "";
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) { $("login-error").textContent = "Enter email and password."; return; }
  $("signin-btn").disabled = true;
  const { error } = await db.auth.signInWithPassword({ email, password });
  $("signin-btn").disabled = false;
  if (error) { $("login-error").textContent = error.message; return; }
  $("password").value = "";
  showLoginState();
}

async function signOut() {
  await db.auth.signOut();
  hide("result");
  setStatus("", "");
  showLoginState();
}

// --- wire up -----------------------------------------------------------------
$("signin-btn").addEventListener("click", signIn);
$("password").addEventListener("keydown", (e) => { if (e.key === "Enter") signIn(); });
$("signout-btn").addEventListener("click", signOut);
$("generate-btn").addEventListener("click", generate);
$("random-btn").addEventListener("click", randomize);
showLoginState();
