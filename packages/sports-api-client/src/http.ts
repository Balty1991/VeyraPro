export interface SportsApiClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class SportsApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly endpoint?: string,
  ) {
    super(message);
    this.name = "SportsApiError";
  }
}

/** Thin authenticated JSON fetch wrapper used by every endpoint module. */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: SportsApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.SPORTS_API_BASE_URL ?? "";
    this.apiKey = options.apiKey ?? process.env.SPORTS_API_KEY ?? "";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;

    if (!this.baseUrl) {
      throw new SportsApiError("SPORTS_API_BASE_URL is not configured");
    }
    if (!this.apiKey) {
      throw new SportsApiError("SPORTS_API_KEY is not configured");
    }
  }

  async get<T>(path: string, query: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    const url = new URL(path.replace(/^\//, ""), this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchImpl(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new SportsApiError(`Sports API request failed: ${res.status} ${res.statusText}`, res.status, path);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
