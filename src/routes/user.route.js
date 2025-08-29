import { Router } from "express";
import { createUser, loginUser } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/add-user").post(verifyJWT, createUser);
router.route("/login").post(loginUser);

export default router;
