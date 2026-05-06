import { Router, type IRouter } from "express";
import healthRouter from "./health";
import salonsRouter from "./salons";
import clientsRouter from "./clients";
import servicesRouter from "./services";
import employeesRouter from "./employees";
import appointmentsRouter from "./appointments";
import paymentsRouter from "./payments";
import expensesRouter from "./expenses";
import dashboardRouter from "./dashboard";
import publicRouter from "./public";
import adminRouter from "./admin";
import salonAuthRouter from "./salon-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/public", publicRouter);
router.use("/admin", adminRouter);
router.use("/salon-auth", salonAuthRouter);
router.use("/salons", salonsRouter);
router.use("/clients", clientsRouter);
router.use("/services", servicesRouter);
router.use("/employees", employeesRouter);
router.use("/appointments", appointmentsRouter);
router.use("/payments", paymentsRouter);
router.use("/expenses", expensesRouter);
router.use("/dashboard", dashboardRouter);

export default router;
