// api/gemini.js - FINAL PRODUCTION VERSION
// SiliconFlow + Hugging Face - Zero Cost, Maximum Power

export default async function handler(req, res) {
  // CORS headers - browser access के लिए जरूरी
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: "Method not allowed. Please use POST." }]
        }
      }]
    });
  }

  try {
    const payload = req.body;
    console.log('📥 Received:', JSON.stringify(payload).substring(0, 200));

    const { mode, contents, prompt, systemInstruction } = payload;

    // ---------- MODE 1: TEXT / CHAT (SiliconFlow - Llama-3.1) ----------
    if (mode === 'text') {
      const userMessage = contents?.[0]?.parts?.[0]?.text || '';
      if (!userMessage) {
        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: "Please provide a message." }]
            }
          }]
        });
      }

      // Call SiliconFlow API
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SILICONFLOW_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
          messages: [{ role: 'user', content: userMessage }],
          system: systemInstruction,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SiliconFlow error:', response.status, errorText);
        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: "माफ कीजिए, AI सेवा में समस्या है। कृपया थोड़ी देर में प्रयास करें। 🙏" }]
            }
          }]
        });
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Return in Gemini format (what HTML expects)
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: aiResponse }]
          }
        }]
      });
    }

    // ---------- MODE 2: IMAGE GENERATION (Hugging Face - FLUX.1) ----------
    else if (mode === 'image') {
      const imagePrompt = prompt || "educational diagram";
      
      const response = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: imagePrompt })
      });

      if (!response.ok) {
        // Model loading हो रहा है?
        if (response.status === 503) {
          return res.status(200).json({
            candidates: [{
              content: {
                parts: [{ text: "⏳ Image model is loading. Please try again in 20 seconds." }]
              }
            }]
          });
        }
        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: "Image generation failed. Please try again." }]
            }
          }]
        });
      }

      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      // Special format for image generation
      return res.status(200).json({
        predictions: [{
          bytesBase64Encoded: base64Image
        }]
      });
    }

    // ---------- MODE 3: TITLE GENERATION (SiliconFlow) ----------
    else if (mode === 'title') {
      const text = contents?.[0]?.parts?.[0]?.text || "chat";
      
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SILICONFLOW_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
          messages: [{ 
            role: 'user', 
            content: `Generate a very short title (max 4 words) for this: "${text}"`
          }],
          temperature: 0.3,
          max_tokens: 30
        })
      });

      const data = await response.json();
      const title = data.choices[0].message.content.replace(/["']/g, '').trim();

      return res.status(200).json({ text: title });
    }

    // ---------- DEFAULT FALLBACK ----------
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: "Namaste! Main PadhaiSetu hoon. Aapki kya madad kar sakta hoon?" }]
        }
      }]
    });

  } catch (error) {
    console.error('🔥 Function error:', error);
    // Always return 200 with friendly message
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: "माफ कीजिए, कुछ तकनीकी दिक्कत है। कृपया थोड़ी देर में फिर से कोशिश करें। 🙏" }]
        }
      }]
    });
  }
        }
