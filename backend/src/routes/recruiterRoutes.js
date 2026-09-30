import { Router } from "express";
import { getDashboard } from "../controllers/recruiterController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", requireAuth, requireRole("recruiter"), getDashboard);

export default router;
