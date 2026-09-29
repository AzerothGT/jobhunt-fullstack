import { HttpError } from "./errorHandler.js";

export function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseId(value, label = "id") {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, `${label} must be a positive integer`);
  }

  return id;
}
