> [!TIP]
> **If you run into any issues, please feel free to message me on Discord: [scattrdblade](https://discord.com/users/678007540608532491)**
# Custom Sounds (Vencord)
This is a Vencord plugin that allows you to replace any native Discord sound with a sound of your choice by going to the plugin's settings and pasting the URL of a valid audio file.
> [!NOTE]
> **The audio file must be a URL and not a local file.**<br/>
You can find audio URLs on soundboard sites, or create your own GitHub repository, add an audio file, and paste the raw link to it in the plugin's settings.

## DOWNLOAD INSTRUCTIONS
You can either __clone__ the repository OR __manually install__ it by downloading it as a zip file.<br/>
> [!WARNING]
> Make sure you have the Vencord [developer build](https://docs.vencord.dev/installing/) installed.<br/>

### CLONE INSTALLATION
The cloning installation guide can be found [here](https://discord.com/channels/1015060230222131221/1257038407503446176/1257038407503446176) or via [the official Vencord Docs](https://docs.vencord.dev/installing/custom-plugins/).

### MANUAL INSTALLATION
> [!IMPORTANT]
> Inside the `Vencord` folder should be a folder called `src`. If you haven't already, create a folder called `userplugins` inside the `src` folder.
1. Click the green `<> Code` button at the top right of the repository and select `Download ZIP`
2. Unzip the downloaded ZIP file into the `userplugins` folder.
3. Ensure it's structured as `src/userplugins/customSounds` or `src/userplugins/customSounds-main`
5. Run `pnpm build` in the terminal (command prompt/CMD) and the plugin should be added.
