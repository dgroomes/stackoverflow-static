#!/usr/bin/env bash
# Build the web extension distributions from the source code.
#
# This is a light-weight process as far as build processes go for typical software projects. All this script does is
# copy some files around. There are no dependency download steps or compilation steps.
#
# Specifically, this will create the directories:
#   * build/chromium-manifest-v2-web-extension/
#   * build/firefox-manifest-v2-web-extension/
#
# The contents of these directories are ready to be loaded into the browser as web extensions! See the README for
# instructions.
#
# Optionally, use the "--watch" option to build the distributions continually as source code files are changed. This
# requires using the "fswatch" tool. Refer to the documentation: https://github.com/emcrisostomo/fswatch.

if [[ "$1" == "--watch" ]]; then
  watch=true
else
  watch=false
fi

set -eu

project_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
extension_sources=(firefox-manifest-v2 chromium-manifest-v2)

preconditions() {
  if ! which deno &> /dev/null; then
    echo >&2 "The 'deno' command was not found. Please install Deno. See https://deno.land/."
    exit 1
  fi
}

# Delegate to the "deno bundle ..." command
deno_bundle() {
  deno bundle --quiet --config deno.jsonc "${@}"
}

build_distribution() {
  local extension_source="$1"
  local vendor_source_dir="$project_dir/src/${extension_source}"
  local vendor_output_dir="$project_dir/build/${extension_source}-web-extension"

  # Delete the build directory and everything inside of it if it already exists and then create it again.
  mkdir -p "$vendor_output_dir"
  rm -rf "$vendor_output_dir"
  mkdir -p "$vendor_output_dir/backend" "$vendor_output_dir/rpc" "$vendor_output_dir/web-page"

  # Copy over the vendor-specific Manifest file and bundle the vendor-specific initialization JavaScript file
  cp "$vendor_source_dir/manifest.json" "$vendor_output_dir"
  deno_bundle "$vendor_source_dir/init.ts" "$vendor_output_dir/init.js"

  # Copy over non-JavaScript files (don't bother using fancy shell scripting here. Just copy over the few files explicitly)
  cp \
    "$project_dir/src/web-page/get-posts-by-ids.sql" \
    "$project_dir/src/web-page/posts-viewer.html" \
    "$project_dir/src/web-page/posts-viewer.css" \
    "$vendor_output_dir/web-page"

  cp "$project_dir/src/backend/popup.html" "$vendor_output_dir/backend"

  # Bundle the entrypoint-type JavaScript files
  deno_bundle "$project_dir/src/backend/popup.ts" "$vendor_output_dir/backend/popup.js"
  deno_bundle "$project_dir/src/backend/content-script-load-source.ts" "$vendor_output_dir/backend/content-script-load-source.js"
  deno_bundle "$project_dir/src/rpc/rpc-content-script.ts" "$vendor_output_dir/rpc/rpc-content-script.js"
  deno_bundle "$project_dir/src/web-page/web-injected.ts" "$vendor_output_dir/web-page/web-injected.js"
  deno_bundle "$project_dir/src/web-page/posts-viewer.ts" "$vendor_output_dir/web-page/posts-viewer.js"
}

build_all() {
  for extension_source in "${extension_sources[@]}"; do
    build_distribution "$extension_source"
  done
  echo "Distributions built! ✅"
}

preconditions

if [[ "$watch" == "true" ]]; then
  echo "Building with the '--watch' option. The distributions will be built again when any of the 'src/' code changes."
  build_all
  fswatch -0 src/ | while read -d "" event; do build_all; done
else
  build_all
fi
