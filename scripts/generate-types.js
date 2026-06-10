// scripts/generate-types.js
import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'

const packageJsonPath = path.join(process.cwd(), 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

// Store original type
const originalType = packageJson.type

try {
	// Temporarily remove type: module
	delete packageJson.type
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

	// Ensure output directory exists
	const outputPath = path.join('src', 'types', 'generated', 'contentful.d.ts')
	fs.mkdirSync(path.dirname(outputPath), { recursive: true })

	// Run the generate-types command
	execSync(
		`npx contentful-typescript-codegen --output ${outputPath}`,
		{
			stdio: 'inherit',
		},
	)

	console.log('✅ Types generated successfully!')
} catch (error) {
	console.error('❌ Error generating types:', error.message)
} finally {
	// Restore original type
	if (originalType) {
		packageJson.type = originalType
	} else {
		delete packageJson.type
	}
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
	console.log('🔄 Package.json restored')
}
