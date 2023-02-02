/**
 *  This function takes an input of unknown type, checks if it is an object and not null,
 *  and returns it as a record of unknown values, if it is not an object or is null, returns an empty object.
 *
 *  @param {unknown} json - The input of unknown type.
 *  @returns {Record<string, unknown>} - The input as a record of unknown values, or an empty object if the input is not an object or is null.
 */
export const castAppConfig = (json: unknown): Record<string, unknown> => {
  if (typeof json !== 'object' || json === null) {
    return {};
  }
  return json as Record<string, unknown>;
};
