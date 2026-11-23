// Expected API errors carry a status and optional response fields; route()
// serializes them without treating them as unexpected server failures.
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
