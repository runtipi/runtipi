import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

export const linkSchema = type({
  id: 'number',
  title: 'string > 0 & string <= 20',
  description: 'string <= 50 | null',
  url: 'string.url',
  iconUrl: 'string.url | "" | null',
  userId: 'number',
  isVisibleOnGuestDashboard: 'boolean = false',
});

const linkBodySchema = type({
  title: 'string > 0 & string <= 20',
  url: 'string.url',
  description: 'string <= 50?',
  iconUrl: 'string.url | ""?',
  isVisibleOnGuestDashboard: 'boolean = false',
});

const editLinkBodySchema = type({
  title: 'string > 0 & string <= 20',
  url: 'string.url',
  description: 'string <= 50?',
  iconUrl: 'string.url | ""?',
  isVisibleOnGuestDashboard: 'boolean?',
});

const linksSchema = type({
  links: linkSchema.array(),
});

export class LinkBodyDto extends createArkDto(linkBodySchema, { name: 'LinkBodyDto', input: true }) {}

export class EditLinkBodyDto extends createArkDto(editLinkBodySchema, { name: 'EditLinkBodyDto', input: true }) {}

export class LinksDto extends createArkDto(linksSchema, { name: 'LinksDto' }) {}
