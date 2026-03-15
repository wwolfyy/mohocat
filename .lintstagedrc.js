const path = require('path');

const buildEslintCommand = (filenames) =>
  `next lint --fix --file ${filenames
    .map((f) => path.relative(process.cwd(), f))
    .join(' --file ')}`;

module.exports = {
  // Format standard web files
  '**/*.{js,jsx,ts,tsx}': [buildEslintCommand, 'prettier --write'],

  // Format styling and config files
  '**/*.{css,scss,md,html}': ['prettier --write'],
};
