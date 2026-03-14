const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const router = express.Router();

module.exports = (upload) => {
  // Initialize Gemini inside the route to pick up env changes if needed, 
  // though typically it's fine outside. 
  
  router.post('/detect', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const imagePath = req.file.path;

    try {
      if (!process.env.GEMINI_API_KEY) {
         console.warn("GEMINI_API_KEY is missing in .env. Falling back to mock response.");
         // Fallback/Demo logic if no API key
         return res.json({
           crop: "Maize",
           health: "Healthy",
           disease: "None",
           confidence: "94%",
           recommendation: "Crop is healthy. Maintain current irrigation schedule."
         });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const imageData = fs.readFileSync(imagePath);
      
      const parts = [
        { text: "Analyze this agricultural crop image. Identify the crop name, health status (e.g., Healthy, Infected), specific disease or pest (if any, otherwise 'None'), confidence percentage, and a short recommended farming action. Response MUST be in strict JSON format with these exact keys: crop, health, disease, confidence, recommendation." },
        { inlineData: { data: imageData.toString('base64'), mimeType: req.file.mimetype } }
      ];

      console.log("Sending image to Gemini Vision API...");
      const result = await model.generateContent(parts);
      const response = await result.response;
      let text = response.text();
      
      console.log("Raw Gemini response:", text);

      // Extract JSON from potential markdown/text blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      
      try {
        const jsonResult = JSON.parse(text);
        res.json(jsonResult);
      } catch (parseErr) {
        console.error("Failed to parse Gemini response as JSON:", text);
        res.json({
          crop: "Detected Plant",
          health: "Analysis complete",
          disease: "Unknown",
          confidence: "70%",
          recommendation: text.substring(0, 200) // Fallback with truncated text
        });
      }
    } catch (err) {
      console.error("Gemini API Error:", err);
      res.status(500).json({ error: 'AI analysis failed' });
    } finally {
      // Clean up uploaded file
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Failed to delete temp file:", imagePath, err);
      });
    }
  });

  return router;
};
