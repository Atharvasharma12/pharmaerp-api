import { Router } from "express";
import {
  createTransferOrder,
  receiveTransferOrder,
  getTransferOrders,
  getTransferOrderById,
} from "../controllers/transferOrder.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../middlewares/workspaceContext.middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(workspaceContextMiddleware);

router.post("/", createTransferOrder);
router.get("/", getTransferOrders);
router.get("/:id", getTransferOrderById);
router.post("/:id/receive", receiveTransferOrder);

export default router;
