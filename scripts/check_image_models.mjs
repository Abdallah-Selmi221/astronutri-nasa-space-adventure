import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const keyMatch = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
const apiKey = keyMatch ? keyMatch[1].trim() : process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('No GEMINI_API_KEY found');
  process.exit(1);
}

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${await res.text()}`);
      return;
    }
    const data = await res.json();
    console.log('Total models available:', data.models?.length);
    
    const imageModels = data.models.filter(m => 
      m.name.includes('image') || 
      m.name.includes('imagen') || 
      m.supportedGenerationMethods?.includes('generateImages') ||
      m.supportedGenerationMethods?.includes('imageGeneration')
    );
    console.log('Image-related models:', JSON.stringify(imageModels.map(m => ({
      name: m.name,
      displayName: m.displayName,
      supportedGenerationMethods: m.supportedGenerationMethods
    })), null, 2));

    // Also check for gemini-3 or flash-image models
    const gemini3 = data.models.filter(m => m.name.includes('gemini-3') || m.name.includes('banana'));
    console.log('Gemini 3 models:', JSON.stringify(gemini3.map(m => m.name), null, 2));
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

listModels();
