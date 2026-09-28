const fs = require('fs');
const oldFormSchemas = fs.readFileSync('/tmp/old-formSchemas.ts', 'utf8');
const oldFormValidation = fs.readFileSync('/tmp/old-formValidation.ts', 'utf8');
const unifiedSchema = fs.readFileSync('src/schemas/unifiedSchema.ts', 'utf8');

// Old formSchemas uses double quotes for code
const schemaCodes = oldFormSchemas.match(/code: "F\/\d{1,2}"/g) || [];
// Old formValidation uses single quotes for keys
const validationCodes = oldFormValidation.match(/'F\/\d{1,2}':/g) || [];
// Unified uses double quotes
const unifiedCodes = unifiedSchema.match(/code: "F\/\d{1,2}"/g) || [];

console.log('=== OLD formSchemas.ts codes ===');
console.log(schemaCodes.map(s => s.replace('code: ', '').replace(/"/g, '')).join(', '));
console.log('Count:', schemaCodes.length);

console.log('\n=== OLD formValidation.ts codes ===');
console.log(validationCodes.map(s => s.replace(/'/g, '').replace(':', '')).join(', '));
console.log('Count:', validationCodes.length);

console.log('\n=== UNIFIED codes ===');
console.log(unifiedCodes.map(s => s.replace('code: ', '').replace(/"/g, '')).join(', '));
console.log('Count:', unifiedCodes.length);

// Check for differences
const schemaSet = new Set(schemaCodes.map(s => s.replace('code: ', '').replace(/"/g, '')));
const validationSet = new Set(validationCodes.map(s => s.replace(/'/g, '').replace(':', '')));
const unifiedSet = new Set(unifiedCodes.map(s => s.replace('code: ', '').replace(/"/g, '')));

console.log('\n=== Missing in Validation (formSchemas has, validation lacks) ===');
[...schemaSet].filter(c => !validationSet.has(c)).forEach(c => console.log('  -', c));

console.log('\n=== Missing in formSchemas (validation has, formSchemas lacks) ===');
[...validationSet].filter(c => !schemaSet.has(c)).forEach(c => console.log('  -', c));

console.log('\n=== Missing in Unified (old formSchemas has, unified lacks) ===');
[...schemaSet].filter(c => !unifiedSet.has(c)).forEach(c => console.log('  -', c));

console.log('\n=== Missing in Unified (old validation has, unified lacks) ===');
[...validationSet].filter(c => !unifiedSet.has(c)).forEach(c => console.log('  -', c));

console.log('\n=== Extra in Unified (unified has, old lacks) ===');
[...unifiedSet].filter(c => !schemaSet.has(c) && !validationSet.has(c)).forEach(c => console.log('  -', c));

// All forms in both
const allOld = new Set([...schemaSet, ...validationSet]);
console.log('\n=== Total unique forms in old sources ===');
console.log([...allOld].sort().join(', '));
console.log('Count:', allOld.size);

console.log('\n=== Unified vs All Old ===');
console.log('Unified missing:', [...allOld].filter(c => !unifiedSet.has(c)));
console.log('Unified extra:', [...unifiedSet].filter(c => !allOld.has(c)));