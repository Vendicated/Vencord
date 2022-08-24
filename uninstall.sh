#!/bin/sh
set -e

dicksword="$(dirname "$(readlink "$(which discord)")")"
rm -r --interactive=never "${dicksword:?Cant find discord}/resources/app"
