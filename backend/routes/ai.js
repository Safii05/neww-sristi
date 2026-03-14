const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const router = express.Router();

module.exports = (upload) => {
  // Existing route - kept for backward compatibility if needed, but we focus on the new one
  router.post('/detect-crop', upload.single('image'), async (req, res) => {
    // ... (keeping existing logic for now or redirecting to the new one)
    res.redirect(307, '/api/analyze-crop');
  });

  router.post('/analyze-crop', upload.single('image'), async (req, res) => {
    console.log("--- [Backend] Gemini AI Crop Analysis Started ---");
    if (!req.file) {
      console.error("[Backend] Error: No file provided.");
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    
    // Fallback result function
    const sendFallback = (msg) => {
      return {
        cropName: "Tomato (Fallback)",
        healthStatus: "Healthy",
        possibleDisease: "None",
        confidence: "80%",
        recommendation: "Ensure regular watering and balanced fertilization. " + (msg || "")
      };
    };

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY in .env file.");
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      const prompt = "Analyze this crop image. Identify the crop name, its health status (Healthy/Unhealthy), any visible disease, an estimated confidence level, and a short farming recommendation. Return the result strictly as a JSON object with these keys: cropName, healthStatus, possibleDisease, confidence, recommendation. Do not include any extra text or markdown formatting.";

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: req.file.mimetype
          }
        }
      ]);

      const responseText = result.response.text();
      console.log("[Backend] Raw Gemini Response:", responseText);

      // Extract JSON from potentially markdown-wrapped response
      let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let analysisData;
      try {
        analysisData = JSON.parse(jsonStr);
      } catch (e) {
        console.error("[Backend] JSON Parse Error. Using regex extraction.");
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
          analysisData = JSON.parse(match[0]);
        } else {
          throw new Error("Could not parse AI response as JSON");
        }
      }

      // Standardize response
      const standardized = {
        cropName: analysisData.cropName || "Unknown",
        healthStatus: analysisData.healthStatus || "Unknown",
        possibleDisease: analysisData.possibleDisease || "None",
        confidence: analysisData.confidence || "70%",
        recommendation: analysisData.recommendation || "Consult a local agronomist."
      };

      console.log("[Backend] Final Analysis:", standardized);
      res.json(standardized);

    } catch (err) {
      console.error("[Backend] Analysis Error:", err.message);
      res.json(sendFallback(err.message));
    } finally {
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error("[Backend] Cleanup Error:", err);
        });
      }
    }
  });

  return router;
};
