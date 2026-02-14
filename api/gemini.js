// api/gemini.js  (Vercel / Netlify compatible)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const userMessage =
      body?.contents?.[0]?.parts?.[0]?.text || body?.prompt;

    if (!userMessage) {
      return res.status(400).json({ error: "Empty user message" });
    }

    /* ======================================================
       1️⃣ TRY SILICONFLOW (PRIMARY – VERY POWERFUL)
    ====================================================== */
    try {
      const sfRes = await fetch(
        "https://api.siliconflow.cn/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.SILICONFLOW_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "deepseek-ai/DeepSeek-V3",
            messages: [
              { role: "system", content: "You are an Indian school teacher. Answer from syllabus only." },
              { role: "user", content: userMessage }
            ],
            temperature: 0.4
          })
        }
      );

      if (sfRes.ok) {
        const sfData = await sfRes.json();
        const answer =
          sfData?.choices?.[0]?.message?.content;

        if (answer) {
          return res.status(200).json({
            choices: [
              {
                message: { content: answer }
              }
            ]
          });
        }
      }
    } catch (e) {
      console.warn("SiliconFlow failed, switching to HF");
    }

    /* ======================================================
       2️⃣ FALLBACK: HUGGINGFACE (STABLE)
    ====================================================== */
    const hfRes = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: userMessage,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.4
          }
        })
      }
    );

    const hfData = await hfRes.json();
    const hfText =
      Array.isArray(hfData)
        ? hfData[0]?.generated_text
        : hfData?.generated_text;

    return res.status(200).json({
      choices: [
        {
          message: {
            content: hfText || "Answer unavailable"
          }
        }
      ]
    });

  } catch (err) {
    console.error("Backend crash:", err);
    return res.status(500).json({
      choices: [
        {
          message: {
            content: "Server error. Please try again."
          }
        }
      ]
    });
  }
                                }
