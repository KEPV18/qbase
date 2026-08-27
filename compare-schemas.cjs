const fs = require('fs');
const oldFormSchemas = fs.readFileSync('src/data/formSchemas.ts', 'utf8');
const oldFormValidation = fs.readFileSync('src/schemas/formValidation.ts', 'utf8');
const unifiedSchema = fs.readFileSync('src/schemas/unifiedSchema.ts', 'utf8');

// Old formSchemas uses single quotes for code
const schemaCodes = oldFormSchemas.match(/code: 'F\/\d{1,2}'/g) || [];
// Old formValidation uses single quotes for keys
const validationCodes = oldFormValidation.match(/'F\/\d{1,2}':/g) || [];
// Unified uses double quotes
const unifiedCodes = unifiedSchema.match(/code: "F\/\d{1,2}"/g) || [];

console.log('=== OLD formSchemas.ts codes ===');
console.log(schemaCodes.map(s => s.replace("code: '", '').replace(/'/g, '')).join(', '));
console.log('Count:', schemaCodes.length);

console.log('\n=== OLD formValidation.ts codes ===');
console.log(validationCodes.map(s => s.replace(/'/g, '').replace(':', '')).join(', '));
console.log('Count:', validationCodes.length);

console.log('\n=== UNIFIED codes ===');
console.log(unifiedCodes.map(s => s.replace('code: ', '').replace(/"/g, '')).join(', '));
console.log('Count:', unifiedCodes.length);

// Check for differences
const schemaSet = new Set(schemaCodes.map(s => s.replace("code: '", '').replace(/'/g, '')));
const validationSet = new Set(validationCodes.map(s => s.replace(/'/g, '').replace(':', '')));
const unifiedSet = new Set(unifiedCodes.map(s => s.replace('code: ', '').replace(/"/g, '')));

console.log('\n=== Missing in Validation (formSchemas has, validation lacks) ===');
[...schemaSet].filter(c => !validationSet.has(c)).forEach(c => console.log('  -', c));

console.log('\n=== Missing in formSchemas (validation has, formSchemas lacks) ===');
[...validationSet].filter(c => !schemaSet.has(c)).forEach(c => console.log('  -', c));

console.log('\n=== Missing in Unified (old has, unified lacks) ===');
[...schemaSet].filter(c => !unifiedSet.has(c)).forEach(c => console.log('  -', c));
[...validationSet].filter(c => !unifiedSet.has(c)).forEach(c => console.log('  -', c));

console.log('\n=== Extra in Unified (unified has, old lacks) ===');
[...unifiedSet].filter(c => !schemaSet.has(c) && !validationSet.has(c)).forEach(c => console.log('  -', c));