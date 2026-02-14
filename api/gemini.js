// api/gemini.js - FINAL VERSION
// SiliconFlow + Hugging Face - No Gemini

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
    const { mode, contents, prompt, systemInstruction } = payload;

    // 🚀 MODE 1: CHAT / TEXT (Llama-3.1-8B)
    if (mode === 'text') {
      const userMessage = contents?.[0]?.parts?.[0]?.text || 'Hello';
      
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
        console.error('SiliconFlow error:', response.status, errorText);
        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: "माफ कीजिए, AI सेवा में समस्या है। कृपया थोड़ी देर में प्रयास करें। 🙏" }]
            }
          }]
        });
      }

      const data = await response.json();
      const reply = data.choices[0].message.content;

      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: reply }]
          }
        }]
      });
    }

    // 🚀 MODE 2: REASONING (DeepSeek-R1)
    else if (mode === 'reasoning') {
      const userMessage = contents?.[0]?.parts?.[0]?.text || '';
      
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SILICONFLOW_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
          messages: [{ role: 'user', content: userMessage }],
          temperature: 0.6,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: "माफ कीजिए, reasoning सेवा में समस्या है।" }]
            }
          }]
        });
      }

      const data = await response.json();
      const reply = data.choices[0].message.content;

      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: reply }]
          }
        }]
      });
    }

    // 🚀 MODE 3: VISION (GLM-4V-9B)
    else if (mode === 'vision') {
      // Check if there's an image in the request
      const hasImage = contents?.[0]?.parts?.some(part => part.image);
      
      if (hasImage) {
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

        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
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
          return res.status(200).json({
            candidates: [{
              content: {
                parts: [{ text: "माफ कीजिए, vision सेवा में समस्या है।" }]
              }
            }]
          });
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: reply }]
            }
          }]
        });
      } else {
        // No image, fallback to text mode
        const userMessage = contents?.[0]?.parts?.[0]?.text || '';
        
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

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return res.status(200).json({
          candidates: [{
            content: {
              parts: [{ text: reply }]
            }
          }]
        });
      }
    }

    // 🚀 MODE 4: IMAGE GENERATION (Hugging Face FLUX.1)
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
        if (response.status === 503 && errorText.includes('loading')) {
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
              parts: [{ text: "माफ कीजिए, image generation में समस्या है।" }]
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

    // 🚀 MODE 5: TITLE GENERATION (special case for generateSmartTitle)
    else if (mode === 'title') {
      const userMessage = contents?.[0]?.parts?.[0]?.text || '';
      
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SILICONFLOW_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
          messages: [{ role: 'user', content: `Generate a very short title (max 4 words) for this: "${userMessage}"` }],
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

    // Default fallback
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
