import { Router } from "express";
import multer from "multer";
import {
  createJob,
  deleteJob,
  getJob,
  listJobs,
  listMyJobs,
  updateJob,
} from "../controllers/jobController.js";
import { applyToJob, listJobApplicants } from "../controllers/applicationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

router.get("/", listJobs);
router.get("/mine", requireAuth, requireRole("recruiter"), listMyJobs);
router.post(
  "/:id/applications",
  requireAuth,
  requireRole("job_seeker"),
  upload.single("resume"),
  applyToJob,
);
router.get("/:id/applicants", requireAuth, requireRole("recruiter"), listJobApplicants);
router.get("/:id", getJob);
router.post("/", requireAuth, requireRole("recruiter"), createJob);
router.put("/:id", requireAuth, requireRole("recruiter"), updateJob);
router.delete("/:id", requireAuth, requireRole("recruiter"), deleteJob);

export default router;
