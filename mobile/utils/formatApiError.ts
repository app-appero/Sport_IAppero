type ApiLikeError = {
  name?: string;
  status?: number;
  message?: string;
};

function isApiLikeError(err: unknown): err is ApiLikeError {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as ApiLikeError).name === 'ApiError' &&
    typeof (err as ApiLikeError).status === 'number'
  );
}

/**
 * Short Italian message for end users — never dump raw API JSON / paths.
 */
export function formatApiError(err: unknown): string {
  if (isApiLikeError(err)) {
    const status = err.status ?? 0;
    if (status === 404 || status === 502 || status === 503 || status === 504) {
      return 'Al momento il provider non è raggiungibile. Riprova tra poco.';
    }
    if (status >= 500) {
      return 'Il servizio dati non risponde. Riprova tra poco.';
    }
    if (status === 408 || status === 429) {
      return 'Il provider è lento o saturo. Riprova tra poco.';
    }
    return 'Non siamo riusciti a caricare i dati. Riprova tra poco.';
  }

  if (err instanceof TypeError) {
    return 'Connessione assente o instabile. Controlla la rete e riprova.';
  }

  if (err instanceof Error && /network|fetch|failed to fetch|timeout/i.test(err.message)) {
    return 'Connessione assente o instabile. Controlla la rete e riprova.';
  }

  return 'Qualcosa è andato storto. Riprova tra poco.';
}
