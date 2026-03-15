#!/usr/bin/env node

/**
 * Master script to update all static data
 * Runs all export scripts and provides summary of changes
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting static data update process...\n');

const scripts = [
  {
    name: 'Cats Data',
    script: 'export_cats_to_static.js',
    outputFile: '../../src/lib/cats-static-data.json',
  },
  {
    name: 'Points Data',
    script: 'export_points_to_static.js',
    outputFile: '../../src/lib/points-static-data.json',
  },
  {
    name: 'Feeding Spots Data',
    script: 'export_feeding_spots_to_static.js',
    outputFile: '../../src/lib/feeding-spots-static-data.json',
  },
];

let totalUpdated = 0;
const results = [];

for (const { name, script, outputFile } of scripts) {
  console.log(`📦 Updating ${name}...`);

  try {
    // Get file modification time before export
    const outputPath = path.join(__dirname, outputFile);
    const beforeTime = fs.existsSync(outputPath) ? fs.statSync(outputPath).mtime : null;

    // Run the export script
    execSync(`node ${script}`, {
      cwd: __dirname,
      stdio: 'inherit',
    });

    // Check if file was updated
    const afterTime = fs.existsSync(outputPath) ? fs.statSync(outputPath).mtime : null;
    const wasUpdated = !beforeTime || (afterTime && afterTime > beforeTime);

    if (wasUpdated) {
      totalUpdated++;
      results.push(`✅ ${name}: Updated`);
    } else {
      results.push(`⏸️  ${name}: No changes`);
    }
  } catch (error) {
    results.push(`❌ ${name}: Failed - ${error.message}`);
    console.error(`Error updating ${name}:`, error);
  }

  console.log(''); // Add spacing
}

// Summary
console.log('📊 Update Summary:');
console.log('==================');
results.forEach((result) => console.log(result));
console.log(`\nTotal files updated: ${totalUpdated}`);

if (totalUpdated > 0) {
  console.log('\n🎉 Static data has been updated!');
  console.log('💡 Remember to commit the changes and redeploy your application.');
} else {
  console.log('\n✨ All static data is already up-to-date!');
}

process.exit(0);
