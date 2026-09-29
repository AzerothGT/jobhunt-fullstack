import { Router } from "express";
import {
  createJob,
  deleteJob,
  getJob,
  listJobs,
  listMyJobs,
  updateJob,
} from "../controllers/jobController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", listJobs);
router.get("/mine", requireAuth, requireRole("recruiter"), listMyJobs);
router.get("/:id", getJob);
router.post("/", requireAuth, requireRole("recruiter"), createJob);
router.put("/:id", requireAuth, requireRole("recruiter"), updateJob);
router.delete("/:id", requireAuth, requireRole("recruiter"), deleteJob);

export default router;
