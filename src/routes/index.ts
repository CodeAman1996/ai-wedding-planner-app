import { Router } from "express";
import { listKnowledgeDocuments } from "../controllers/knowledgeController.js";
import { generateLocationRecommendations } from "../controllers/recommendationController.js";
import { onboardUser } from "../controllers/userController.js";
import { listVibes } from "../controllers/vibeController.js";
import { requireFirebaseAuth } from "../middlewares/firebaseAuth.js";
import { sendSuccess } from "../utils/apiResponse.js";

const router = Router();

router.get("/health", (_request, response) => {
  return sendSuccess(response, {
    statusCode: 200,
    message: "API is healthy",
    data: { ok: true }
  });
});

router.get("/api/v1/vibes", listVibes);
router.post("/api/v1/users/onboard", requireFirebaseAuth, onboardUser);
router.get("/api/v1/users/:userId/knowledge", requireFirebaseAuth, listKnowledgeDocuments);
router.post("/api/v1/recommendations/locations", requireFirebaseAuth, generateLocationRecommendations);

export { router };
