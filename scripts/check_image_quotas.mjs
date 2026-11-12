import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const keyMatch = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
const apiKey = keyMatch ? keyMatch[1].trim() : process.env.GEMINI_API_KEY;

const modelsToTest = [
  'gemini-3-pro-image',
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-lite-image',
  'imagen-3.0-generate-002'
];

async function checkModels() {
  for (const m of modelsToTest) {
    console.log(`Checking ${m}...`);
    const isImagen = m.startsWith('imagen');
    const url = isImagen 
      ? `https://generativelanguage.googleapis.com/v1beta/models/${m}:predict?key=${apiKey}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    
    const body = isImagen
      ? { instances: [{ prompt: "test cartoon game asset" }], parameters: { sampleCount: 1 } }
      : { contents: [{ parts: [{ text: "test cartoon game asset" }] }] };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      console.log(`  ${m} -> Status: ${res.status}`);
      if (!res.ok) {
        const text = await res.text();
        const json = JSON.parse(text);
        console.log(`  ${m} error code:`, json.error?.code, 'limit:', json.error?.message?.slice(0, 150));
      } else {
        console.log(`  ${m} -> SUCCESS!`);
        break;
      }
    } catch (e) {
      console.error(`  ${m} error:`, e.message);
    }
  }
}

checkModels();
