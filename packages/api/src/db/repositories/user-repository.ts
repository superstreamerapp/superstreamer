import { db } from "..";
import type { UserUpdate } from "../types";

export async function getUserIdByCredentials(name: string, password: string) {
  const user = await db
    .selectFrom("user")
    .select(["id", "password"])
    .where("username", "=", name)
    .executeTakeFirst();

  if (!user) {
    return null;
  }

  const match = await Bun.password.verify(password, user.password);
  if (!match) {
    return null;
  }

  return user.id;
}

export async function getUser(id: number) {
  return await db
    .selectFrom("user")
    .select(["id", "username"])
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
}

export async function updateUserSettings(
  id: number,
  fields: Pick<UserUpdate, "autoRefresh">,
) {
  return await db
    .updateTable("user")
    .set(fields)
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
}

export async function getUserSettings(id: number) {
  return await db
    .selectFrom("user")
    .select(["autoRefresh"])
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
}