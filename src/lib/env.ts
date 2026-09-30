// A required setting that is missing should fail the process at startup
// with a clear message, not fall back to a value that only ever matched
// one deployment.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env (see .env.example) before starting the server.`
    );
  }
  return value;
}
