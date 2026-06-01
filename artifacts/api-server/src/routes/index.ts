import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import aiSearchRouter from "./ai-search";
import vkSearchRouter from "./vk-search";
import vkOauthRouter from "./vk-oauth";
import collabSearchRouter from "./collab-search";
import geminiKeyRouter from "./gemini-key";
import vkMessagesRouter from "./vk-messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(aiSearchRouter);
router.use(vkOauthRouter);
router.use(vkSearchRouter);
router.use(collabSearchRouter);
router.use(geminiKeyRouter);
router.use(vkMessagesRouter);

export default router;
