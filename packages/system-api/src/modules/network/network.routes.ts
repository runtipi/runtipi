import { Router } from 'express';
import NetworkController from './network.controller';

const router = Router();

router.route('/internal-ip').get(NetworkController.getInternalIp);

export default router;
