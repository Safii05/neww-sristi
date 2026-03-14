const express = require('express');
const OpenAI = require('openai');
const fs = require('fs');
const router = express.Router();

module.exports = (upload) => {

  /* Redirect old route */
  router.post('/detect-crop', upload.single('image'), async (req, res) => {
    res.redirect(307, '/api/analyze-crop');
  });

  /* Main AI analysis route using OpenAI Vision API */
  router.post('/analyze-crop', upload.single('image'), async (req, res) => {
    console.log("---- [Backend] OpenAI Vision Crop Analysis Started ----");

    if (!req.file) {
      console.error("[Backend] No image uploaded");
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imagePath = req.file.path;

    if (!process.env.OPENAI_API_KEY) {
      console.error("[Backend] OPENAI_API_KEY missing");
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      return res.status(400).json({ error: "OPENAI_API_KEY missing in .env file" });
    }

    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      /* Convert image to base64 */
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = req.file.mimetype;

      console.log("[Backend] Dispatching Vision request to OpenAI (gpt-4o-mini)...");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert agricultural AI. Return ONLY valid JSON."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this crop image and return a JSON object with these fields: cropName, healthStatus (Healthy/Unhealthy), disease (name or 'None'), confidence (percentage), and recommendation (farming advice). Return JSON only."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices[0].message.content;
      console.log("[Backend] Raw OpenAI Response:", rawContent);

      /* Parse JSON response */
      const parsed = JSON.parse(rawContent);

      const finalResponse = {
        cropName: parsed.cropName || "Unknown",
        healthStatus: parsed.healthStatus || "Unknown",
        disease: parsed.disease || parsed.possibleDisease || "None",
        confidence: parsed.confidence || "85%",
        recommendation: parsed.recommendation || "Monitor crop condition regularly."
      };

      console.log("[Backend] Final Diagnostic Dispatched:", finalResponse);
      res.json(finalResponse);

    } catch (err) {
      console.error("[Backend] OpenAI Vision Error:", err.message);
      res.status(500).json({
        error: "AI analysis failed",
        details: err.message
      });
    } finally {
      /* Cleanup uploaded image */
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
          console.log("[Backend] Temporary file purged.");
        } catch (cleanupErr) {
          console.error("[Backend] Cleanup Error:", cleanupErr.message);
        }
      }
    }
  });

  return router;
};