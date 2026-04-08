import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import aiSearchRouter from "./ai-search";
import vkSearchRouter from "./vk-search";
import gisSearchRouter from "./gis-search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(aiSearchRouter);
router.use(vkSearchRouter);
router.use(gisSearchRouter);

export default router;
