import type { ZodType } from 'zod';
import {
  apiErrorSchema,
  createGameInputSchema,
  gameListSchema,
  gameSchema,
  healthSchema,
  type CreateGameInput,
  type Game,
  type Health,
} from '@chess/shared';

/** Thrown for any non-2xx response, or when a response fails schema parsing. */
export class ApiError extends Error {
  readonly status: number;
  readonly details: { path: string; message: string }[];

  constructor(message: string, status: number, details: { path: string; message: string }[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Requests go to the same origin so the Vite proxy handles them in development.
const BASE_URL = '';

async function request<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw new ApiError(`Could not reach the API: ${(cause as Error).message}`, 0);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    if (parsedError.success) {
      throw new ApiError(parsedError.data.message, response.status, parsedError.data.details ?? []);
    }
    throw new ApiError(`Request failed with status ${response.status}.`, response.status);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(
      `The API returned an unexpected response for ${path}.`,
      response.status,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  return parsed.data;
}

export const api = {
  health: (): Promise<Health> => request('/health', healthSchema),

  listGames: (): Promise<Game[]> => request('/api/games', gameListSchema),

  getGame: (id: string): Promise<Game> =>
    request(`/api/games/${encodeURIComponent(id)}`, gameSchema),

  createGame: (input: CreateGameInput): Promise<Game> =>
    request('/api/games', gameSchema, {
      method: 'POST',
      body: JSON.stringify(createGameInputSchema.parse(input)),
    }),
};

export type ApiClient = typeof api;
