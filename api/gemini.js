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

    console.log('📥 Received request:', { mode, hasContents: !!contents, hasPrompt: !!prompt });

    // 🚀 MODE 1: CHAT - Llama-3.1-8B (FREE)
    if (mode === 'text') {
      const userMessage = contents?.[0]?.parts?.[0]?.text || '';
      
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
            content: userMessage
          }],
          system: systemInstruction,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SiliconFlow API error:', response.status, errorText);
        throw new Error(`SiliconFlow API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📤 SiliconFlow response:', data);

      // ✅ Convert to Gemini format that frontend expects
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
      const userMessage = contents?.[0]?.parts?.[0]?.text || '';
      
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
            content: userMessage
          }],
          temperature: 0.6,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SiliconFlow API error:', response.status, errorText);
        throw new Error(`SiliconFlow API error: ${response.status}`);
      }

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
      // Check if there's an image in the request
      const hasImage = contents?.[0]?.parts?.some(part => part.image);
      
      if (hasImage) {
        // Format messages for vision model
        const messages = [{
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
        }];

        const response = await fetch(`${SILICONFLOW_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SILICONFLOW_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'THUDM/glm-4v-9b',
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('SiliconFlow Vision API error:', response.status, errorText);
          throw new Error(`SiliconFlow Vision API error: ${response.status}`);
        }

        const data = await response.json();

        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: data.choices[0].message.content }]
            }
          }]
        });
      } else {
        // No image, fallback to text mode
        const userMessage = contents?.[0]?.parts?.[0]?.text || '';
        
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
              content: userMessage
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
    }

    // 🚀 MODE 4: IMAGE GENERATION - Hugging Face FLUX.1 (FREE)
    else if (mode === 'image') {
      if (!prompt) {
        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: "Please provide a prompt for image generation." }]
            }
          }]
        });
      }

      const response = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: prompt })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Hugging Face API error:', response.status, errorText);
        
        // Check if model is loading
        if (response.status === 503 && errorText.includes('loading')) {
          return res.status(200).json({
            candidates: [{
              content: {
                parts: [{ text: "⏳ Image model is loading. Please try again in 20 seconds." }]
              }
            }]
          });
        }
        
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      return res.status(200).json({
        predictions: [{
          bytesBase64Encoded: base64Image
        }]
      });
    }

    // 🚀 MODE 5: TITLE GENERATION (Special case)
    else if (mode === 'title') {
      const userMessage = contents?.[0]?.parts?.[0]?.text || '';
      
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
            content: `Generate a very short title (max 4-5 words) for this chat: "${userMessage}"`
          }],
          temperature: 0.3,
          max_tokens: 30
        })
      });

      const data = await response.json();
      const title = data.choices[0].message.content.replace(/["']/g, '').trim();

      return res.status(200).json({
        text: title
      });
    }

    // 🚀 DEFAULT - Friendly fallback for unknown mode
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: "Namaste! Main PadhaiSetu hoon. Aapki kya madad kar sakta hoon?" }]
        }
      }]
    });

  } catch (error) {
    console.error('💥 Function error:', error);
    
    // Always return 200 with friendly message (never 500)
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: "माफ कीजिए, कुछ तकनीकी दिक्कत है। कृपया थोड़ी देर में फिर से कोशिश करें। 🙏" }]
        }
      }]
    });
  }
            }
