import { Router } from 'express';
import SystemController from './system.controller';

const router = Router();

router.route('/cpu').get(SystemController.getCpuInfo);
router.route('/disk').get(SystemController.getDiskInfo);
router.route('/memory').get(SystemController.getMemoryInfo);
router.route('/version/latest').get(SystemController.getLatestVersion);

export default router;
