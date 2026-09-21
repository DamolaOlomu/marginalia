/** An error whose message is safe to show to the user, with the HTTP status to send. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The server is missing configuration (an env var). The message tells the developer what to fix. */
export class ConfigError extends Error {}
