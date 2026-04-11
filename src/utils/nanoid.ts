const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function nanoid(size = 6): string {
  let result = '';
  for (let i = 0; i < size; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}
