#!/bin/sh
set -e

# Constants
INSTALLER_PATH="$HOME/.equilotl"
GITHUB_URL="https://github.com/Equicord/Equilotl/releases/latest/download/EquilotlCli-Linux"

# Check for root
if [ "$(id -u)" -eq 0 ]; then
    echo "Run me as a normal user, not root!"
    exit 1
fi

download_installer() {
    curl -sSL "$GITHUB_URL" --output "$INSTALLER_PATH"
    chmod +x "$INSTALLER_PATH"
}

echo "Checking if the installer needs updating..."

if [ -f "$INSTALLER_PATH" ]; then
    latest_modified=$(curl -sI "$GITHUB_URL" | grep -i "last-modified" | cut -d' ' -f2-)
    local_modified=$(stat -c "%y" "$INSTALLER_PATH" | cut -d' ' -f1-2)

    if [ "$local_modified" = "$latest_modified" ]; then
        echo "The installer is up-to-date."
    else
        echo "The installer is outdated. Downloading the latest version..."
        download_installer
    fi
else
    echo "Installer not found. Downloading it..."
    download_installer
fi

# Try to run the installer with sudo or doas
if command -v sudo >/dev/null; then
    echo "Running installer with sudo..."
    sudo "$INSTALLER_PATH"
elif command -v doas >/dev/null; then
    echo "Running installer with doas..."
    doas "$INSTALLER_PATH"
else
    echo "Neither sudo nor doas were found. Please install one to proceed."
    exit 1
fi

# Credits
echo "Original script forked from Vencord"
echo "Modified by PhoenixAceVFX & Crxaw for Equicord Updater"
