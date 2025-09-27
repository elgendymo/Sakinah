export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Result = {
  ok<T>(value: T): Result<T> {
    return { ok: true, value };
  },

  error<E>(error: E): Result<never, E> {
    return { ok: false, error };
  },

  isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
    return result.ok;
  },

  isError<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
    return !result.ok;
  },
};