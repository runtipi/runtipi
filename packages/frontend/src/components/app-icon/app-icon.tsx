import type { AppStatus } from '@/types/app.types';
import clsx from 'clsx';
import { useState } from 'react';

type Tint = 'media' | 'monitoring' | 'development' | 'productivity' | 'network' | 'home' | 'security' | 'core';

const CATEGORY_TINTS: Record<string, Tint> = {
  media: 'media',
  music: 'media',
  photography: 'media',
  books: 'media',
  gaming: 'media',
  utilities: 'monitoring',
  development: 'development',
  ai: 'development',
  data: 'core',
  network: 'network',
  security: 'security',
  automation: 'home',
  finance: 'productivity',
  social: 'productivity',
  featured: 'productivity',
};

export const getCategoryTint = (categories?: readonly string[] | null): Tint => {
  for (const category of categories ?? []) {
    const tint = CATEGORY_TINTS[category];
    if (tint) return tint;
  }
  return 'productivity';
};

/**
 * Two letters standing for the app when its logo is not available, e.g. "Uptime Kuma" -> "Uk", "Plex" -> "Px".
 */
export const getMonogram = (name: string) => {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0] ?? '?';
  if (words.length > 1) return `${first[0]?.toUpperCase()}${words[1]?.[0]?.toLowerCase() ?? ''}`;

  const consonant = first.slice(1).match(/[^aeiouAEIOU]/)?.[0] ?? first[1] ?? '';
  return `${first[0]?.toUpperCase()}${consonant.toLowerCase()}`;
};

export type AppIconStatus = 'run' | 'off' | 'busy';

export const toIconStatus = (status?: AppStatus): AppIconStatus | undefined => {
  if (!status || status === 'missing') return undefined;
  if (status === 'running') return 'run';
  if (status === 'stopped') return 'off';
  return 'busy';
};

type Props = {
  name: string;
  urn?: string;
  /** Logo url, defaults to the app store logo of the urn */
  src?: string;
  categories?: readonly string[] | null;
  status?: AppIconStatus;
  size?: number;
  /** Grey the logo out, used for stopped apps */
  inactive?: boolean;
  className?: string;
};

export const AppIcon = ({ name, urn, src, categories, status, size = 48, inactive, className }: Props) => {
  const [failed, setFailed] = useState(false);
  const logo = src ?? (urn ? `/api/marketplace/apps/${urn}/image` : undefined);

  return (
    <span
      className={clsx('rt-tile', `rt-cat--${getCategoryTint(categories)}`, { 'rt-tile--off': inactive }, className)}
      style={{ width: size, height: size }}
    >
      <span className="rt-tile__face" style={{ fontSize: Math.round(size * 0.31) }}>
        {logo && !failed ? <img src={logo} alt="" loading="lazy" onError={() => setFailed(true)} /> : getMonogram(name)}
      </span>
      {status && <span className={clsx('rt-sdot', `rt-sdot--${status}`)} aria-hidden="true" />}
    </span>
  );
};
