# dogCompress Vencord Plugin

The dogCompress plugin automatically compresses videos and audio files, significantly reducing their file sizes while maintaining high-quality playback. This tool is essential for users looking to optimize file storage and improve streaming speeds.

## Features:
- **Automatic Compression**: The plugin takes care of compressing your media files without requiring manual intervention.
- **Quality Preservation**: Enjoy high-quality playback without noticeable degradation in audio or video quality.
- **Format Support**: Supports various media formats for both videos and audio files.

## Installation

To install the dogCompress plugin, follow these simple steps:

1. Download the plugin from this official repository.
2. Copy the `DogCompress` folder into the `src/userplugins/` directory of your local Vencord source installation.  
   Then, open a terminal in the root directory of your Vencord project and run the following commands:

   pnpm build
   pnpm inject

This will compile the plugin and inject it into your Discord client.

3. Open Discord, go to **User Settings → Vencord → Plugins**, and enable the **DogCompress** plugin.

After completing these steps, the plugin will be active and ready to automatically compress media files exceeding 10 MB during upload.

## Usage:
Once installed, simply drag and drop your media files into the plugin interface to initiate compression.
