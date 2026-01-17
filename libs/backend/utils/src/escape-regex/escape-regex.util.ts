/**
 * Escapes special regex characters to prevent regex injection.
 * @param str - The string to escape
 * @returns Escaped string safe for use in regex
 * @example: "test.*admin" returns "test\\.\\*admin"
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
