#!/bin/sh
set -e

if [ "$(id -u)" -eq 0 ]; then
    echo "Run me as a normal user, not root!"
    exit 1
fi

installer_path="$HOME/.equilotl"
github_url="https://github.com/Equicord/Equilotl/releases/latest/download/EquilotlCli-Linux"

echo "Checking if the installer needs updating..."


latest_modified=$(curl -sI "https://github.com/Equicord/Equilotl/releases/latest/download/EquilotlCli-Linux" | grep -i "last-modified" | cut -d' ' -f2-)

if [ -f "$installer_path" ]; then
    local_modified=$(stat -c "%y" "$installer_path" | cut -d' ' -f1-2)

    if [ "$local_modified" = "$latest_modified" ]; then
        echo "The installer is up-to-date."
    else
        echo "The installer is outdated. Downloading the latest version..."
        curl -sSL "https://github.com/Equicord/Equilotl/releases/latest/download/EquilotlCli-Linux" --output "$installer_path"
        chmod +x "$installer_path"
    fi
else
    echo "Installer not found. Downloading it..."
    curl -sSL "https://github.com/Equicord/Equilotl/releases/latest/download/EquilotlCli-Linux" --output "$installer_path"
    chmod +x "$installer_path"
fi


if command -v sudo >/dev/null; then
    echo "Running installer with sudo..."
    sudo "$installer_path"
elif command -v doas >/dev/null; then
    echo "Running installer with doas..."
    doas "$installer_path"
else
    echo "Neither sudo nor doas were found. Please install one to proceed."
    exit 1
fi
echo "Original script forked from Vencord"
echo "Modified by PhoenixAceVFX & Crxaw for Equicord Updater"
