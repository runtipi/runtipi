/** A util to check whether the object has a key, while inferring the correct key type */
// biome-ignore lint/suspicious/noShadowRestrictedNames: Reasoning: This is a utility function that is used to check whether an object has a key.
function hasOwnProperty<K extends string | number | symbol>(obj: Record<K, unknown>, key: string | number | symbol): key is K {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export { hasOwnProperty };
