import { defineConfig } from 'orval';

/** Reads the API's OpenAPI spec and writes typed TanStack Query hooks. Run with the API on :8080. */
export default defineConfig({
  eul: {
    input: process.env.OPENAPI_URL ?? 'http://localhost:8080/docs-json',
    output: {
      target: 'src/generated/api.ts',
      mode: 'single',
      client: 'react-query',
      httpClient: 'fetch',
      clean: false,
      override: {
        mutator: { path: 'src/http.ts', name: 'http' },
        fetch: { includeHttpResponseReturnType: false },
        query: { useQuery: true, useMutation: true },
      },
    },
  },
});
