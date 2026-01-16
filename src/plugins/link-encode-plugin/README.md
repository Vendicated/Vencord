# Link Encode Plugin

A Vencord plugin that encrypts Discord messages to bypass link filtering (like Nexus Mods links being blocked). Messages are encrypted with a random key and sent in a format that Discord's filters won't recognize.

## Installation

Place this plugin in your Vencord `src/userplugins` folder (for private plugins) or `src/plugins` folder (for official submission).

**Note**: According to [Vencord plugin conventions](https://docs.vencord.dev/plugins/), folder names should be in camelCase (e.g., `linkEncodePlugin`). If you rename this folder, update all imports accordingly.

## Setup

1. Update the `authors` field in `index.tsx` with your Discord user ID:
   ```typescript
   authors: [{ name: "Your Name", id: 1234567890n }]
   ```
   (Replace `1234567890` with your actual Discord user ID)

## Features

- **Auto-Encrypt**: Automatically encrypt messages before sendingadd
- **Random Keys**: Each message gets a unique encryption key
- **Decrypt Button**: Hover over encrypted messages and click "Decrypt" in the tooltip
- **Translation-Style Display**: Decrypted content appears below messages (like translations)
- **Context Menu**: Right-click encrypted messages to decrypt

## How It Works

1. **Sending**: When auto-encrypt is enabled, your message is encrypted with a random key
2. **Format**: Messages are sent as:
   ```
   encrypted: <encrypted_text>
   key: <random_key>
   ```
3. **Receiving**: Hover over the message and click "Decrypt" in the tooltip
4. **Display**: The decrypted content appears below the message (similar to translations)

## Usage

1. **Enable Auto-Encrypt**: 
   - Click the link icon in the chat bar
   - Toggle "Auto Encrypt" on
   - Or Shift+Click / Right-click the icon to toggle

2. **Send Messages**: 
   - Type your message normally
   - It will be automatically encrypted before sending
   - The encrypted format prevents Discord from filtering links

3. **Decrypt Messages**:
   - Hover over any encrypted message
   - Click "Decrypt" in the message tooltip
   - The original content appears below the message

## Encryption Method

The plugin uses **XOR cipher** with a randomly generated 32-character key for each message. This provides:
- Lightweight encryption suitable for bypassing filters
- Unique keys per message (no key sharing needed)
- Fast encryption/decryption

## Security Notes

⚠️ **Important**: 
- This plugin is designed to **bypass link filtering**, not for security
- XOR cipher is weak encryption and should not be used for sensitive data
- The key is sent in plaintext with the message
- For real security, use proper encryption (AES-256) with secure key exchange

## Settings

- **Auto Encrypt**: Automatically encrypt messages before sending
- **Show Tooltip**: Show tooltip when messages are automatically encrypted
