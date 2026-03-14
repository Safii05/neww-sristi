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

      console.log("Starting Real-time AI Vision Analysis...");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Analyze this agricultural crop image precisely. Identify the crop type, health status, any specific disease symptoms or pests visible, confidence level of your analysis, and a professional farming recommendation. Return the output STRICTLY in JSON format with these exact keys: cropName, healthStatus, possibleDisease, confidence, recommendation." 
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
      console.log("AI Analysis Result:", content);
      
      const result = JSON.parse(content);
      res.json(result);

    } catch (err) {
      console.error("Critical AI Analysis Error:", err);
      // Even in error, we provide a structured 'Error' response so the UI stays stable
      res.status(500).json({ 
        cropName: "Analysis Failed",
        healthStatus: "Unknown",
        possibleDisease: "N/A",
        confidence: "0%",
        recommendation: "Please ensure the image is clear and try again. Technical error: " + err.message
      });
    } finally {
      // Ensure file cleanup
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error("Failed to delete temp file:", err);
        });
      }
    }
  });

  return router;
};
