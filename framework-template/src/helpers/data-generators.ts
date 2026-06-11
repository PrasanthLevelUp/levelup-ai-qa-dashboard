/**
 * Data generators — produce unique, realistic test data so tests stay
 * independent and re-runnable (no hard-coded values that collide on reruns).
 */

/** Random integer in [min, max]. */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Short random alphanumeric string. */
export function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[randomInt(0, chars.length - 1)];
  return out;
}

/** Unique email address, e.g. `test-1700000000000-ab12cd@example.com`. */
export function randomEmail(domain = 'example.com'): string {
  return `test-${Date.now()}-${randomString(6)}@${domain}`;
}

/** Unique username, e.g. `user_1700000000000_ab12`. */
export function randomUsername(prefix = 'user'): string {
  return `${prefix}_${Date.now()}_${randomString(4)}`;
}

/** A simple, valid-looking person record for form fills. */
export function randomPerson() {
  const first = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey'][randomInt(0, 5)];
  const last = ['Smith', 'Lee', 'Patel', 'Garcia', 'Nguyen', 'Khan'][randomInt(0, 5)];
  return {
    firstName: first,
    lastName: last,
    email: randomEmail(),
    username: randomUsername(),
    password: `Pw!${randomString(10)}`,
  };
}
