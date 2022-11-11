# Vencord Report

## Bad Patches
- BetterGifAltText (had no effect)
  - ID: `866358`
  - Match: ```/(return .{1,2}\.createElement.{0,50}isWindowFocused)/ ```
- Webhook Tags (had no effect)
  - ID: `696278`
  - Match: ```/return null==(.)\?null:.\.createElement\((.)\.Z/ ```
- MessageAccessoriesAPI (had no effect)
  - ID: `96063`
  - Match: ```/\(\)\.container\)},(.+?)\)};return/ ```
- NoBlockedMessages (had no effect)
  - ID: `748241`
  - Match: ```/collapsedReason;return (?=\w{1,2}.createElement)/ ```
- IgnoreActivities (had no effect)
  - ID: `413620`
  - Match: ```/(.:\(\)=>.)(.+)(function (.)\(.{1,10}\.width.+\)\)\)})/ ```
- IgnoreActivities (had no effect)
  - ID: `529622`
  - Match: ```/(this.renderLastPlayed\(\)\),this.renderOverlayToggle\(\))/ ```
- IgnoreActivities (errored)
  - ID: `529622`
  - Match: ```/;(.\.renderOverlayToggle=function\(\).+?\)\)\)};)/ ```
  - Error: ```Unexpected end of input ```
- ViewIcons (had no effect)
  - ID: `847018`
  - Match: ```/(?<=createElement\((.{1,5}),\{id:"leave-guild".{0,100},)(.{1,2}\.createElement)\((.{1,5}),null,(.{1,2})\)(?=\)\}function)/ ```
- PlainFolderIcon (found no module)
  - ID: `-`
  - Match: ```().expandedFolderIconWrapperabaa ```

## Bad Starts
- NitroBypass
  - Error: ```tets error ```
## Discord Errors
- ```Failed to load resource: the server responded with a status of 429 () ```
- ```Failed to load resource: the server responded with a status of 404 () ```
