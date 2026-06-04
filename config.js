// Public configuration — safe to commit.
// The anon key is the SAME public key shipped in the Tirata mobile app. It grants
// nothing beyond what Row-Level Security allows for the logged-in user, so it is
// not a secret. The test account's password is NOT here — it's typed at login.
window.PREVIEW_CONFIG = {
  SUPABASE_URL: "https://hhqcczjutsnmvgouzwxj.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocWNjemp1dHNubXZnb3V6d3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTMzODYsImV4cCI6MjA5MDgyOTM4Nn0.BMGaGl6wUjCWrrhjtx3Qbr_be27_gx_Ji9l-D4qAFiA",
  TEST_EMAIL: "buildtester@tirata.app",
};
