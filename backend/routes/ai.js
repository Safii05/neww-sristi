const express = require('express');
const OpenAI = require('openai');
const fs = require('fs');
const router = express.Router();

module.exports = (upload) => {
  router.post('/detect-crop', upload.single('image'), async (req, res) => {
    console.log("--- AI Detection Request Received ---");
    if (!req.file) {
      console.error("[Backend] Error: No file received");
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    console.log("[Backend] Image saved to:", imagePath);

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is missing in environment variables.");
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      console.log("[Backend] Calling OpenAI Vision API...");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional agronomist. Analyze the crop image and return ONLY a JSON object."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Analyze this agricultural crop image. Return the output STRICTLY in JSON format with these exact keys: cropName, healthStatus, possibleDisease, confidence, recommendation." 
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

      const content = response.choices[0].message.content;
      console.log("[Backend] Raw AI Response:", content);
      
      const result = JSON.parse(content);
      
      // Strict key enforcement for frontend binding
      const analysisResult = {
        cropName: result.cropName || "Unknown",
        healthStatus: result.healthStatus || "Unknown",
        possibleDisease: result.possibleDisease || "None",
        confidence: result.confidence || "0%",
        recommendation: result.recommendation || "No specific recommendation."
      };

      console.log("[Backend] Sending Sanitized JSON:", analysisResult);
      res.json(analysisResult);

    } catch (err) {
      console.error("[Backend] Critical Error:", err.message);
      res.status(500).json({ 
        cropName: "Error",
        healthStatus: "Failed",
        possibleDisease: "N/A",
        confidence: "0%",
        recommendation: "Internal Analysis Error: " + err.message
      });
    } finally {
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error("[Backend] File Cleanup Error:", err);
          else console.log("[Backend] Temp file cleaned up.");
        });
      }
    }
  });

  return router;
};
