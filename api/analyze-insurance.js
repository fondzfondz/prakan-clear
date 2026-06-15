import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  return res.status(200).json({
    keyExists: !!process.env.GEMINI_API_KEY
  });
}
