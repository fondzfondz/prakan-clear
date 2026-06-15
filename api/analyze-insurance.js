export default async function handler(req, res) {
  try {
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
              parts: [
                { text: "ตอบกลับคำว่า FONDZ123 เท่านั้น" }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    return res.status(200).json({
      result: data?.candidates?.[0]?.content?.parts?.[0]?.text || data
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}