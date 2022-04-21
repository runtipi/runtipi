import { Router } from 'express';
import AppController from './apps.controller';

const router = Router();

router.route('/install/:id').post(AppController.installApp);
router.route('/update/:id').post(AppController.updateAppConfig);
router.route('/uninstall/:id').get(AppController.uninstallApp);
router.route('/stop/:id').get(AppController.stopApp);
router.route('/start/:id').get(AppController.startApp);
router.route('/list').get(AppController.listApps);
router.route('/info/:id').get(AppController.getAppInfo);
router.route('/form/:id').get(AppController.initalFormValues);

export default router;
