#!/usr/bin/env node
/**
 * Guards against duplicate copies of critical runtime dependencies landing in the
 * bundle (#381). React, React DOM and Three.js are each imported from many
 * different packages across the dependency tree (react-three-fiber, drei,
 * postprocessing, etc.); if any of them pull in their own copy instead of
 * resolving to the single top-level install, the app ships two copies of React
 * (silently breaking hooks/context) or two copies of Three.js (doubling an
 * already large chunk for no benefit).
 *
 * Reads package-lock.json (the source of truth for what npm actually resolved)
 * and fails if any watched package resolves to more than one version.
 *
 * Usage: node scripts/check-duplicates.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Packages that must resolve to exactly one version. These are either
 * singletons by nature (React's hooks/context break across copies) or large
 * enough that a duplicate meaningfully grows the bundle (Three.js, the
 * Stellar SDK).
 */
const WATCHED_PACKAGES = [
  'react',
  'react-dom',
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  '@stellar/stellar-sdk',
]

function loadLockfile() {
  const lockfilePath = path.join(root, 'package-lock.json')
  return JSON.parse(readFileSync(lockfilePath, 'utf8'))
}

/** Maps each watched package name to the set of resolved versions found in the lockfile. */
function collectVersions(lockfile) {
  const versionsByPackage = new Map(WATCHED_PACKAGES.map((name) => [name, new Set()]))

  for (const [pkgPath, info] of Object.entries(lockfile.packages ?? {})) {
    if (!pkgPath || !info?.version) continue
    const match = pkgPath.match(/node_modules\/((?:@[^/]+\/)?[^/]+)$/)
    if (!match) continue
    const name = match[1]
    if (versionsByPackage.has(name)) {
      versionsByPackage.get(name).add(info.version)
    }
  }

  return versionsByPackage
}

const lockfile = loadLockfile()
const versionsByPackage = collectVersions(lockfile)

const duplicates = [...versionsByPackage.entries()].filter(([, versions]) => versions.size > 1)

if (duplicates.length > 0) {
  console.error('✗ Duplicate dependency versions detected:\n')
  for (const [name, versions] of duplicates) {
    console.error(`  ${name}: ${[...versions].join(', ')}`)
  }
  console.error(
    '\nAdd/update an "overrides" entry in package.json (and the `resolve.dedupe` list in ' +
      'vite.config.ts) so these resolve to a single version, then run `npm install` to ' +
      'regenerate package-lock.json.'
  )
  process.exit(1)
}

console.log(
  `✓ No duplicate versions found for watched packages (${WATCHED_PACKAGES.join(', ')})`
)
