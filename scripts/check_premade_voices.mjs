import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/ELEVENLABS_API_KEY\s*=\s*([^\r\n]+)/);
const apiKey = match[1].trim();

async function checkVoices() {
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey }
  });
  if (res.ok) {
    const data = await res.json();
    console.log(`Found ${data.voices.length} accessible voices:`);
    for (const v of data.voices) {
      console.log(`- ID: ${v.voice_id} | Name: ${v.name} | Category: ${v.category} | Description: ${v.description || 'N/A'}`);
    }
  } else {
    console.error('Failed to get voices:', res.status, await res.text());
  }
}

checkVoices();
