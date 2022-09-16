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

patcher="$PWD/dist/patcher.js"

discord_bin="$(which discord)"
discord_actual="$(readlink "$discord_bin")"

if [ -z "$discord_actual" ]; then
  case "$(head -n1 "$discord_bin")" in
    # has shebang?
    \#!/*)
      # Wrapper script, assume 2nd line has exec electron call and try to match asar path
      path="$(tail -1 "$discord_bin" | grep -Eo "\S+/app.asar" | sed 's/${name}/discord/')"
      if [ -z "$path" ]; then
        echo "Unsupported Install. $discord_bin is wrapper script but last line isn't exec call?"
        exit
      elif [ -e "$path" ]; then
        discord="$(dirname "$path")"
      else
        echo "Unsupported Install. $path not found"
        exit 1
      fi
      ;;
    *) 
      echo "Unsupported Install. $discord_bin is neither symlink nor a wrapper script.";
      exit 1
      ;;
  esac
else
  discord="$(dirname "$discord_actual")"
fi

resources="$discord/resources"
app="$resources/app"
app_asar="app.asar"

if [ ! -e "$resources" ]; then 
  if [ -e "$discord/app.asar.unpacked" ]; then
    # System Electron Install
    mv "$discord/app.asar" "$discord/_app.asar"
    mv "$discord/app.asar.unpacked" "$discord/_app.asar.unpacked"
    app="$discord/app.asar"
    app_asar="_app.asar"
  else
    echo "Unsupported Install. $discord has no resources folder but also isn't system electron install"
    exit
  fi
fi

if [ -e "$app" ]; then
    echo "app folder exists. Looks like your Discord is already modified."
    exit
fi

mkdir "$app"
tee > "$app/index.js" << EOF
require("$patcher");
require("../$app_asar");
EOF

tee > "$app/package.json" << EOF
{
  "main": "index.js",
  "name": "discord"
}
EOF
