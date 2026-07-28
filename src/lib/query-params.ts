/**
 * Multi-select filters are serialized as a single comma-joined query param (e.g.
 * `?status=PENDING,COMPLETED`) rather than repeated params, since `URLSearchParams.get` (used
 * throughout the API routes) only reads the first occurrence of a repeated key. This is the one
 * place that splits it back into an array for a Prisma `{ in: [...] }` filter.
 */
export function parseMultiParam(params: URLSearchParams, key: string): string[] | undefined {
  const raw = params.get(key);
  if (!raw) return undefined;
  const values = raw.split(",").map((v) => v.trim()).filter(Boolean);
  return values.length > 0 ? values : undefined;
}
