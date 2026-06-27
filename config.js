// Public configuration — safe to commit.
// The anon key is the public key for the STAGING project (same class as the app
// anon key — it grants nothing beyond what Row-Level Security allows the signed-in
// user). The test account password is NOT here — it is typed at login.
//
// Pointed at STAGING (not prod) so the preview reflects the MUX-ONLY builder: the
// deployed staging generate-program only selects exercises that have a Mux video.
// Prod is not mux-ready yet (no column / no video data), so staging is the only
// place this logic runs. Repoint here when prod cuts over.
window.PREVIEW_CONFIG = {
  SUPABASE_URL: "https://mfrctxlajztgtlgqoxki.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcmN0eGxhanp0Z3RsZ3FveGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTE1NjEsImV4cCI6MjA5NzQ4NzU2MX0._Z2YcSGbguRaE9WlQAIeiZGWSRVT0yo5wsFN5ByEqBg",
  TEST_EMAIL: "tester@tirata.app",
};
