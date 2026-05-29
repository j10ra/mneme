// Admin password at-rest encryption.
//
// Goal: ~/.mneme/config.json sometimes ends up in a backup, an iCloud
// drive, a Time Machine snapshot, or a stray `git add .`. The admin
// password sitting in those copies is a long-lived liability. Encrypt
// with a key derived from this machine's hardware fingerprint so the
// blob is useless without the machine.
//
// Threat model:
//   - File leaked WITHOUT the machine (backup, sync, accidental
//     commit) → ciphertext is useless, no machine ⇒ no key.
//   - File leaked WITH code execution as the user on the same machine
//     → attacker can run this same module, derives the same key, reads
//       the secret. Same boundary as the per-machine token already in
//       the file — encryption isn't claiming to defeat malware.
//
// Key derivation: scrypt(fingerprint, salt = "mneme-admin-secret-v1").
// AES-256-GCM with a 12-byte IV per record + 16-byte auth tag.
//
// Format: base64( iv[12] | tag[16] | ciphertext )

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { machineFingerprint } from "./config.ts";

const SALT = Buffer.from("mneme-admin-secret-v1");
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

/** Derive the encryption key from this machine's hardware fingerprint.
 *  Throws if the fingerprint isn't available — caller should fall back
 *  to plaintext stdin / env-var rather than persist anything. */
function deriveKey(): Buffer {
  const fp = machineFingerprint();

  if (!fp) {
    throw new Error("admin secret: no hardware fingerprint on this platform");
  }

  return scryptSync(fp, SALT, KEY_LEN);
}

export function encryptAdminPassword(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Returns null on any failure (fingerprint unavailable, ciphertext
 *  malformed, auth tag mismatch). Caller treats that as "fall through
 *  to the next rung" — never as a hard error. */
export function decryptAdminPassword(blob: string): string | null {
  try {
    const buf = Buffer.from(blob, "base64");

    if (buf.length < IV_LEN + TAG_LEN + 1) return null;

    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ct = buf.subarray(IV_LEN + TAG_LEN);
    const key = deriveKey();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);

    decipher.setAuthTag(tag);

    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);

    return pt.toString("utf8");
  } catch {
    return null;
  }
}
