import fs from 'fs';
import path from 'path';

// Safely read ELEVENLABS_API_KEY from .env without printing or logging it
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/ELEVENLABS_API_KEY\s*=\s*([^\r\n]+)/);
if (!match || !match[1].trim()) {
  console.error('[ElevenLabs Campaign Pack] ERROR: ELEVENLABS_API_KEY not found in .env');
  process.exit(1);
}
const apiKey = match[1].trim();

// Locked consistent Robo mascot voice (Liam - Energetic Young Mascot on eleven_multilingual_v2)
const VOICE_ID = 'TX3LPaxmHKxFdv7VOQHJ';
const MODEL_ID = 'eleven_multilingual_v2';

const CAMPAIGN_VOICE_LINES = [
  {
    id: 'island_hop_welcome',
    text: 'يلا نطير بالسفينة الفضائية للجزيرة الجديدة! اربط الحزام يا بطل الفضاء!'
  },
  {
    id: 'planet_earth',
    text: 'أهلاً بك على كوكب الأرض! الجاذبية هنا واحد جي ومليان مياه وهوا نتنفسه!'
  },
  {
    id: 'planet_moon',
    text: 'أهلاً بك على القمر! الجاذبية هنا سُدس الأرض بس، هتنط فوق زي الكنغر!'
  },
  {
    id: 'planet_mars',
    text: 'وصلنا لكوكب المريخ الأحمر! الجاذبية هنا تلت جاذبية الأرض وعليه أكبر بركان في الفضاء!'
  },
  {
    id: 'planet_saturn',
    text: 'بص على حلقات زحل الذهبية! دي كلها صخور وجليد لامع بتلف حوالين الكوكب!'
  },
  {
    id: 'planet_jupiter',
    text: 'ده كوكب المشتري العملاق! جاذبيته تقيلة أوي، أكتر من ضعفين جاذبية الأرض!'
  },
  {
    id: 'asteroid_radar',
    text: 'رادار ناسا رصد كويكب عشرين عشرة بي كي! ماشي بسرعة كبيرة وبعيد عن الأرض بأمان تام!'
  },
  {
    id: 'nutrition_welcome',
    text: 'أهلاً في مختبر التغذية! اختار أربع وجبات متوازنة من غير فتات عشان نحمي أجهزة المركبة!'
  },
  {
    id: 'nutrition_tortilla',
    text: 'برافو! خبز التورتيلا هو بطل الفضاء لأنه ما بيتفتتش أبداً في انعدام الجاذبية!'
  },
  {
    id: 'nutrition_balance_tip',
    text: 'ركز يا كابتن! لازم نوازن بين البروتين والطاقة ونحط التورتيلا عشان الصندوق يكتمل صح!'
  },
  {
    id: 'health_welcome',
    text: 'في الفضاء عضلاتنا وقلبنا محتاجين رياضة ومية وأكل صحي كل يوم! جاهز للتحدي؟'
  },
  {
    id: 'suit_welcome',
    text: 'يلا نجهز بدلة الفضاء! اقفل الخوذة، واظبط الضغط على أربعة وتلاتة من عشرة، وتأكد من حبل الأمان!'
  },
  {
    id: 'engine_welcome',
    text: 'ركز معايا في غرفة المحرك! اشحن خلايا الوقود ونقي الأكسجين، وخلي بالك الحرارة ما تعلاش!'
  },
  {
    id: 'launch_welcome',
    text: 'الصاروخ جاهز على منصة الإطلاق! اشرب أملاح التوازن في المنطقة الخضرا ويلا نطلع القمر!'
  },
  {
    id: 'lunar_storm_warning',
    text: 'إنذار من رادار ناسا دونكي! عاصفة شمسية جاية! قرر توجه الطاقة للدروع ولا الصوبة الزراعية!'
  },
  {
    id: 'return_balance',
    text: 'وصلنا مرحلة العودة للأرض! رتب عينات القمر في الجهتين بالتساوي عشان الكبسولة تطير بأمان!'
  },
  {
    id: 'return_reentry',
    text: 'احنا داخلين الغلاف الجوي! حرك الكبسولة يمين وشمال عشان نحافظ على زاوية الأمان!'
  },
  {
    id: 'quiz_praise',
    text: 'الله عليك يا عبقري الفضاء! إجابة ممتازة مية في المية! استمر يا بطل!'
  },
  {
    id: 'quiz_hint',
    text: 'قربت جداً يا بطل! فكر تاني في المعلومة العلمية وجرب إجابة تانية!'
  },
  {
    id: 'mission_unlock',
    text: 'عاش يا بطل! فتحت محطة جديدة في مغامرة أرتميس! يلا بينا نكمل رحلتنا!'
  }
];

const publicDir = path.resolve('public', 'audio', 'robo', 'campaign');
const artifactsDir = path.resolve('artifacts', 'elevenlabs-campaign');
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(artifactsDir, { recursive: true });

const forceRegen = process.argv.includes('--force');

async function checkQuota() {
  const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: { 'xi-api-key': apiKey }
  });
  if (!res.ok) {
    throw new Error(`Subscription check failed with status ${res.status}`);
  }
  const d = await res.json();
  return {
    tier: d.tier,
    used: d.character_count || 0,
    limit: d.character_limit || 10000,
    remaining: (d.character_limit || 10000) - (d.character_count || 0)
  };
}

async function synthesizeClip(item) {
  const filename = `${item.id}.mp3`;
  const outPath = path.join(publicDir, filename);

  if (!forceRegen && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    console.log(`[SKIP] ${filename} already exists (${fs.statSync(outPath).size} bytes)`);
    return { id: item.id, filename, text: item.text, bytes: fs.statSync(outPath).size, skipped: true };
  }

  console.log(`[TTS] Synthesizing ${filename} (${item.text.length} chars)...`);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: item.text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.85,
          style: 0.18,
          use_speaker_boost: true
        }
      })
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS failed for ${item.id} (${res.status}): ${errText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`[SAVED] ${filename} (${buffer.length} bytes)`);
  return { id: item.id, filename, text: item.text, bytes: buffer.length, skipped: false };
}

async function main() {
  const totalChars = CAMPAIGN_VOICE_LINES.reduce((sum, l) => sum + l.text.length, 0);
  const preQuota = await checkQuota();
  console.log('[Quota Pre-Check]', preQuota, 'Planned chars:', totalChars);

  if (totalChars > preQuota.remaining) {
    console.error(`[ERROR] Planned characters (${totalChars}) exceed remaining quota (${preQuota.remaining}).`);
    process.exit(1);
  }

  const results = [];
  for (const item of CAMPAIGN_VOICE_LINES) {
    const res = await synthesizeClip(item);
    results.push(res);
    if (!res.skipped) {
      await new Promise((r) => setTimeout(r, 450));
    }
  }

  const postQuota = await checkQuota();
  console.log('[Quota Post-Check]', postQuota);

  const manifest = {
    generatedAt: new Date().toISOString(),
    voiceId: VOICE_ID,
    modelId: MODEL_ID,
    clipCount: results.length,
    totalCharactersInScript: totalChars,
    quotaRemaining: postQuota.remaining,
    clips: results
  };
  fs.writeFileSync(path.join(artifactsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Done! ${results.length} campaign clips ready in public/audio/robo/campaign/`);
}

main().catch((err) => {
  console.error('[ElevenLabs Campaign Pack ERROR]', err.message || err);
  process.exit(1);
});
