#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../services/frontend/src');
const layers = ['app', 'features', 'shared', 'config', 'security', 'observability', 'deployment'];

const allowed = {
  app: new Set(['app', 'features', 'shared', 'config', 'security', 'observability', 'deployment']),
  features: new Set(['features', 'shared', 'config', 'security', 'observability', 'deployment']),
  shared: new Set(['shared', 'config', 'observability', 'deployment']),
  config: new Set(['config']),
  security: new Set(['security', 'config', 'shared', 'observability', 'deployment']),
  observability: new Set(['observability', 'shared', 'config', 'deployment']),
  deployment: new Set(['deployment', 'config', 'shared', 'observability']),
};

const importRegex = /from\s+['"]([^'"]+)['"]/g;

const violations = [];

const readAllFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...readAllFiles(full));
    } else if (entry.isFile() && full.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
};

const resolveLayerFromFile = (filePath) => {
  const rel = path.relative(root, filePath);
  const layer = rel.split(path.sep)[0];
  return layers.includes(layer) ? layer : null;
};

const resolveLayerFromImport = (sourceLayer, importPath) => {
  if (importPath.startsWith('@app/')) return 'app';
  if (importPath.startsWith('@features/')) return 'features';
  if (importPath.startsWith('@shared/')) return 'shared';
  if (importPath.startsWith('@config/')) return 'config';
  if (importPath.startsWith('@security/')) return 'security';
  if (importPath.startsWith('@observability/')) return 'observability';
  if (importPath.startsWith('@deployment/')) return 'deployment';

  if (importPath.startsWith('.')) {
    const layerDir = path.resolve(root, sourceLayer);
    const resolved = path.resolve(layerDir, importPath);
    const rel = path.relative(root, resolved);
    const layer = rel.split(path.sep)[0];
    return layers.includes(layer) ? layer : null;
  }

  return null;
};

for (const file of readAllFiles(root)) {
  const sourceLayer = resolveLayerFromFile(file);
  if (!sourceLayer) continue;

  const content = fs.readFileSync(file, 'utf8');
  const imports = [...content.matchAll(importRegex)].map((m) => m[1]);

  for (const imp of imports) {
    const targetLayer = resolveLayerFromImport(sourceLayer, imp);
    if (!targetLayer) continue;

    if (!allowed[sourceLayer].has(targetLayer)) {
      violations.push(
        `${path.relative(root, file)} cannot import ${imp} (layer ${sourceLayer} -> ${targetLayer} not allowed)`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error('Frontend boundary check failed:');
  for (const v of violations) {
    console.error(`- ${v}`);
  }
  process.exit(1);
}

console.log('Frontend boundary check passed');
