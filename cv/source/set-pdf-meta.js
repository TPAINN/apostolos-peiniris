/**
 * set-pdf-meta.js — byte-safe PDF metadata injection for the CV PDFs.
 * Rewrites ONLY the /Info object (object 1, written first by Skia/PDF) and
 * rebuilds xref offsets. Content streams and link annotations are untouched.
 *
 * Usage: node cv/source/set-pdf-meta.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function utf16beHex(s) {
  let h = 'FEFF';
  for (const ch of s) h += ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
  return '<' + h + '>';
}

const META = {
  Author: 'Apostolos Peiniris',
  Subject: 'Curriculum Vitae — Full-Stack Developer (React, Kotlin/Jetpack Compose, Node.js, Java/Spring Boot, AI)',
  Keywords:
    'Apostolos Peiniris, Full-Stack Developer, CV, Resume, React, Java, Spring Boot, ' +
    'Hibernate, Kotlin, Jetpack Compose, Android, Node.js, Express, MongoDB, JavaScript, ' +
    'TypeScript, PostgreSQL, Supabase, Gemini, Claude, AI integration',
  Creator: 'Apostolos Peiniris',
};

const FILES = [
  'Apostolos_Peiniris_Modern_Developer_CV.pdf',
  'Apostolos_Peiniris_ATS_CV.pdf',
  'cv/CV_Apostolos_Peiniris_EN.pdf',
];

for (const name of FILES) {
  const file = path.join(ROOT, name);
  const buf = fs.readFileSync(file);

  // --- locate object 1 (Info) ---
  const obj1Head = buf.indexOf('1 0 obj');
  const bodyStart = buf.indexOf('<<', obj1Head);
  const bodyEnd = buf.indexOf('endobj', bodyStart);
  let body = buf.slice(bodyStart, bodyEnd).toString('latin1');
  if (body.includes('/Author')) { console.log(name, 'already has Author — skipping'); continue; }

  let inject = '';
  for (const [k, v] of Object.entries(META)) inject += `/${k} ${utf16beHex(v)}\n`;
  body = body.replace('/Creator', inject + '/Creator');
  const newObj1 = Buffer.concat([
    buf.slice(0, bodyStart),
    Buffer.from(body, 'latin1'),
    buf.slice(bodyEnd, buf.length),
  ]);
  const delta = Buffer.byteLength(body, 'latin1') - (bodyEnd - bodyStart);
  const obj1EndOld = bodyEnd; // index in ORIGINAL buffer of 'endobj' of object 1

  // --- parse original xref ---
  const mTrailer = lastIndexOfStr(newObj1, 'startxref');
  const sxPos = mTrailer + 'startxref'.length;
  // startxref points at the xref keyword in ORIGINAL coordinates; the tail of
  // newObj1 was shifted by `delta`, so translate before reading.
  const xrefOff = parseInt(newObj1.slice(sxPos, sxPos + 30).toString('latin1').trim(), 10) + delta;
  const xrefHead = newObj1.slice(xrefOff, xrefOff + 40).toString('latin1');
  const mSection = xrefHead.match(/xref\s+(\d+)\s+(\d+)\s*/);
  if (!mSection || mSection[1] !== '0') throw new Error('unexpected xref layout in ' + name);
  const count = parseInt(mSection[2], 10);
  const entriesStart = xrefOff + mSection[0].length;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const e = newObj1.slice(entriesStart + i * 20, entriesStart + (i + 1) * 20).toString('latin1');
    const off = parseInt(e.slice(0, 10), 10);
    const gen = e.slice(11, 16);
    const type = e.slice(17, 18);
    entries.push({ off: off + (off > obj1EndOld ? delta : 0), gen, type });
  }
  // trailer + startxref + EOF follow the entries
  const afterEntries = entriesStart + count * 20;
  const trailerPart = newObj1.slice(afterEntries); // "trailer\n<<...>>\nstartxref\nNNN\n%%EOF\n"

  // --- reassemble (xrefOff is already in shifted coordinates) ---
  const newXrefStart = xrefOff;
  let xref = 'xref\n0 ' + count + '\n';
  for (const e of entries) {
    xref += String(e.off).padStart(10, '0') + ' ' + e.gen.padStart(5, '0') + ' ' + e.type + ' \n';
  }
  const fixedTrailer = trailerPart
    .toString('latin1')
    .replace(/startxref\s*\d+\s*%%EOF/, 'startxref\n' + newXrefStart + '\n%%EOF');

  const out = Buffer.concat([
    newObj1.slice(0, xrefOff), // xrefOff is already in shifted coordinates
    Buffer.from(xref, 'latin1'),
    Buffer.from(fixedTrailer, 'latin1'),
  ]);
  fs.writeFileSync(file, out);
  console.log(name, '-> metadata injected,', out.length, 'bytes, delta', delta);
}

function lastIndexOfStr(buf, s) {
  for (let i = buf.length - s.length; i >= 0; i--) {
    if (buf.slice(i, i + s.length).toString('latin1') === s) return i;
  }
  return -1;
}
