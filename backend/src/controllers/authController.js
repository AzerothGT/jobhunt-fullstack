import bcrypt from "bcryptjs";
import { signToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { isDuplicateEntry } from "../middleware/validation.js";
import { addUserRole, createUser, findUserByEmail, findUserRoles } from "../models/userModel.js";

const ROLES = new Set(["job_seeker", "recruiter"]);
const ROLE_LABELS = { recruiter: "recruiter", job_seeker: "job seeker" };
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isText = (value) => typeof value === "string" && value.trim().length > 0;

function withoutPassword(user) {
  const { password: _password, ...rest } = user;
  return rest;
}

export async function register(request, response) {
  const { name, email, password, role } = request.body ?? {};

  if (!isText(name) || !isText(email) || !isText(password) || !isText(role)) {
    throw new HttpError(400, "name, email, password, and role are required");
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, "email is not valid");
  }

  if (!ROLES.has(role)) {
    throw new HttpError(400, "role must be job_seeker or recruiter");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  let user;
  try {
    user = await createUser({ name: name.trim(), email: email.trim(), password, role });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      throw new HttpError(409, "Email is already registered");
    }
    throw error;
  }

  response.status(201).json({ token: signToken(user), user });
}

export async function login(request, response) {
  const { email, password } = request.body ?? {};

  if (!isText(email) || !isText(password)) {
    throw new HttpError(400, "email and password are required");
  }

  const user = await findUserByEmail(email.trim());
  const matches = user && (await bcrypt.compare(password, user.password));

  if (!matches) {
    throw new HttpError(401, "Invalid email or password");
  }

  const safeUser = withoutPassword(user);
  response.status(200).json({ token: signToken(safeUser), user: safeUser });
}

export function me(request, response) {
  response.status(200).json({ user: request.user });
}

export async function addRole(request, response) {
  const { role } = request.body ?? {};

  if (!isText(role) || !ROLES.has(role)) {
    throw new HttpError(400, "role must be job_seeker or recruiter");
  }

  const roles = await addUserRole(request.user.id, role);
  response.status(200).json({ roles });
}

export async function switchRole(request, response) {
  const { role } = request.body ?? {};

  if (!isText(role) || !ROLES.has(role)) {
    throw new HttpError(400, "role must be job_seeker or recruiter");
  }

  const roles = await findUserRoles(request.user.id);
  if (!roles.includes(role)) {
    throw new HttpError(403, `Enable the ${ROLE_LABELS[role]} role first`);
  }

  const user = { ...request.user, role, roles };
  response.status(200).json({ token: signToken(user, role), user });
}
