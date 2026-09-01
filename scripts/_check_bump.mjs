import { readFileSync, writeFileSync } from 'fs';
const url = 'https://sdevofgaeiwkfinlmnab.supabase.co/storage/v1/object/public/play-assets/signs/bump.webp';
const res = await fetch(url);
console.log('status:', res.status);
if (res.ok) {
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync('C:/Users/LENOVO/Desktop/platform/PataProducts/play/scripts/output/preview2/bump_real.webp', buf);
  console.log('saved bump_real.webp, bytes:', buf.length);
}
