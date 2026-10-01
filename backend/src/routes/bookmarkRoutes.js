import { Router } from "express";
import { listMyBookmarks } from "../controllers/bookmarkController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/mine", requireAuth, requireRole("job_seeker"), listMyBookmarks);

export default router;
