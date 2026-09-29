export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(_request, response) {
  response.status(404).json({ error: "Route not found" });
}

export function errorHandler(error, _request, response, _next) {
  const status = error.status ?? error.statusCode ?? 500;

  if (status >= 500) {
    console.error(error);
    response.status(500).json({ error: "Internal server error" });
    return;
  }

  response.status(status).json({ error: error.message });
}
