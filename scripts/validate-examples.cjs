const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const root = path.resolve(__dirname, '..');
const examplesDir = path.join(root, 'examples');
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);

const schema = JSON.parse(fs.readFileSync(path.join(root, 'aeo.schema.json'), 'utf8'));
const validate = ajv.compile(schema);

function jsonFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(file);
    return entry.isFile() && entry.name.endsWith('.json') ? [file] : [];
  });
}

const files = jsonFiles(examplesDir);
if (files.length === 0) throw new Error('No JSON examples found');
for (const file of files) {
  const example = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!validate(example)) {
    throw new Error(`${path.relative(root, file)}: ${ajv.errorsText(validate.errors)}`);
  }
  console.log(`PASS ${path.relative(root, file)}`);
}

// A known-invalid control catches schema changes that accidentally make an
// unsigned audit endpoint acceptable. This is structural, not JWS verification.
const person = JSON.parse(fs.readFileSync(path.join(examplesDir, 'aeo-person.json'), 'utf8'));
person.audit = { mode: 'endpoint', endpoint_uri: 'https://example.com/audit' };
if (validate(person)) throw new Error('Unsigned endpoint unexpectedly passed');
const missing = new Set(
  (validate.errors || [])
    .filter((error) => error.keyword === 'required' && error.instancePath === '/audit')
    .map((error) => error.params.missingProperty)
);
if (!missing.has('signing_key_uri') || !missing.has('signature')) {
  throw new Error(`Unsigned endpoint failed for unexpected reason: ${ajv.errorsText(validate.errors)}`);
}
console.log('PASS known-invalid unsigned endpoint rejected');
