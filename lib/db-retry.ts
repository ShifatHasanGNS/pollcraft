const DEFAULT_RETRIES = 3;
const DEFAULT_DELAY_MS = 200;

function collectErrorCodes(error: unknown, acc: Set<string>) {
  if (!error || typeof error !== "object") {
    return;
  }

  const anyErr = error as { code?: unknown; cause?: unknown; errors?: unknown };
  if (anyErr.code && typeof anyErr.code === "string") {
    acc.add(anyErr.code);
  }

  if (Array.isArray(anyErr.errors)) {
    for (const nested of anyErr.errors) {
      collectErrorCodes(nested, acc);
    }
  }

  if (anyErr.cause) {
    collectErrorCodes(anyErr.cause, acc);
  }
}

function isRetryableDbError(error: unknown): boolean {
  if (!error) return false;
  const codes = new Set<string>();
  collectErrorCodes(error, codes);
  if (codes.has("ETIMEDOUT")) {
    return true;
  }

  if (error instanceof Error) {
    return /fetch failed/i.test(error.message);
  }

  return false;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withDbRetry<T>(operation: () => Promise<T>, retries = DEFAULT_RETRIES, baseDelayMs = DEFAULT_DELAY_MS): Promise<T> {
  let attempt = 0;
  let delay = baseDelayMs;

  for (; ;) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      const retryable = isRetryableDbError(error);
      if (!retryable || attempt > retries) {
        throw error;
      }
      await wait(delay);
      delay *= 2;
    }
  }
}
