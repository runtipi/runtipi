import { Router } from "express";
import { SystemController } from "../controllers";

const router = Router();

router.route("/cpu").get(SystemController.getCpuInfo);
router.route("/disk").get(SystemController.getDiskInfo);
router.route("/memory").get(SystemController.getMemoryInfo);

export default router;
