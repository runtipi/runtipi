import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// load
export class PullDto extends createZodDto(z.object({})) {}
