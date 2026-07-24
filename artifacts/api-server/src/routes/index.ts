import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import salonsRouter from "./salons.js";
import clientsRouter from "./clients.js";
import servicesRouter from "./services.js";
import employeesRouter from "./employees.js";
import appointmentsRouter from "./appointments.js";
import paymentsRouter from "./payments.js";
import expensesRouter from "./expenses.js";
import dashboardRouter from "./dashboard.js";
import reportsRouter from "./reports.js";
import publicRouter from "./public.js";
import adminRouter from "./admin.js";
import salonAuthRouter from "./salon-auth.js";

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
router.use("/reports", reportsRouter);

export default router;
