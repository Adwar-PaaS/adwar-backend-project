export type Selector<T> = { select: T };

export function makeSelector<T extends object>(select: T): T {
  return select;
}
