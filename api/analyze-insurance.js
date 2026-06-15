export default async function handler(req, res) {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const text = body?.text || "";

    if (!text.trim()) {
      return res.status(400).json({
        error: "ไม่พบข้อความจากไฟล์ กรุณาอัปโหลด PDF ที่มีข้อความ หรือกรอกข้อมูลเอง"
      });
    }

    const prompt = `
คุณคือผู้ช่วยวิเคราะห์ใบเสนอขายประกันชีวิตของ Prakan Clear
หน้าที่คือสรุปข้อมูลแบบเป็นกลาง ไม่ขาย ไม่เชียร์ ไม่ฟันธง

ข้อความจากเอกสาร:
${text.slice(0, 16000)}

กรุณาวิเคราะห์เป็นภาษาไทย โดยจัดหัวข้อดังนี้:

📋 ข้อมูลที่พบจากเอกสาร
- บริษัทประกัน:
- ชื่อแบบประกัน:
- เบี้ยประกัน:
- ระยะเวลาชำระเบี้ย:
- ระยะเวลาคุ้มครอง:
- ทุนประกัน:

✅ ผลประโยชน์รับประกัน
- สรุปเฉพาะข้อมูลที่พบในเอกสาร

🎁 ผลประโยชน์ไม่รับประกัน / เงินปันผล
- ถ้าพบ ให้ระบุว่าไม่รับประกัน
- ถ้าไม่พบ ให้บอกว่าไม่พบข้อมูลในเอกสาร

⚠️ ข้อควรระวัง
- เงินคืนไม่เท่ากับ IRR
- ผลลัพธ์นี้ไม่ใช่คำแนะนำให้ซื้อ

🧾 สรุปภาษาง่าย
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini API error"
      });
    }

    return res.status(200).json({
      result:
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "ไม่สามารถวิเคราะห์ข้อมูลได้"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}