import express from "express";
import { systemRoutes } from "./routes";

const app = express();
const port = 3001;

app.use("/system", systemRoutes);

app.listen(port, () => {
  console.log(`System API listening on port ${port}`);
});
