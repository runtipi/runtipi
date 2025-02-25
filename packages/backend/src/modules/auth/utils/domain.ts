import psl from 'psl';
import { isFQDN } from 'validator';

export function getCookieDomain(domain?: string) {
  if (!domain || !isFQDN(domain)) {
    return undefined;
  }

  const parsed = psl.parse(domain);
  if (parsed.error) {
    return undefined;
  }

  if (parsed.listed) {
    return parsed.input;
  }

  return `.${parsed.domain}`;
}
