#!/usr/bin/env bash
# publish-alvys-pieces.sh — publish Alvys-owned pieces to GitHub Packages.
#
# Usage:
#   tools/scripts/pieces/publish-alvys-pieces.sh <beta|stable>
#
# Args:
#   beta   — version stamped X.Y.Z-beta.<short-sha>; npm dist-tag = beta
#   stable — version as-is from package.json;        npm dist-tag = latest
#
# Required env:
#   GITHUB_TOKEN   — PAT or GITHUB_TOKEN with write:packages
#   GITHUB_SHA     — auto-set by GitHub Actions (or pass manually)
#   GITHUB_REPOSITORY_OWNER — auto-set by GitHub Actions (e.g. "alvysio")
#
# Publishes (under @<owner-lowercase> scope):
#   @alvysio/piece-alvys
#   @alvysio/piece-alvys-intelligence
#
# Source packages keep @activepieces/* names — only the published artifact is rescoped.
# Workspace dep resolution: pieces-common / pieces-framework / shared stay on @activepieces
# (consumed from upstream npmjs.org since AP self-host has those pinned).

set -euo pipefail

CHANNEL="${1:?usage: $0 <beta|stable>}"
case "$CHANNEL" in
  beta)   NPM_TAG="beta" ;;
  stable) NPM_TAG="latest" ;;
  *) echo "channel must be 'beta' or 'stable'" >&2; exit 2 ;;
esac

OWNER="${GITHUB_REPOSITORY_OWNER:-alvysio}"
SCOPE="@$(echo "$OWNER" | tr '[:upper:]' '[:lower:]')"
REGISTRY="https://npm.pkg.github.com"
SHORT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"
SHORT_SHA="${SHORT_SHA:0:7}"

PIECES=(
  "packages/pieces/custom/alvys"
  "packages/pieces/custom/alvys-intelligence"
)

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

echo "[publish-alvys-pieces] channel=$CHANNEL tag=$NPM_TAG scope=$SCOPE registry=$REGISTRY sha=$SHORT_SHA"

# Build all pieces first
echo "[publish-alvys-pieces] building pieces..."
FILTERS=""
for P in "${PIECES[@]}"; do
  PKG_NAME=$(node -p "require('./$P/package.json').name")
  FILTERS="$FILTERS --filter=$PKG_NAME"
done
npx turbo run build $FILTERS --force >/dev/null

# Configure GH Packages auth for this scope only
NPMRC_PATH="$ROOT/.npmrc.gh-publish"
cat > "$NPMRC_PATH" <<EOF
$SCOPE:registry=$REGISTRY
//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}
always-auth=true
legacy-peer-deps=true
EOF
trap 'rm -f "$NPMRC_PATH"' EXIT

for PIECE_PATH in "${PIECES[@]}"; do
  DIST="$ROOT/$PIECE_PATH/dist"
  if [ ! -f "$DIST/package.json" ]; then
    echo "[publish-alvys-pieces] skip $PIECE_PATH (no dist)"
    continue
  fi

  node -e "
    const fs=require('fs');
    const path=require('path');
    const root='$ROOT';
    const p='$DIST/package.json';
    const j=JSON.parse(fs.readFileSync(p));

    // 1. Rescope: @activepieces/piece-alvys -> @alvysio/piece-alvys
    const originalName = j.name;
    const baseName = originalName.split('/').pop();
    j.name = '$SCOPE/' + baseName;

    // 2. Version: beta gets -beta.<sha>, stable uses as-is
    if ('$CHANNEL' === 'beta') {
      j.version = j.version + '-beta.$SHORT_SHA';
    }

    // 3. Fix main + types since pack runs inside dist
    j.main = './src/index.js';
    j.types = './src/index.d.ts';

    // 4. Resolve workspace deps (keep on @activepieces scope — those come from upstream npm)
    const versions = {
      '@activepieces/pieces-common':   JSON.parse(fs.readFileSync(path.join(root,'packages/pieces/common/package.json'))).version,
      '@activepieces/pieces-framework':JSON.parse(fs.readFileSync(path.join(root,'packages/pieces/framework/package.json'))).version,
      '@activepieces/shared':          JSON.parse(fs.readFileSync(path.join(root,'packages/shared/package.json'))).version,
    };
    for (const k of Object.keys(j.dependencies||{})) {
      if (j.dependencies[k] === 'workspace:*' && versions[k]) j.dependencies[k] = versions[k];
    }

    // 5. Add repository + publishConfig for GH Packages
    j.repository = { type: 'git', url: 'https://github.com/$OWNER/foundry.git' };
    j.publishConfig = { registry: '$REGISTRY', access: 'restricted' };

    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
    console.log('[publish-alvys-pieces] ' + originalName + ' -> ' + j.name + '@' + j.version);
  "

  echo "[publish-alvys-pieces] publishing $PIECE_PATH..."
  ( cd "$DIST" && npm publish --userconfig "$NPMRC_PATH" --tag "$NPM_TAG" )
  echo "[publish-alvys-pieces] done $PIECE_PATH"
done

echo "[publish-alvys-pieces] all published with dist-tag=$NPM_TAG"
