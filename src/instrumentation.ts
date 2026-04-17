// Next.js Instrumentation — runs once when the server starts
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureDbInitialized } = await import('./lib/db-init');
    await ensureDbInitialized();
  }
}
