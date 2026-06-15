import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  try {console.log(req.method);
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "สวัสดี Gemini",
    });

    return res.status(200).json({
      result: response.text,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
