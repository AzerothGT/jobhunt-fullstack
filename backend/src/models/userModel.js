import bcrypt from "bcryptjs";
import sql from "../config/db.js";

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function createUser({ name, email, password, role }) {
  const result = await sql`
    INSERT INTO users (name, email, password, role)
    VALUES (${name}, ${email}, ${await hashPassword(password)}, ${role})
  `;

  return findUserById(result.insertId ?? result.lastInsertRowid);
}

export async function findUserById(id) {
  const [user] = await sql`
    SELECT id, name, email, role, created_at FROM users WHERE id = ${id}
  `;

  return user;
}

export async function findUserByEmail(email) {
  const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;

  return user;
}
