import { Router } from 'express';
import AppController from './apps.controller';

const router = Router();

router.route('/install/:id').post(AppController.installApp);
router.route('/uninstall').post(AppController.uninstallApp);
router.route('/list').get(AppController.listApps);
router.route('/info/:id').get(AppController.getAppInfo);

export default router;
