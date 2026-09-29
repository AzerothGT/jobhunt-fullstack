import jwt from "jsonwebtoken";
import { findUserById } from "../models/userModel.js";
import { HttpError } from "./errorHandler.js";

const ROLE_LABELS = { recruiter: "recruiter", job_seeker: "job seeker" };

export function signToken(user) {
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  });
}

export async function requireAuth(request, _response, next) {
  try {
    const [scheme, token] = (request.get("authorization") ?? "").split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "Authentication required");
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      throw new HttpError(401, "Invalid or expired token");
    }

    const user = await findUserById(Number(payload.sub));
    if (!user) {
      throw new HttpError(401, "Invalid or expired token");
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role) {
  return (request, _response, next) => {
    if (request.user?.role !== role) {
      next(new HttpError(403, `Only a ${ROLE_LABELS[role]} can perform this action`));
      return;
    }

    next();
  };
}
