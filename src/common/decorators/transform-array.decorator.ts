import { Transform } from 'class-transformer';

export function TransformToArray() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return value;
      }
    }
    return Array.isArray(value) ? value : [value];
  });
}
