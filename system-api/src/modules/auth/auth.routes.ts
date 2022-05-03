import { Router } from 'express';
import AuthController from './auth.controller';

const router = Router();

router.route('/login').post(AuthController.login);
router.route('/me').get(AuthController.me);
router.route('/configured').get(AuthController.isConfigured);
router.route('/register').post(AuthController.register);

export default router;
