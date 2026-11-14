import fs from 'fs';
import path from 'path';

// Read ELEVENLABS_API_KEY from .env without printing or leaking it
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/ELEVENLABS_API_KEY\s*=\s*([^\r\n]+)/);
if (!match || !match[1].trim()) {
  console.error('[ElevenLabs Pilot] ERROR: ELEVENLABS_API_KEY not found in .env');
  process.exit(1);
}
const apiKey = match[1].trim();

// Note: Library voice 'PmRaqkJ2uk3Y9jrp9UjJ' (Mawardy) requires ElevenLabs paid tier via API (HTTP 402 paid_plan_required).
// Premade voice 'TX3LPaxmHKxFdv7VOQHJ' (Liam - Energetic, Young Adult with Warmth) is fully accessible on the Free Tier
// and flawlessly synthesizes Egyptian Arabic on 'eleven_multilingual_v2'.
const VOICE_ID = 'TX3LPaxmHKxFdv7VOQHJ'; 
const VOICE_NAME = 'Liam - Energetic Young Mascot (eleven_multilingual_v2)';
const MODEL_ID = 'eleven_multilingual_v2';

const PILOT_LINES = [
  {
    id: 'pilot_01_welcome',
    filename: 'pilot_01_welcome.mp3',
    text: 'أهلًا يا بطل! أنا روبو، رفيقك في الرحلة دي. جاهز نطلع من الأرض ونستكشف القمر؟',
    context: 'Stage 1: Welcome & Academy Awakening'
  },
  {
    id: 'pilot_02_handrail',
    filename: 'pilot_02_handrail.mp3',
    text: 'امسك الدرابزين واسحب نفسك بهدوء ناحية الباب. خلي بالك، في الفضاء هتفضل تتحرك حتى بعد ما تسيب إيدك.',
    context: 'Stage 2: Zero-G Handrail Locomotion'
  },
  {
    id: 'pilot_03_loose_objects',
    filename: 'pilot_03_loose_objects.mp3',
    text: 'تنبيه يا بطل! في أدوات بتطفو جوه المركبة. لمّها بسرعة وثبّتها في أماكنها قبل ما تخبط في الأجهزة.',
    context: 'Stage 2: Loose Objects Emergency Scramble'
  },
  {
    id: 'pilot_04_eclss_success',
    filename: 'pilot_04_eclss_success.mp3',
    text: 'عاش يا بطل! كده ظبطت مسار المياه ورجع النظام يشتغل. شغل ممتاز!',
    context: 'Stage 3: ECLSS Water Processor Restoration'
  },
  {
    id: 'pilot_05_emotional_reflection',
    filename: 'pilot_05_emotional_reflection.mp3',
    text: 'عارف؟ أول يوم ليا في الأكاديمية كنت متحمس وخايف في نفس الوقت. بس من ساعة ما بدأنا المغامرة سوا، وأنا عرفت إننا نقدر نواجه أي تحدي. يلا نكمل رحلتنا!',
    context: 'Stage 4 / Emotional Arc: Pre-Reentry Bonding'
  }
];

const totalCharacters = PILOT_LINES.reduce((sum, item) => sum + item.text.length, 0);
console.log(`[ElevenLabs Pilot] Total characters to synthesize: ${totalCharacters} (Strict limit < 700 chars).`);

const artifactsDir = path.resolve('artifacts', 'elevenlabs-pilot');
const publicDir = path.resolve('public', 'audio', 'robo', 'pilot');
fs.mkdirSync(artifactsDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

async function synthesizeLine(item) {
  console.log(`[ElevenLabs Pilot] Synthesizing "${item.id}" (${item.text.length} chars)...`);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: item.text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.50,
        similarity_boost: 0.85,
        style: 0.15,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Synthesis failed for ${item.id} with status ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const artifactPath = path.join(artifactsDir, item.filename);
  const publicPath = path.join(publicDir, item.filename);

  fs.writeFileSync(artifactPath, buffer);
  fs.writeFileSync(publicPath, buffer);

  console.log(`[ElevenLabs Pilot]  Saved to ${artifactPath} (${buffer.length} bytes)`);
  return {
    ...item,
    bytes: buffer.length,
    characterCount: item.text.length
  };
}

async function checkSubscription() {
  const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: { 'xi-api-key': apiKey }
  });
  if (res.ok) {
    const data = await res.json();
    return {
      tier: data.tier,
      characterCount: data.character_count,
      characterLimit: data.character_limit,
      canExtendCharacterLimit: data.can_extend_character_limit
    };
  }
  return null;
}

async function main() {
  try {
    const preSub = await checkSubscription();
    console.log('[ElevenLabs Pilot] Pre-test subscription usage:', preSub);

    const results = [];
    for (const line of PILOT_LINES) {
      const res = await synthesizeLine(line);
      results.push(res);
      // Throttle
      await new Promise(r => setTimeout(r, 600));
    }

    const postSub = await checkSubscription();
    console.log('[ElevenLabs Pilot] Post-test subscription usage:', postSub);

    const manifest = {
      timestamp: new Date().toISOString(),
      voiceId: VOICE_ID,
      voiceName: VOICE_NAME,
      modelId: MODEL_ID,
      totalSynthesizedCharacters: totalCharacters,
      preUsage: preSub?.characterCount,
      postUsage: postSub?.characterCount,
      quotaUsedInPilot: (postSub?.characterCount || 0) - (preSub?.characterCount || 0),
      remainingQuota: (postSub?.characterLimit || 10000) - (postSub?.characterCount || 0),
      files: results
    };

    fs.writeFileSync(path.join(artifactsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('[ElevenLabs Pilot] All 5 clips successfully synthesized!');
  } catch (err) {
    console.error('[ElevenLabs Pilot] ERROR during pilot execution:', err);
    process.exit(1);
  }
}

main();
