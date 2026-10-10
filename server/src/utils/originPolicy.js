export function isAllowedOrigin(requestOrigin, configuredOrigin) {
  if (!requestOrigin) return true;
  try {
    const actual = new URL(requestOrigin).origin;
    const expected = new URL(configuredOrigin).origin;
    return actual === expected;
  } catch {
    return false;
  }
}
