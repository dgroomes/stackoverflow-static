#!/usr/bin/env bash
# Build the web extension for FireFox.
#
# Specifically, this will create the directory "build/firefox-web-extension/" in the root of the project. This directory
# will be ready to install into FireFox as a web extension.
#
# Why do we need a build script for building the FireFox extension but not the Chromium extension? FireFox does not
# support symlinks in web extensions but Chromium browsers do. So for the Chromium extension, we use a symlink to the common code
# and there is no need to "build" anything. After you "git clone" this repo, the Chromium extension is ready to be
# installed with no extra steps. But for the FireFox plugin, we need a build step that makes physical copies of the
# common code because of the symlink restriction.
#
# Refer to FireFox's symlink restriction in the Bugzilla bug tracker: https://bugzilla.mozilla.org/show_bug.cgi?id=1420286
#
# Useful trick: run this file automatically as files are changed by monitoring for file changes using the "fswatch" tool.
# Refer to the documentation: https://github.com/emcrisostomo/fswatch. Use the following command:
#
#   fswatch -0 src/extension/firefox-manifest-v2/ src/extension/common/ src/web/ | while read -d "" event; do echo "Got an event: ${event}"; ./build-for-firefox.sh; done
#
set -eu

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
EXTENSION_DIR="$PROJECT_DIR/build/firefox-web-extension"

# Delete the build directory and everything inside of it if it already exists and then create it again.
mkdir -p "$EXTENSION_DIR"
rm -rf "$EXTENSION_DIR"
mkdir -p "$EXTENSION_DIR"

cp "$PROJECT_DIR/src/extension/firefox-manifest-v2/init.js" "$EXTENSION_DIR"
cp "$PROJECT_DIR/src/extension/firefox-manifest-v2/manifest.json" "$EXTENSION_DIR"

mkdir -p "$EXTENSION_DIR/extension"
cp -r "$PROJECT_DIR/src/extension/common" "$EXTENSION_DIR/extension"

cp -r "$PROJECT_DIR/src/web" "$EXTENSION_DIR"