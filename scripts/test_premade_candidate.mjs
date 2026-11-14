import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/ELEVENLABS_API_KEY\s*=\s*([^\r\n]+)/);
const apiKey = match[1].trim();

async function testVoice(voiceId, voiceName) {
  console.log(`Testing voice: ${voiceName} (${voiceId})...`);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: 'أهلًا يا بطل! أنا روبو، رفيقك في الرحلة دي. جاهز نطلع من الأرض ونستكشف القمر؟',
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.50,
        similarity_boost: 0.85,
        style: 0.15,
        use_speaker_boost: true
      }
    })
  });

  if (response.ok) {
    const buf = Buffer.from(await response.arrayBuffer());
    console.log(` SUCCESS! Generated ${buf.length} bytes for ${voiceName}`);
    fs.writeFileSync(`scratch/test_${voiceName}.mp3`, buf);
    return true;
  } else {
    console.log(` FAILED for ${voiceName}: ${response.status}`, await response.text());
    return false;
  }
}

async function run() {
  const candidates = [
    { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam' },
    { id: 'bIHbv24MWmeRgasZH58o', name: 'Will' },
    { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' }
  ];
  for (const c of candidates) {
    const ok = await testVoice(c.id, c.name);
    if (ok) break;
  }
}

run();
