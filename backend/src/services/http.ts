import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

const DEFAULT_TIMEOUT_MS = parseInt(process.env.OUTBOUND_TIMEOUT_MS || "10000", 10);
const DEFAULT_RETRIES = parseInt(process.env.OUTBOUND_RETRIES || "2", 10);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getWithRetry<T = unknown>(
  url: string,
  config: AxiosRequestConfig = {},
  retries = DEFAULT_RETRIES
): Promise<AxiosResponse<T>> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await axios.get<T>(url, {
        ...config,
        timeout: config.timeout || DEFAULT_TIMEOUT_MS,
      });
    } catch (err) {
      lastError = err as Error;
      if (attempt >= retries) break;
      const delay = 200 * (attempt + 1);
      await sleep(delay);
    }
  }
  throw lastError || new Error("HTTP request failed");
}
