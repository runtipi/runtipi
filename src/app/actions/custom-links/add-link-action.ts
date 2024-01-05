'use server';

import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { db } from '@/server/db';
import { LinkInfo } from '@runtipi/shared';

export const addLink = async (link: LinkInfo) => {
  const linksService = new CustomLinksServiceClass(db);
  return linksService.add(link);
}

export const editLink = (link: LinkInfo) => {
  const linksService = new CustomLinksServiceClass(db);
  return linksService.edit(link);
}