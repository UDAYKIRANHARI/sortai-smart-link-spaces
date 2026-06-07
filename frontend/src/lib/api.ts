const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type TokenProvider = (forceRefresh?: boolean) => Promise<string>;

interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  tokenProvider?: TokenProvider;
  retryOnUnauthorized?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    tokenProvider,
    retryOnUnauthorized = true,
    headers = {},
    ...init
  } = options;

  const doFetch = async (forceRefreshToken = false) => {
    const token = tokenProvider ? await tokenProvider(forceRefreshToken) : null;
    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...headers,
      },
    });
  };

  let response = await doFetch(false);
  if (response.status === 401 && retryOnUnauthorized && tokenProvider) {
    response = await doFetch(true);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || `Request failed with status ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}
