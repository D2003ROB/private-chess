import { z } from 'zod';

/**
 * `GET /health`. Returns 200 when the database answers, 503 when it does not —
 * the payload shape is identical either way so clients can parse it once.
 */
export const healthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['ok', 'down']),
  uptime: z.number().nonnegative(),
});
export type Health = z.infer<typeof healthSchema>;

/** Every non-2xx response from the API uses this envelope. */
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
