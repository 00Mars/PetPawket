// scripts/network-import-shared.js
import fs from 'fs';
import fsPromises from 'fs/promises';
import readline from 'readline';
import { Readable } from 'stream';

export function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  return fallback;
}

export function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

export function inputPath() {
  return process.argv.slice(2).find((arg) => !arg.startsWith('--')) || null;
}

export function text(v, max = 1000) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

export function firstValue(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const hit = value.map((item) => text(item, 2048)).find(Boolean);
      if (hit) return hit;
    } else {
      const hit = text(value, 2048);
      if (hit) return hit;
    }
  }
  return null;
}

export function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export async function readCsvStream(input, onRow) {
  const stream = readline.createInterface({
    input,
    crlfDelay: Infinity,
  });
  let headers = null;
  let rowNumber = 0;
  for await (const line of stream) {
    if (!line.trim()) continue;
    rowNumber += 1;
    const cells = parseCsvLine(line);
    if (!headers) {
      headers = cells.map((header) => header.trim());
      continue;
    }
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] || '';
    });
    const keepGoing = await onRow(row, rowNumber);
    if (keepGoing === false) break;
  }
}

export async function readCsvRows(filePath, onRow) {
  return readCsvStream(fs.createReadStream(filePath), onRow);
}

export async function readCsvUrl(url, onRow) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'PetPawketNetworkImporter/1.0 (source candidate staging)',
    },
  });
  if (!resp.ok || !resp.body) {
    const body = await resp.text().catch(() => '');
    throw new Error(`CSV download failed (${resp.status}): ${body.slice(0, 240)}`);
  }
  return readCsvStream(Readable.fromWeb(resp.body), onRow);
}

export async function readJsonRecords(filePath, onRecord) {
  if (/\.(ndjson|jsonl|geojsonseq)$/i.test(filePath)) {
    const stream = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });
    let rowNumber = 0;
    for await (const line of stream) {
      const records = line.split('\u001e').map((part) => part.trim()).filter(Boolean);
      for (const record of records) {
        rowNumber += 1;
        const keepGoing = await onRecord(JSON.parse(record), rowNumber);
        if (keepGoing === false) return;
      }
    }
    return;
  }

  const raw = await fsPromises.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const records = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.items)
      ? parsed.items
      : Array.isArray(parsed.features)
        ? parsed.features
        : [parsed];
  for (let i = 0; i < records.length; i += 1) {
    const keepGoing = await onRecord(records[i], i + 1);
    if (keepGoing === false) break;
  }
}

export function petCategoryFromText(...parts) {
  const s = parts.filter(Boolean).join(' ').toLowerCase();
  if (!s) return null;
  const petContextText = s
    .replace(/\bhot dogs?\b/g, ' ')
    .replace(/\bpest(s| control)?\b/g, ' ');
  const hasPetContext = /\b(pet|pets|animal|animals|dog|dogs|cat|cats|canine|feline|puppy|puppies|kitten|kittens|paw|paws)\b/.test(petContextText);
  if (/\b(vet|veterinary|veterinarian|animal hospital|pet hospital)\b/.test(s)) return 'vet';
  if (/\b(animal shelter|pet shelter|humane society|spca)\b/.test(s)
    || (hasPetContext && /\bshelter\b/.test(s))) return 'shelter';
  if (/\b(animal rescue|pet rescue|dog rescue|cat rescue)\b/.test(s)
    || (hasPetContext && /\brescue\b/.test(s))) return 'rescue';
  if (/\b(kennel|pet boarding|dog boarding|cat boarding|pet hotel|dog hotel|pet resort|dog resort)\b/.test(s)
    || (hasPetContext && /\bboarding\b/.test(s))) return 'boarding';
  if (/\b(pet waste|dog waste|cat waste|pooper scooper|pooper scoopers|poop scoop|poop scooping|poop pickup|poop pick up|poop clean up|poop cleanup|dog poop|doody|litter box cleaning|cat litter cleaning|aquarium cleaning|fish tank cleaning|fish tank service)\b/.test(s)
    || (hasPetContext && /\b(cleaner|cleaners|cleaning|cleanup|clean up|waste removal|scoop|scooper|scoopers|scooping)\b/.test(s))) return 'cleaner';
  if (/\b(dog wash|pet wash|pet spa|pet salon|dog salon)\b/.test(s) || (hasPetContext && /\b(groom|groomer|grooming)\b/.test(s))) return 'groomer';
  if (/\b(dog daycare|doggy daycare|doggie daycare|pet daycare|dog day care|pet day care)\b/.test(s)
    || (hasPetContext && /\b(daycare|day care)\b/.test(s))) return 'daycare';
  if (/\b(pet care|pet sit|pets sit|pet sitting|pets sitting|pet sitter|pet sitters|dog sit|dog sitting|dog sitter|cat sit|cat sitting|cat sitter)\b/.test(s)) return 'sitter';
  if (/\b(dog walk|dog walking|dog walker|pet walk|pet walking|pet walker)\b/.test(s)) return 'walker';
  if (/\b(animal training|dog training|pet training|obedience|dog trainer|pet trainer|animal trainer|behaviorist|canine academy)\b/.test(s)
    || (hasPetContext && /\b(train|trainer|training)\b/.test(s))) return 'trainer';
  if (hasPetContext) return 'other';
  return null;
}

export function isPetRelated(...parts) {
  return !!petCategoryFromText(...parts);
}
