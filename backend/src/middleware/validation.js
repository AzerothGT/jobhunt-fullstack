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

export function isDuplicateEntry(error) {
  if (!error) return false;
  // MySQL / mysql2
  if (error.errno === 1062 || error.code === "ER_DUP_ENTRY") return true;
  // SQLite / libSQL (Turso)
  if (error.code === "SQLITE_CONSTRAINT" && String(error.message).includes("UNIQUE constraint failed")) {
    return true;
  }
  return false;
}
