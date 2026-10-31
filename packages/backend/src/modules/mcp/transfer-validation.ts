import { BadRequestException } from '@nestjs/common';
import { sanitizeFilename } from '@/common/helpers/file-helpers';

export const validateBackupFilename = (filename: string) => {
  if (sanitizeFilename(filename) !== filename || !filename.endsWith('.tar.gz')) throw new BadRequestException('Invalid backup filename');
  return filename;
};
