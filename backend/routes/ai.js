const express = require('express');
const axios = require('axios');
const fs = require('fs');
const router = express.Router();

module.exports = (upload) => {

  /* Redirect old route */
  router.post('/detect-crop', upload.single('image'), async (req, res) => {
    res.redirect(307, '/api/analyze-crop');
  });

  /* Main AI analysis route using Gemini REST API */
  router.post('/analyze-crop', upload.single('image'), async (req, res) => {
    console.log("---- [Backend] Gemini REST API Crop Analysis Started ----");

    if (!req.file) {
      console.error("[Backend] No image uploaded");
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imagePath = req.file.path;

    if (!process.env.GEMINI_API_KEY) {
      console.error("[Backend] GEMINI_API_KEY missing");
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      return res.status(400).json({ error: "GEMINI_API_KEY missing in .env file" });
    }

    try {
      /* Convert image to base64 */
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = req.file.mimetype;

      const prompt = `
You are an agricultural AI expert.
Analyze the crop image and return ONLY a JSON object with the following fields:
{
  "cropName": "name of plant",
  "healthStatus": "Healthy or Unhealthy",
  "disease": "disease name or 'None'",
  "confidence": "percentage like '92%'",
  "recommendation": "short farming advice"
}
Return JSON only, no markdown formatting.
`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json"
        }
      };

      console.log("[Backend] Dispatching REST request to Gemini...");
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.data || !response.data.candidates || !response.data.candidates[0].content || !response.data.candidates[0].content.parts[0].text) {
        throw new Error("Invalid response structure from Gemini API");
      }

      const responseText = response.data.candidates[0].content.parts[0].text;
      console.log("[Backend] Raw Gemini REST Response:", responseText);

      /* Parse JSON response */
      let parsed;
      try {
        parsed = JSON.parse(responseText.trim());
      } catch (e) {
        console.warn("[Backend] JSON Parse failed, attempting regex extraction...");
        const match = responseText.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : {};
      }

      const finalResponse = {
        cropName: parsed.cropName || "Unknown",
        healthStatus: parsed.healthStatus || "Unknown",
        disease: parsed.disease || "None",
        confidence: parsed.confidence || "80%",
        recommendation: parsed.recommendation || "Maintain regular observation."
      };

      console.log("[Backend] Final Diagnostic Dispatched:", finalResponse);
      res.json(finalResponse);

    } catch (err) {
      console.error("[Backend] Gemini REST Error:", err.response ? err.response.data : err.message);
      res.status(500).json({
        error: "AI analysis failed",
        details: err.response ? err.response.data : err.message
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