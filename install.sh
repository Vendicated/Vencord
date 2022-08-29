#!/bin/sh
#
# Super simple installer. You should probably run this as root.
# If you are getting permission issues, this is probably why.
#
# If this doesn't work for you, or you're not on Linux, just
# - locate your Discord folder
# - inside the resources folder, create a new folder "app"
# - inside app create the files index.js and package.json.
#   See the two tee commands at the end of the file for their contents

set -e

patcher="$PWD/patcher.js"

dicksword="$(dirname "$(readlink "$(which discord)")")"
resources="$dicksword/resources"

if [ ! -f "$resources/app.asar" ]; then
    echo "Couldn't find Discord folder rip"
    exit
fi

app="$resources/app"
if [ -e "$app" ]; then
    echo "app folder exists. Looks like your Discord is already modified."
    exit
fi

mkdir "$app"
tee > "$app/index.js" << EOF
require("$patcher");
require("../app.asar");
EOF

tee > "$app/package.json" << EOF
{
  "main": "index.js",
  "name": "discord"
}
EOF
