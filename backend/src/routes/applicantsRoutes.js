import { Router } from "express";
import { listMyApplications, updateApplicationStatus } from "../controllers/applicationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Spec-named aliases: "applicants" instead of "applications".
router.get("/mine", requireAuth, requireRole("job_seeker"), listMyApplications);
router.put("/:id", requireAuth, requireRole("recruiter"), updateApplicationStatus);

export default router;
