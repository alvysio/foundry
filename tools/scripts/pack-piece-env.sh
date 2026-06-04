#!/usr/bin/env bash
# pack-piece-env.sh — produce env-locked tgz of @activepieces/piece-alvys
#
# Usage:
#   tools/scripts/pack-piece-env.sh qa
#   tools/scripts/pack-piece-env.sh production
#
# Output: /tmp/activepieces-piece-alvys[-qa]-<version>.tgz
#
# Same source. Builds two distinct pieces by patching:
#   - package.json name        (-qa suffix or none)
#   - displayName              ("Alvys (QA)" vs "Alvys")
#   - auth.environment default ("qa" or "production"), hidden from UI
#   - logoUrl                  ("Alvys (QA)" gets a small QA badge overlay — optional)
#
# Both can install side-by-side on cloud.activepieces.com.

set -euo pipefail

ENV_ARG="${1:?usage: $0 <qa|production>}"
case "$ENV_ARG" in
  qa|QA)
    ENV="qa"
    SUFFIX="-qa"
    DISPLAY="Alvys (QA)"
    ;;
  prod|production|PROD|PRODUCTION)
    ENV="production"
    SUFFIX=""
    DISPLAY="Alvys"
    ;;
  *)
    echo "usage: $0 <qa|production>" >&2
    exit 2
    ;;
esac

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PIECE_DIR="$ROOT/packages/pieces/community/alvys"
DIST="$PIECE_DIR/dist"

echo "[pack-piece-env] env=$ENV display='$DISPLAY' suffix='$SUFFIX'"

cd "$PIECE_DIR"
npx tsc -p tsconfig.lib.json
cp package.json dist/

cd "$DIST"

# 1. Rewrite manifest — name suffix + workspace dep resolution + main path
node -e "
const fs=require('fs');
const path=require('path');
const root='$ROOT';
const p='./package.json';
const j=JSON.parse(fs.readFileSync(p));
const original=j.name;
j.name = original + '$SUFFIX';
j.main = './src/index.js';
j.types = './src/index.d.ts';

// Resolve workspace deps to real versions
const workspaceVersions = {
  '@activepieces/pieces-common': JSON.parse(fs.readFileSync(path.join(root,'packages/pieces/common/package.json'))).version,
  '@activepieces/pieces-framework': JSON.parse(fs.readFileSync(path.join(root,'packages/pieces/framework/package.json'))).version,
  '@activepieces/shared': JSON.parse(fs.readFileSync(path.join(root,'packages/shared/package.json'))).version,
};
for (const k of Object.keys(j.dependencies||{})) {
  if (j.dependencies[k] === 'workspace:*' && workspaceVersions[k]) {
    j.dependencies[k] = workspaceVersions[k];
  }
}
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
console.log('[manifest] name=' + j.name + ' main=' + j.main);
"

# 2. Patch compiled index.js — displayName + description nudge
node -e "
const fs=require('fs');
const p='./src/index.js';
let s=fs.readFileSync(p,'utf8');
s = s.replace(/displayName: ['\"]Alvys['\"]/, 'displayName: \"$DISPLAY\"');
fs.writeFileSync(p, s);
console.log('[index.js] displayName -> $DISPLAY');
"

# 3. Patch compiled auth.js — force environment to env, hide picker
node -e "
const fs=require('fs');
const p='./src/lib/auth.js';
let s=fs.readFileSync(p,'utf8');

// Replace the entire StaticDropdown environment property with a hidden short-text + default value.
// Match the full StaticDropdown(...) call for 'environment'.
const before = s;
s = s.replace(
  /environment:\s*pieces_framework_1\.Property\.StaticDropdown\(\{[\s\S]*?\}\)/,
  'environment: pieces_framework_1.Property.ShortText({ displayName: \"Environment\", description: \"Locked to $ENV for this build.\", required: false, defaultValue: \"$ENV\" })'
);
// Fallback if framework import alias differs
if (s === before) {
  s = s.replace(
    /(\w+_\d+\.Property)\.StaticDropdown\(\{[\s\S]*?environment[\s\S]*?\}\)/,
    '\$1.ShortText({ displayName: \"Environment\", description: \"Locked to $ENV for this build.\", required: false, defaultValue: \"$ENV\" })'
  );
}
if (s === before) {
  console.error('[auth.js] ERROR: could not locate environment StaticDropdown to replace');
  process.exit(1);
}
fs.writeFileSync(p, s);
console.log('[auth.js] environment locked to $ENV');
"

# 4. Pack
rm -f *.tgz
npm pack >/dev/null 2>&1
TGZ=$(ls *.tgz | head -1)
DEST="/tmp/${TGZ}"
cp "$TGZ" "$DEST"

echo
echo "[pack-piece-env] DONE: $DEST"
shasum -a 256 "$DEST"
