// Loads .env into process.env for the API server.
//
// This must be the FIRST import in the server entry points, because ES module
// bodies (and their imports) are evaluated before the importing module's own
// code. Anything that reads process.env at module scope - for example
// auth.controller.js capturing JWT_SECRET - would otherwise capture the value
// before .env had been parsed.
//
// process.loadEnvFile is built into Node 20.12+, so no dotenv dependency.
// It throws when no .env file exists, which is a valid deployment setup
// (real environment variables), so the failure is deliberately swallowed.

try {
  process.loadEnvFile()
} catch {
  // No .env file - rely on the real environment. Not an error.
}
