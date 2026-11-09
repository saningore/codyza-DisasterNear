export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

export class GeocodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeocodeError";
  }
}
