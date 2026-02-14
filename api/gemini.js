// api/gemini.js - ULTIMATE FIXED VERSION
// SiliconFlow + Hugging Face - 100% Working

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      candidates: [{
        content: {
          parts: [{ text: "Method not allowed. Please use POST." }]
        }
      }]
    });
  }

  try {
    const payload = req.body;
    console.log('📥 Received payload:', JSON.stringify(payload).substring(0, 200));

    // IMPORTANT: Always return Gemini-compatible format
    // MODE 1: CHAT
    if (payload.mode === 'text' || payload.mode === 'reasoning') {
      const userMessage = payload.contents?.[0]?.parts?.[0]?.text || 
                         payload.prompt || 
                         "Hello";
      
      // Call SiliconFlow
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SILICONFLOW_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
          messages: [{ role: 'user', content: userMessage }],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SiliconFlow error:', response.status, errorText);
        
        // Return friendly message on error
        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: "माफ कीजिए, AI सेवा में समस्या है। कृपया थोड़ी देर में प्रयास करें। 🙏" }]
            }
          }]
        });
      }

      const data = await response.json();
      console.log('✅ SiliconFlow success');

      // Return in Gemini format
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: data.choices[0].message.content }]
          }
        }]
      });
    }

    // MODE 2: IMAGE GENERATION
    else if (payload.mode === 'image') {
      const prompt = payload.prompt || "educational diagram";
      
      const response = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: prompt })
      });

      if (!response.ok) {
        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: "⏳ Image model loading... Please try again in 20 seconds." }]
            }
          }]
        });
      }

      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      return res.status(200).json({
        predictions: [{
          bytesBase64Encoded: base64Image
        }]
      });
    }

    // MODE 3: TITLE GENERATION
    else if (payload.mode === 'title') {
      const text = payload.contents?.[0]?.parts?.[0]?.text || "chat";
      
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

    // DEFAULT FALLBACK
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
