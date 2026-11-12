import express from "express";
const router = express.Router();
import { authMiddleware } from "../config/authMiddleware.js";
import { chatWithAI } from "../utils/aiHelper.js";

// Optional auth helper: if token is present verify it, but don't reject guests
const optionalAuth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    return authMiddleware(req, res, next);
  }
  req.user = { id: "guest", role: "guest" };
  next();
};

// 🔧 Helper function for AI calls
const generateAIResponse = async (req, res, prompt, type) => {
  try {
    const result = await chatWithAI(prompt, type);
    if (!result) throw new Error("AI service returned empty response");
    return res.json({ [type]: result });
  } catch (error) {
    console.error(`AI ${type} error:`, error.message);
    return res
      .status(500)
      .json({ error: `Failed to generate ${type}. Please try again later.` });
  }
};

// ✅ Chat endpoint
router.post("/chat", optionalAuth, async (req, res) => {
  const { message, context, prompt } = req.body;
  const userMessage = message || prompt;
  if (!userMessage)
    return res.status(400).json({ error: "Message or prompt is required" });

  await generateAIResponse(
    req,
    res,
    `You are an event assistant. Context: ${context || "General"}. Message: ${userMessage}`,
    "response"
  );
});

// ✅ Generate event plan
router.post("/generate-plan", optionalAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt)
    return res.status(400).json({ error: "Prompt is required" });

  const aiPrompt = `Generate a detailed event plan for: ${prompt}`;
  await generateAIResponse(req, res, aiPrompt, "plan");
});

// ✅ Generate Budget
router.post("/generate-budget", optionalAuth, async (req, res) => {
  const { prompt, eventType, attendees, duration, location } = req.body;
  const userPrompt = prompt || `Create a budget for a ${eventType || "event"} with ${attendees || 50} attendees${duration ? ` lasting ${duration} days` : ""}${location ? ` in ${location}` : ""}.`;

  await generateAIResponse(req, res, userPrompt, "budget");
});

// ✅ Generate Marketing
router.post("/generate-marketing", optionalAuth, async (req, res) => {
  const { prompt, eventDetails, contentType } = req.body;
  const userPrompt = prompt || (eventDetails ? `Marketing content (${contentType || 'general'}): ${eventDetails}` : "Create marketing campaign for upcoming event");

  await generateAIResponse(req, res, userPrompt, "marketing");
});

// ✅ Vendor recommendations
router.post("/generate-vendors", optionalAuth, async (req, res) => {
  const { prompt, eventType, location, budget, attendees } = req.body;
  const userPrompt = prompt || `Suggest vendors for a ${eventType || "event"} in ${location || "city"}. Budget: ${budget || "flexible"}, Attendees: ${attendees || "50"}.`;

  await generateAIResponse(req, res, userPrompt, "vendors");
});

// ✅ Timeline
router.post("/generate-timeline", optionalAuth, async (req, res) => {
  const { prompt, eventType, duration, startDate } = req.body;
  const userPrompt = prompt || `Create a timeline for a ${eventType || "event"} lasting ${duration || "1"} day(s)${startDate ? ` starting ${startDate}` : ""}.`;

  await generateAIResponse(req, res, userPrompt, "timeline");
});

// ✅ Risk Assessment
router.post("/generate-risks", optionalAuth, async (req, res) => {
  const { prompt, eventDetails, location, attendees } = req.body;
  const userPrompt = prompt || `Risk assessment for ${eventDetails || "event"} at ${location || "venue"} with ${attendees || "50"} attendees.`;

  await generateAIResponse(req, res, userPrompt, "risks");
});

export default router;
