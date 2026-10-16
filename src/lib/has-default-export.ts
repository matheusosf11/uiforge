export function hasDefaultExport(code: string): boolean {
  return /export\s+default/.test(code);
}
