import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const streamAppQuerySchema = type({
  appUrn: 'string',
  maxLines: 'number?',
});

const streamRuntipiQuerySchema = type({
  maxLines: 'number?',
});

export class StreamAppLogsQueryDto extends createArkDto(streamAppQuerySchema, { name: 'StreamAppLogsQueryDto', input: true }) {}
export class StreamRuntipiLogsQueryDto extends createArkDto(streamRuntipiQuerySchema, { name: 'StreamRuntipiLogsQueryDto', input: true }) {}
