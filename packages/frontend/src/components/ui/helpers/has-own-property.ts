/** A util to check whether the object has a key, while inferring the correct key type */
// oxlint-disable-next-line no-shadow-restricted-names -- This utility intentionally mirrors Object.prototype.hasOwnProperty naming.
function hasOwnProperty<K extends string | number | symbol>(obj: Record<K, unknown>, key: string | number | symbol): key is K {
  return Object.hasOwn(obj, key);
}

export { hasOwnProperty };
