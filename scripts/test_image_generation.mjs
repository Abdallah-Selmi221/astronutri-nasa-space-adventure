import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const keyMatch = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
const apiKey = keyMatch ? keyMatch[1].trim() : process.env.GEMINI_API_KEY;

async function testGeneration() {
  console.log('Testing image generation with gemini-3.1-flash-image (Nano Banana 2)...');
  
  // Prompt for a test asset
  const prompt = `A premium 3D cartoon floating space island for children game, organic rocky underside with layers, lush turquoise and mint green grass on top, glowing cute cartoon flowers and crystals, isometric 2.5D perspective, vibrant pastel colors, soft sunlight, white background, high resolution game asset.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    
    if (!res.ok) {
      console.error('API Error Response:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('Response keys:', Object.keys(data));
    const candidate = data.candidates?.[0];
    if (candidate) {
      console.log('Candidate finishReason:', candidate.finishReason);
      console.log('Parts count:', candidate.content?.parts?.length);
      candidate.content?.parts?.forEach((part, idx) => {
        if (part.text) {
          console.log(`Part ${idx} text:`, part.text.slice(0, 100));
        }
        if (part.inlineData) {
          console.log(`Part ${idx} inlineData mimeType:`, part.inlineData.mimeType, 'Data length:', part.inlineData.data?.length);
          fs.writeFileSync('scratch/test_island_raw.png', Buffer.from(part.inlineData.data, 'base64'));
          console.log('Saved test image to scratch/test_island_raw.png');
        }
      });
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testGeneration();
