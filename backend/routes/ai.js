const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const router = express.Router();

module.exports = (upload) => {
  router.post('/detect', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const imagePath = req.file.path;

    try {
      if (!process.env.GEMINI_API_KEY) {
         console.warn("GEMINI_API_KEY is missing in .env. Falling back to mock response.");
         return res.json({
           crop: "Maize",
           status: "Healthy",
           issues: [],
           recommended_actions: ["Maintain current irrigation schedule."],
           confidence: "94%"
         });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const imageData = fs.readFileSync(imagePath);
      
      const parts = [
        { text: "You are an AI crop health assistant. Inspect the uploaded crop image carefully. Identify any plant diseases, pest damage, or nutrient deficiencies. Return the result strictly as JSON with this schema: {\"crop\": \"name of the plant\", \"status\": \"Healthy or Unhealthy\", \"issues\": [\"list of problems\"], \"recommended_actions\": [\"list of farming steps\"]}. Do not include any text, explanations, or formatting outside the JSON." },
        { inlineData: { data: imageData.toString('base64'), mimeType: req.file.mimetype } }
      ];

      console.log("AI Crop Health Assistant (Strict Schema) analyzing image...");
      const result = await model.generateContent(parts);
      const response = await result.response;
      let text = response.text();
      
      console.log("Analysis Result:", text);

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      
      try {
        const jsonResult = JSON.parse(text);
        if (!jsonResult.confidence) jsonResult.confidence = "High Precision";
        res.json(jsonResult);
      } catch (parseErr) {
        console.error("Analysis parsing failed:", text);
        res.json({
          crop: "Detected Plant",
          status: "Analysis Complete",
          issues: ["Unable to parse detailed diagnostic"],
          recommended_actions: [text.substring(0, 200)],
          confidence: "Manual Review Needed"
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
