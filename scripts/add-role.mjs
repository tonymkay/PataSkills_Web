import fs from 'fs';

const path = 'data/questions.sample.json';
const questions = JSON.parse(fs.readFileSync(path, 'utf8'));

const roleBySeq = { 1: 'pair', 2: 'name', 3: 'meaning', 4: 'whereUsed', 5: 'name', 6: 'meaning', 7: 'whereUsed' };

let missing = 0;
for (const q of questions) {
  const role = roleBySeq[q.sequence];
  if (!role) {
    missing++;
    console.warn('no role for', q.id, 'sequence', q.sequence);
    continue;
  }
  q.role = role;
}

fs.writeFileSync(path, JSON.stringify(questions), 'utf8');
console.log('tagged', questions.length, 'questions;', missing, 'missing role');
