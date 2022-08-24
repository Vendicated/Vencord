#!/bin/sh
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
