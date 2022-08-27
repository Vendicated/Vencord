#!/bin/sh
# Super simple uninstaller.
# If this doesn't work for you, or you're not on Linux, just
# manually delete the app folder in your Discord folder (inside resources)

set -e

dicksword="$(dirname "$(readlink "$(which discord)")")"
rm -r --interactive=never "${dicksword:?Cant find discord}/resources/app"
