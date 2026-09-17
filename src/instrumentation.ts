export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { iniciarScheduler } = await import("./lib/scheduler");
    iniciarScheduler();
  }
}
