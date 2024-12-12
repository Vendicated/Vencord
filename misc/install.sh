#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

# Check if the script is run as root
if [ "$(id -u)" -eq 0 ]; then
    echo "Run this script as a normal user, not root!"
    exit 1
fi

# Define variables
installer_path="$HOME/.equilotl"
github_url="https://github.com/Equicord/Equilotl/releases/latest/download/EquilotlCli-Linux"

# Inform user about the update check
echo "Checking if the installer needs updating..."

# Fetch the latest modified date from the server
latest_modified=$(curl -sI "$github_url" | grep -i "last-modified" | cut -d' ' -f2-)

# Check if the installer exists locally
if [ -f "$installer_path" ]; then
    # Get the local file's last modified date
    local_modified=$(stat -c "%y" "$installer_path" | cut -d' ' -f1-2)

    # Compare the local file's date with the server's latest modified date
    if [ "$local_modified" = "$latest_modified" ]; then
        echo "The installer is up-to-date."
    else
        echo "The installer is outdated. Downloading the latest version..."
        curl -sSL "$github_url" --output "$installer_path"
        chmod +x "$installer_path"
    fi
else
    echo "Installer not found. Downloading it..."
    curl -sSL "$github_url" --output "$installer_path"
    chmod +x "$installer_path"
fi

# Check for sudo or doas availability to run the installer with elevated privileges
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

# Provide script attribution
echo "Original script forked from Vencord"
echo "Modified by PhoenixAceVFX & Crxaw for Equicord Updater"
