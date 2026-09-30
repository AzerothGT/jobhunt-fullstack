import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import openApiSpec from "../config/openapi.js";

const router = Router();

router.get("/openapi.json", (_request, response) => {
  response.json(openApiSpec);
});

router.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default router;
