#!/bin/bash

# Configuration
INSTALLER_PATH="$HOME/.equilotl"
GITHUB_URL="https://github.com/Equicord/Equilotl/releases/latest/download/EquilotlCli-Linux"
PRIVILEGE_CMDS=("sudo" "doas")
DEBUG=false
LOG_FILE="$(dirname "$(realpath "$0")")/equicordinstalldebug.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Debug logging
debug_log() {
    if $DEBUG; then
        set -euo pipefail
        local timestamp
        timestamp=$(date +"%Y-%m-%d %T")
        echo -e "[$timestamp] $1" | tee -a "$LOG_FILE"
    fi
}

# Error handling
error() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

# Check for root
check_root() {
    if [ "$(id -u)" -eq 0 ]; then
        error "This script should not be run as root. Please run as a normal user."
    fi
}

# Download the installer
download_installer() {
    echo -e "${YELLOW}Downloading installer...${NC}"
    if ! curl -sSL "$GITHUB_URL" --output "$INSTALLER_PATH"; then
        error "Failed to download installer from GitHub"
    fi
    chmod +x "$INSTALLER_PATH" || error "Failed to make installer executable"
}

# Check if installer needs update
check_for_updates() {
    if [ ! -f "$INSTALLER_PATH" ]; then
        echo -e "${YELLOW}Installer not found. Downloading...${NC}"
        download_installer
        return
    fi

    local latest_modified local_modified
    if ! latest_modified=$(curl -sI "$GITHUB_URL" | grep -i "last-modified" | cut -d' ' -f2-); then
        echo -e "${YELLOW}Warning: Could not fetch last modified date from GitHub. Using existing installer.${NC}"
        return
    fi

    local_modified=$(stat -c "%y" "$INSTALLER_PATH" | cut -d' ' -f1-2) || error "Failed to get local modified date"

    if [ "$local_modified" != "$latest_modified" ]; then
        echo -e "${YELLOW}Installer is outdated. Do you wish to update? [y/n]${NC}"
        read -p "" -n 1 -r retval

        # Create a new line before printing our next notice, otherwise it will be printed on the same line
        # that the prompt was created on!
        echo ""
        case "$retval" in
            y|Y ) download_installer;;
            n|N ) echo -e "${YELLOW}Update cancelled. Running installer...${NC}" && return;;
        esac
    else
        echo -e "${GREEN}Installer is up-to-date.${NC}"
    fi
}

# Find privilege escalation command
find_privilege_cmd() {
    for cmd in "${PRIVILEGE_CMDS[@]}"; do
        if command -v "$cmd" >/dev/null; then
            echo "$cmd"
            return
        fi
    done
    error "Neither sudo nor doas found. Please install one to proceed."
}

# Main execution
main() {
    # Check for debug flag
    if [[ "${1:-}" == "-debug" ]]; then
        DEBUG=true
        > "$LOG_FILE" # Clear previous log
        debug_log "Debug mode enabled"
    fi

    debug_log "Starting installation process"
    check_root
    check_for_updates

    local priv_cmd
    priv_cmd=$(find_privilege_cmd)
    debug_log "Using privilege command: $priv_cmd"

    echo -e "${YELLOW}Running installer with $priv_cmd...${NC}"
    debug_log "Executing installer: $priv_cmd $INSTALLER_PATH"
    if ! "$priv_cmd" "$INSTALLER_PATH"; then
        debug_log "Installer failed"
        error "Installer failed to run"
    fi

    debug_log "Installation completed successfully"
    echo -e "\n${GREEN}Installation completed successfully!${NC}"
    echo -e "\nCredits:"
    echo "Original script forked from Vencord"
    echo "Modified by PhoenixAceVFX for Equicord Updater"
    echo "Rewrite by PhoenixAceVFX"
}

# Pass arguments to main
main "$@"
