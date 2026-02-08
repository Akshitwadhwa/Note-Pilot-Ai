import { Router } from "express";

import { registerUserController } from "../controllers/user.controller";
import { validate } from "../middleware/validate.middleware";
import { registerUserSchema } from "../validators/user.validator";

const router = Router();

router.post("/register", validate(registerUserSchema), registerUserController);

export default router;
