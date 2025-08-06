export function createResponseShape<
  T extends Record<string, any>,
  K extends keyof T,
  Extra extends Record<string, any> = object,
>(model: T, fields: readonly K[], extra?: Extra): Pick<T, K> & Extra {
  const shaped = {} as Pick<T, K>;

  for (const key of fields) {
    shaped[key] = model[key];
  }

  return {
    ...shaped,
    ...(extra || {}),
  } as Pick<T, K> & Extra;
}
