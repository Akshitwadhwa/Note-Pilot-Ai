import { Router } from "express";

import aiRoutes from "./ai.routes";
import notesRoutes from "./notes.routes";
import timetableRoutes from "./timetable.routes";
import usersRoutes from "./users.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "Backend is healthy" });
});

router.use("/timetable", timetableRoutes);
router.use("/notes", notesRoutes);
router.use("/ai", aiRoutes);
router.use("/users", usersRoutes);

export default router;
