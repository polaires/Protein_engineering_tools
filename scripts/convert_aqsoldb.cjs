#!/usr/bin/env node
/**
 * Convert AqSolDB CSV to optimized JSON for browser-based lookup
 *
 * Creates a compact lookup file indexed by:
 * - Normalized name (lowercase, trimmed)
 * - SMILES string
 * - InChIKey
 *
 * Output format optimized for fast lookups and small file size
 */

const fs = require('fs');
const path = require('path');

// Input and output paths
const INPUT_CSV = process.argv[2] || '/tmp/AqSolDB/results/data_curated.csv';
const OUTPUT_JSON = path.join(__dirname, '../public/data/aqsoldb.json');

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_JSON);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Converting AqSolDB CSV to JSON...');
console.log(`Input: ${INPUT_CSV}`);
console.log(`Output: ${OUTPUT_JSON}`);

// Read CSV
const csvContent = fs.readFileSync(INPUT_CSV, 'utf-8');
const lines = csvContent.split('\n');

// Parse header
const header = parseCSVLine(lines[0]);
console.log('Columns:', header.join(', '));

// Find column indices
const nameIdx = header.indexOf('Name');
const smilesIdx = header.indexOf('SMILES');
const inchikeyIdx = header.indexOf('InChIKey');
const solubilityIdx = header.indexOf('Solubility'); // LogS
const molWtIdx = header.indexOf('MolWt');
const molLogPIdx = header.indexOf('MolLogP');

console.log(`Found columns: Name=${nameIdx}, SMILES=${smilesIdx}, InChIKey=${inchikeyIdx}, Solubility=${solubilityIdx}, MolWt=${molWtIdx}`);

// Parse data
const compounds = [];
const nameIndex = {};
const smilesIndex = {};
const inchikeyIndex = {};

let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  try {
    const fields = parseCSVLine(line);

    const name = fields[nameIdx]?.trim();
    const smiles = fields[smilesIdx]?.trim();
    const inchikey = fields[inchikeyIdx]?.trim();
    const logS = parseFloat(fields[solubilityIdx]);
    const molWt = parseFloat(fields[molWtIdx]);
    const molLogP = parseFloat(fields[molLogPIdx]);

    // Skip invalid entries
    if (!smiles || isNaN(logS) || isNaN(molWt)) {
      skipped++;
      continue;
    }

    // Calculate solubility in g/L from LogS
    // LogS is log10(mol/L), so mol/L = 10^LogS
    // g/L = mol/L * MW
    const solubilityMolL = Math.pow(10, logS);
    const solubilityGL = solubilityMolL * molWt;

    // Skip extremely insoluble compounds (< 0.001 mg/L) - likely errors
    if (solubilityGL < 1e-9) {
      skipped++;
      continue;
    }

    const idx = compounds.length;

    // Compact format: [name, smiles, inchikey, solubilityGL, molWt, molLogP]
    compounds.push([
      name || '',
      smiles,
      inchikey || '',
      Math.round(solubilityGL * 1e6) / 1e6, // 6 decimal places
      Math.round(molWt * 100) / 100,
      Math.round(molLogP * 100) / 100
    ]);

    // Build indices
    if (name) {
      const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!nameIndex[normalizedName]) {
        nameIndex[normalizedName] = idx;
      }
    }

    if (smiles) {
      smilesIndex[smiles] = idx;
    }

    if (inchikey) {
      inchikeyIndex[inchikey] = idx;
    }
  } catch (e) {
    skipped++;
  }
}

console.log(`Parsed ${compounds.length} compounds, skipped ${skipped} invalid entries`);

// Create output structure
const output = {
  version: '1.0',
  source: 'AqSolDB v1.0 (https://doi.org/10.1038/s41597-019-0151-1)',
  description: 'Curated aqueous solubility data from 9 public datasets',
  format: ['name', 'smiles', 'inchikey', 'solubilityGL', 'molWt', 'molLogP'],
  count: compounds.length,
  compounds: compounds,
  indices: {
    byName: nameIndex,
    bySmiles: smilesIndex,
    byInchikey: inchikeyIndex
  }
};

// Write JSON
const jsonContent = JSON.stringify(output);
fs.writeFileSync(OUTPUT_JSON, jsonContent);

const stats = fs.statSync(OUTPUT_JSON);
console.log(`Output file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

// Also create a minified version
const minifiedPath = OUTPUT_JSON.replace('.json', '.min.json');
fs.writeFileSync(minifiedPath, jsonContent);
console.log(`Minified version: ${minifiedPath}`);

console.log('Done!');

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}
