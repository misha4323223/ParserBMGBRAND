import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import aiSearchRouter from "./ai-search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(aiSearchRouter);

export default router;
