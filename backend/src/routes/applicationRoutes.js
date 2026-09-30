import { Router } from "express";
import { listMyApplications, updateApplicationStatus } from "../controllers/applicationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/mine", requireAuth, requireRole("job_seeker"), listMyApplications);
router.patch("/:id/status", requireAuth, requireRole("recruiter"), updateApplicationStatus);

export default router;
