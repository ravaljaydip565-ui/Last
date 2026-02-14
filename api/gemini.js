// Netlify Function for PadhaiSetu - ULTIMATE FIX
// Features: Auto-Clean API Key & Tries ALL Models (1.5 Flash -> 1.5 Pro -> 1.0 Pro)

exports.handler = async function (event, context) {
  // 1. CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    // 2. API Key Cleaning (Space hatana zaroori hai)
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'API Key missing in Netlify Settings' }) };
    
    // ✨ FIX: Phone se copy-paste wali space hatayi
    apiKey = apiKey.trim();

    // 3. Models List (Updated for stability)
    const modelsToTry = [
      'gemini-1.5-flash',       // Best Speed/Quality balance
      'gemini-1.5-pro',         // High Intelligence
      'gemini-pro'              // Legacy Fallback
    ];

    let payload;
    try {
        payload = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    let successResponse = null;
    let lastError = "Unknown error";

    // --- LOOP: Ek-ek karke model try karega ---
    for (const modelName of modelsToTry) {
      console.log(`🔄 Trying model: ${modelName}...`);
      
      try {
        let apiUrl = '';
        let requestBody = {};

        // Image Generation Mode
        if (payload.mode === 'image') {
           apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
           requestBody = { 
             instances: [{ prompt: payload.prompt || "Educational diagram" }], 
             parameters: { sampleCount: 1, aspectRatio: "1:1" } 
           };
        } 
        // Text/Chat Mode
        else {
           apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
           requestBody = {
            contents: payload.contents,
            generationConfig: payload.generationConfig || { temperature: 0.7 }
           };
           // System instruction (Supported in 1.5 only)
           if (payload.systemInstruction && modelName.includes('1.5')) {
            requestBody.systemInstruction = { parts: [{ text: payload.systemInstruction }] };
           }
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();

        if (response.ok) {
          console.log(`✅ Success with ${modelName}!`);
          successResponse = { statusCode: 200, headers, body: responseText };
          break; // Chal gaya! Loop band karo
        } else {
          console.warn(`❌ Failed ${modelName}: ${responseText.substring(0, 100)}`);
          lastError = responseText;
          if (payload.mode === 'image') break;
        }
      } catch (e) {
        console.error(`💥 Network Error on ${modelName}`);
        lastError = e.message;
      }
    }

    // 4. Final Response
    if (successResponse) {
      return successResponse;
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'All AI models failed.', 
          details: lastError 
        })
      };
    }

  } catch (error) {
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }) 
    };
  }
};
