var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/server.ts
import express from "../node_modules/express/index.js";

// src/routes/system.routes.ts
import { Router } from "../node_modules/express/index.js";

// src/controllers/system.controller.ts
import si from "../node_modules/systeminformation/lib/index.js";
var getCpuInfo = (req, res) => __async(void 0, null, function* () {
  const cpuLoad = yield si.currentLoad();
  res.status(200).send({ load: cpuLoad.currentLoad });
});
var getDiskInfo = (req, res) => __async(void 0, null, function* () {
  const disk = yield si.fsSize();
  const rootDisk = disk.find((item) => item.mount === "/");
  if (!rootDisk) {
    throw new Error("Could not find root disk");
  }
  const result = {
    size: rootDisk.size,
    used: rootDisk.used,
    available: rootDisk.available
  };
  res.status(200).send(result);
});
var getMemoryInfo = (req, res) => __async(void 0, null, function* () {
  const memory = yield si.mem();
  const result = {
    total: memory.total,
    free: memory.free,
    used: memory.used
  };
  res.status(200).json(result);
});
var system_controller_default = { getCpuInfo, getDiskInfo, getMemoryInfo };

// src/routes/system.routes.ts
var router = Router();
router.route("/cpu").get(system_controller_default.getCpuInfo);
router.route("/disk").get(system_controller_default.getDiskInfo);
router.route("/memory").get(system_controller_default.getMemoryInfo);
var system_routes_default = router;

// src/server.ts
var app = express();
var port = 3001;
app.use("/system", system_routes_default);
app.listen(port, () => {
  console.log(`System API listening on port ${port}`);
});
//# sourceMappingURL=server.js.map
