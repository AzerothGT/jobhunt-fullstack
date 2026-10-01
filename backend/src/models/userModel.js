import bcrypt from "bcryptjs";
import sql from "../config/db.js";
import { isDuplicateEntry } from "../middleware/validation.js";

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function createUser({ name, email, password, role }) {
  const result = await sql`
    INSERT INTO users (name, email, password, role)
    VALUES (${name}, ${email}, ${await hashPassword(password)}, ${role})
  `;

  const user = await findUserById(result.insertId ?? result.lastInsertRowid);
  await addUserRole(user.id, role);
  return withRoles(user);
}

export async function findUserById(id) {
  const [user] = await sql`
    SELECT id, name, email, role, created_at FROM users WHERE id = ${id}
  `;

  return user;
}

export async function findUserByEmail(email) {
  const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;

  return user && withRoles(user);
}

export async function findUserRoles(userId) {
  const rows = await sql`SELECT role FROM user_roles WHERE user_id = ${userId} ORDER BY role`;
  return rows.map((row) => row.role);
}

export async function addUserRole(userId, role) {
  try {
    await sql`INSERT INTO user_roles (user_id, role) VALUES (${userId}, ${role})`;
  } catch (error) {
    if (!isDuplicateEntry(error)) throw error;
  }
  return findUserRoles(userId);
}

export async function withRoles(user) {
  if (!user) return user;
  return { ...user, roles: await findUserRoles(user.id) };
}
