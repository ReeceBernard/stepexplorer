import { Router } from "express";
import addLocationRouter from "./add-locations";
import exploredAreasRouter from "./get-explored-locations";

const router = Router();

router.use("/", addLocationRouter);
router.use("/", exploredAreasRouter);

export default router;
