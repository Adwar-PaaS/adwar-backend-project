import { Decimal } from '@prisma/client/runtime/library';

export function toStringOrNull(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Decimal) return val.toString();
  if (typeof val.toString === 'function') return val.toString();
  return String(val);
}
