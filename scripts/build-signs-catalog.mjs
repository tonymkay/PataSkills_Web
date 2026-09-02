import fs from 'fs';

const path = 'data/questions.sample.json';
const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
const questions = Array.isArray(raw) ? raw : raw.questions;

function classifyType(name, meaning) {
  const n = name.toLowerCase();
  const m = meaning.toLowerCase();
  if (n.startsWith('no ')) return 'prohibitory';
  if (m.includes('you must') || n.includes('ahead only') || n.includes('turn left ahead') ||
      n.includes('turn right ahead') || n.includes('keep left') || n.includes('cycle route (mandatory)') ||
      n.includes('give priority')) return 'mandatory';
  if (m.startsWith('warns')) return 'warning';
  if (n.includes('location') || n.includes('(informational)') || n.includes('plate') ||
      n.includes('two-way traffic (straight ahead)')) return 'informational';
  return 'regulatory';
}

const byPair = new Map();
for (const q of questions) {
  if (!q.pairId || !q.role) continue;
  if (!byPair.has(q.pairId)) byPair.set(q.pairId, {});
  const entry = byPair.get(q.pairId);
  if (q.role === 'name' || q.role === 'meaning' || q.role === 'whereUsed') {
    const key = `${q.signRef}-${q.role}`;
    entry[key] = q.answers[q.correctAnswer];
  }
}

const signs = [];
for (const [pairId, facts] of byPair) {
  for (const signRef of ['A', 'B']) {
    const name = facts[`${signRef}-name`];
    const meaning = facts[`${signRef}-meaning`];
    const whereUsed = facts[`${signRef}-whereUsed`];
    if (!name || !meaning || !whereUsed) continue;
    const signType = classifyType(name, meaning);
    const otherRef = signRef === 'A' ? 'B' : 'A';
    signs.push({
      signId: `${pairId}-${signRef}`,
      pairId,
      signRef,
      name,
      signType,
      meaning,
      whereUsed,
      explanation: `${meaning}. You'll typically see it ${whereUsed.charAt(0).toLowerCase()}${whereUsed.slice(1)}.`,
      memoryTip: `This is ${/^[aeiou]/.test(signType) ? 'an' : 'a'} ${signType} sign — ${name.toLowerCase()}.`,
      // placeholder — filled below once every sign is built, since "same
      // name across different pairs" can only be known after this loop
      relatedSignIds: [`${pairId}-${otherRef}`],
      image: null,
    });
  }
}

// A sign counts as "similar" to another when they share a name — meaning
// the same physical sign shows up as one half of more than one comparison
// pair (e.g. "No entry sign" is the correct answer for C1-A, C3-A, C5-A —
// three different pairIds, three different comparison partners). That's
// direct evidence of "at least 1 pair with this image" beyond just each
// sign's own pairId partner, which the placeholder above already covers.
const byName = new Map();
for (const s of signs) {
  if (!byName.has(s.name)) byName.set(s.name, []);
  byName.get(s.name).push(s.signId);
}
for (const s of signs) {
  const sameName = byName.get(s.name).filter((id) => id !== s.signId);
  const merged = new Set([...s.relatedSignIds, ...sameName]);
  s.relatedSignIds = [...merged];
}

const output = { questions, signs };
fs.writeFileSync(path, JSON.stringify(output), 'utf8');
console.log('wrote', questions.length, 'questions and', signs.length, 'signs');

