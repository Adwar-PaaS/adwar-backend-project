// export function toIEntity<T>(entity: any, extra: Partial<T> = {}): T {
//   if (!entity) return null;
//   return {
//     ...entity,
//     ...extra,
//   } as T;
// }

// export function toIEntities<T>(entities: any[], mapper?: (e: any) => T): T[] {
//   if (!entities) return [];
//   return mapper ? entities.map(mapper) : (entities as T[]);
// }

// export function getGoogleMapsLink(lat: number, lng: number): string {
//   return `https://www.google.com/maps?q=${lat},${lng}`;
// }
