// api/gemini.js - Vercel Serverless Function
// SiliconFlow + Hugging Face ONLY - No Gemini!

const SILICONFLOW_URL = 'https://api.siliconflow.cn/v1';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const { mode, contents, prompt, systemInstruction } = payload;

    // 🚀 MODE 1: CHAT - Llama-3.1-8B (FREE)
    if (mode === 'text') {
      const response = await fetch(`${SILICONFLOW_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SILICONFLOW_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
          messages: [{ 
            role: 'user', 
            content: contents[0].parts[0].text 
          }],
          system: systemInstruction,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      const data = await response.json();
      
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: data.choices[0].message.content }]
          }
        }]
      });
    }

    // 🚀 MODE 2: REASONING - DeepSeek-R1 (FREE)
    else if (mode === 'reasoning') {
      const response = await fetch(`${SILICONFLOW_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SILICONFLOW_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
          messages: [{ 
            role: 'user', 
            content: contents[0].parts[0].text 
          }],
          temperature: 0.6,
          max_tokens: 4000
        })
      });

      const data = await response.json();
      
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: data.choices[0].message.content }]
          }
        }]
      });
    }

    // 🚀 MODE 3: VISION - GLM-4V-9B (FREE)
    else if (mode === 'vision') {
      const hasImage = contents[0].parts.some(part => part.image);
      
      if (hasImage) {
        const response = await fetch(`${SILICONFLOW_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SILICONFLOW_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'THUDM/glm-4v-9b',
            messages: [{
              role: 'user',
              content: contents[0].parts.map(part => 
                part.image ? {
                  type: 'image_url',
                  image_url: { url: part.image }
                } : {
                  type: 'text',
                  text: part.text
                }
              )
            }],
            temperature: 0.7
          })
        });

        const data = await response.json();
        
        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: data.choices[0].message.content }]
            }
          }]
        });
      } else {
        // Fallback to text mode
        const textResponse = await fetch(`${SILICONFLOW_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SILICONFLOW_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
            messages: [{ 
              role: 'user', 
              content: contents[0].parts[0].text 
            }],
            system: systemInstruction,
            temperature: 0.7,
            max_tokens: 2000
          })
        });

        const textData = await textResponse.json();
        
        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: textData.choices[0].message.content }]
            }
          }]
        });
      }
    }

    // 🚀 MODE 4: IMAGE GENERATION - Hugging Face FLUX.1 (FREE)
    else if (mode === 'image') {
      const response = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: prompt })
      });

      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      return res.status(200).json({
        predictions: [{
          bytesBase64Encoded: base64Image
        }]
      });
    }

    // 🚀 DEFAULT - Friendly fallback
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: "Namaste! Main PadhaiSetu hoon. Aapki kya madad kar sakta hoon?" }]
        }
      }]
    });

  } catch (error) {
    console.error('Function error:', error);
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: "माफ कीजिए, कुछ तकनीकी दिक्कत है। कृपया थोड़ी देर में फिर से कोशिश करें। 🙏" }]
        }
      }]
    });
  }
    }
