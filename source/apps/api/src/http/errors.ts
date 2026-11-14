/** The one error shape every failed response carries. `problems` is present only when there are problems to list. */
export interface ErrorBody {
  error: string;
  problems?: string[];
}

/** Builds the error body. A list with no items is left out, so the shape stays `{ error }`. */
export function errorBody(error: string, problems: readonly string[] = []): ErrorBody {
  if (problems.length === 0) {
    return { error };
  }
  return { error, problems: [...problems] };
}
