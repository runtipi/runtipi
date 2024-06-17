'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';
import fs from 'fs';
import { DATA_DIR } from '@/config/constants';
import path from 'path';

const input = z.object({
  id: z.string(),
  archiveName: z.string(),
});

/**
 * Given an app id, backs up the app.
 */
export const backupAppAction = action(input, async ({ id, archiveName }) => {
  try {
    await ensureUser();

    await fs.promises.rm(path.join(DATA_DIR, 'backups', id, archiveName), { force: true, recursive: true });

    revalidatePath('/apps');
    revalidatePath(`/app/${id}`);
    revalidatePath(`/app-store/${id}`);

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
