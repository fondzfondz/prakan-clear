
// ตัวอย่าง Backend API สำหรับ Vercel
// path: /api/analyze-insurance.js
// ยังเป็นตัวอย่างโครงสร้าง ยังไม่ได้ต่อ GPT จริง
// ถ้าจะต่อจริง ต้องตั้ง OPENAI_API_KEY ใน Vercel Environment Variables

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json({
    result: "ตัวอย่าง API สำเร็จ: ขั้นถัดไปคือต่อ OpenAI GPT API ที่ไฟล์นี้ ไม่ใช่ใส่ API key ในหน้าเว็บ"
  });
}
