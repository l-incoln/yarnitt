Outstanding issues (created: 2025-11-01 20:17:08 UTC)

Build: "tsc: Permission denied" when running 'npm run build' / 'npx tsc -p tsconfig.json'

Repro: npm run build npx tsc -p tsconfig.json
Observed output: "sh: 1: tsc: Permission denied"
Likely causes:
Missing local typescript (node_modules/.bin/tsc absent)
Filesystem mount (WSL / Windows drvfs) with noexec preventing execution
Workarounds tried:
npm install --save-dev typescript @types/node
npx -y typescript tsc -p tsconfig.json (still permission denied)
Next steps:
Move the repository into the WSL Linux filesystem (e.g., under /home) if currently on /mnt/*, then run npm install and npx tsc.
Or run build inside CI (e.g., GitHub Actions) instead of local Windows-mounted FS.
Ensure typescript is in devDependencies and node_modules/.bin/tsc is executable.
If needed, create a minimal dist/ placeholder to allow npm start while real build is deferred.
Tests: "No tests found" — jest configuration uses incorrect globs

Repro: npm test
Observed output: testMatch: /tests//.test.(ts|js) - 0 matches
Root cause:
jest.config.ts contains testMatch ['/tests//.test.(ts|js)'] and collectCoverageFrom ['src/**/.ts'] which do not match repository layout
Desired fix:
Update jest.config.ts to: export default { preset: 'ts-jest', testEnvironment: 'node', testMatch: ['/tests//.test.(ts|js)'], collectCoverage: true, collectCoverageFrom: ['src/**/.ts', '!src/**/index.ts'], coverageDirectory: 'coverage', moduleFileExtensions: ['ts', 'js', 'json', 'node'], };
Verify tests folder contains tests matching the pattern (e.g., tests/health.test.ts).
Ensure any tests that import createServer expect an exported createServer from src/server; add minimal src/server if necessary.
Missing runtime artifact for npm start

Observed: npm start runs node dist/index.js but dist/index.js is missing -> module not found.
Workarounds:
Run tsc build after fixing TypeScript environment.
Or add a temporary minimal dist/index.js to allow npm start while build is fixed.
Next steps:
Fix build environment so tsc produces dist/.
Remove temporary placeholder when the real build output is available.
Security / dependency notes

After installing dev deps, npm reported vulnerabilities: 64 vulnerabilities (6 low, 16 moderate, 32 high, 10 critical)
Next steps:
Run npm audit and npm audit fix where safe.
Consider upgrading dependencies or adjusting lockfile.
Meta / process suggestions

Add a CI workflow (GitHub Actions) to run npm install, npm run build, and npm test on pushes/PRs. This avoids environment-specific issues (WSL noexec) and surfaces problems centrally.
Convert these entries to GitHub Issues for assignment and tracking if desired.
Commit the file (optional): git add ISSUES.md && git commit -m "chore: add ISSUES.md with outstanding build/test items" || echo "git commit failed or no git repo configured"
