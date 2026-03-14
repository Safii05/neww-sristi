const express = require('express');
const OpenAI = require('openai');
const fs = require('fs');
const router = express.Router();

module.exports = (upload) => {
  router.post('/detect-crop', upload.single('image'), async (req, res) => {
    if (!req.file) {
      console.error("No file received");
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is missing in environment variables.");
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      console.log("Starting Precise AI Analysis...");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional agronomist. Identify crop, health, disease, confidence, and recommendation based on images. You MUST return valid JSON ONLY."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Analyze this agricultural crop image. Return the output STRICTLY in JSON format with these exact keys and no others: cropName, healthStatus, possibleDisease, confidence, recommendation." 
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
      console.log("Backend Received API Response:", content);
      
      const result = JSON.parse(content);
      
      // Strict key filtering to ensure frontend compatibility
      const sanitizedResult = {
        cropName: result.cropName || "Unknown",
        healthStatus: result.healthStatus || "Unknown",
        possibleDisease: result.possibleDisease || "None",
        confidence: result.confidence || "0%",
        recommendation: result.recommendation || "No recommendation available."
      };

      res.json(sanitizedResult);

    } catch (err) {
      console.error("Critical AI Analysis Error:", err);
      res.status(500).json({ 
        cropName: "Error",
        healthStatus: "N/A",
        possibleDisease: "N/A",
        confidence: "0%",
        recommendation: "System error: " + err.message
      });
    } finally {
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error("Failed to delete temp file:", err);
        });
      }
    }
  });

  return router;
};
