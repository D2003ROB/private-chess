import { z } from 'zod';

/**
 * Lifecycle of a game record. Deliberately coarse: this ticket delivers
 * plumbing, so nothing here models chess itself.
 */
export const gameStatusSchema = z.enum(['PENDING', 'ACTIVE', 'COMPLETED']);
export type GameStatus = z.infer<typeof gameStatusSchema>;

const playerNameSchema = z
  .string()
  .trim()
  .min(1, 'Player name is required')
  .max(50, 'Player name must be 50 characters or fewer');

/** Body accepted by `POST /api/games`. Shared by the API route and the web form. */
export const createGameInputSchema = z.object({
  whitePlayer: playerNameSchema,
  blackPlayer: playerNameSchema,
});
export type CreateGameInput = z.infer<typeof createGameInputSchema>;

/** A game as it travels over the wire: dates are ISO-8601 strings, not `Date`. */
export const gameSchema = z.object({
  id: z.string().min(1),
  whitePlayer: z.string().min(1),
  blackPlayer: z.string().min(1),
  status: gameStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Game = z.infer<typeof gameSchema>;

export const gameListSchema = z.array(gameSchema);
export type GameList = z.infer<typeof gameListSchema>;

/** Path params for `GET /api/games/:id`. */
export const gameIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type GameIdParams = z.infer<typeof gameIdParamsSchema>;
