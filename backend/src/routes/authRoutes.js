import { Router } from "express";
import { addRole, login, me, register, switchRole } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/roles", requireAuth, addRole);
router.post("/switch", requireAuth, switchRole);

export default router;
