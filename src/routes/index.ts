import { Router } from "express";
import { listKnowledgeDocuments } from "../controllers/knowledgeController.js";
import { generateLocationRecommendations } from "../controllers/recommendationController.js";
import { onboardUser } from "../controllers/userController.js";
import { listVibes, seedVibes } from "../controllers/vibeController.js";
import { issueCsrfToken, requireCsrfProtection } from "../middlewares/csrf.js";
import { sendSuccess } from "../utils/apiResponse.js";

const router = Router();

router.get("/health", (_request, response) => {
  return sendSuccess(response, {
    statusCode: 200,
    message: "API is healthy",
    data: { ok: true }
  });
});

router.get("/api/v1/security/csrf-token", issueCsrfToken);
router.use("/api/v1", requireCsrfProtection);

router.get("/api/v1/vibes", listVibes);
router.post("/api/v1/vibes/seed", seedVibes);
router.post("/api/v1/users/onboard", onboardUser);
router.get("/api/v1/users/:userId/knowledge", listKnowledgeDocuments);
router.post("/api/v1/recommendations/locations", generateLocationRecommendations);

export { router };
