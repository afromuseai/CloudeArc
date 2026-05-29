import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import editRouter from "./edit";
import converseRouter from "./converse";
import askRouter from "./ask";
import previewRouter from "./preview";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/edit", editRouter);
router.use("/converse", converseRouter);
router.use("/ask", askRouter);
router.use(previewRouter);

export default router;
