const express = require('express');
const OpenAI = require('openai');
const fs = require('fs');
const router = express.Router();

module.exports = (upload) => {
  router.post('/detect-crop', upload.single('image'), async (req, res) => {
    console.log("--- [Backend] AI Crop Detection Request Started ---");
    if (!req.file) {
      console.error("[Backend] Error: No file provided in the request.");
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    console.log("[Backend] Uploaded Image Path:", imagePath);

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("Missing OPENAI_API_KEY in .env file.");
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      console.log("[Backend] Requesting analysis from OpenAI Vision...");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional agronomist AI. Return ONLY valid JSON."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Analyze this crop image. Identify the crop name, health status (Healthy/Infected/At Risk), specific disease symptoms (or 'None'), confidence percentage, and a concise farming recommendation. You MUST return exactly this JSON schema: { \"cropName\": \"string\", \"healthStatus\": \"string\", \"possibleDisease\": \"string\", \"confidence\": \"string\", \"recommendation\": \"string\" }" 
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" }
      });

      const rawContent = response.choices[0].message.content;
      console.log("[Backend] Raw AI Response Content:", rawContent);
      
      const result = JSON.parse(rawContent);
      
      // Ensure NO fields are undefined with strict fallback mapping
      const standardizedResponse = {
        cropName: result.cropName || "Detected Crop",
        healthStatus: result.healthStatus || "Analysis Complete",
        possibleDisease: result.possibleDisease || "None Detected",
        confidence: result.confidence || "85%",
        recommendation: result.recommendation || "Maintain standard care based on visual inspection."
      };

      console.log("[Backend] Dispatched Standardized JSON:", standardizedResponse);
      res.json(standardizedResponse);

    } catch (err) {
      console.error("[Backend] Analysis Pipeline Failed:", err.message);
      res.status(500).json({ 
        cropName: "System Analysis",
        healthStatus: "Error",
        possibleDisease: "N/A",
        confidence: "0%",
        recommendation: "Internal server error during image processing: " + err.message
      });
    } finally {
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error("[Backend] Cleanup Failure:", err);
          else console.log("[Backend] Temporary file purged successfully.");
        });
      }
    }
  });

  return router;
};
