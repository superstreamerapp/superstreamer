import * as crypto from "secure-encrypt";
import { env } from "../env";

const secret = env.SUPER_SECRET ?? "__UNSECURE__";

export function encrypt(value: string) {
  return btoa(crypto.encrypt(value, secret));
}

export function decrypt(value: string) {
  return crypto.decrypt(atob(value), secret);
}
