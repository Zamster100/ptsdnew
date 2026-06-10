// See https://nextjs.org/docs/basic-features/eslint#lint-staged for details

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const buildEslintCommand = (filenames) =>
  `eslint --fix ${filenames
    .map((f) => path.relative(process.cwd(), f))
    .join(' ')}`

export default {
  '*.{js,jsx,ts,tsx}': (filenames) => {
    // Filter out config files to avoid ESLint errors
    const sourceFiles = filenames.filter(f => !f.includes('.lintstagedrc') && !f.includes('.eslintrc'))
    if (sourceFiles.length === 0) return []
    
    return [
      'yarn format',
      'yarn lint',
      buildEslintCommand(sourceFiles),
    ]
  },
}
