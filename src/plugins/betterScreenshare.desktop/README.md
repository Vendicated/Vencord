# Better Screenshare Plugin

## How to use each Setting?

-   **Audio Source** - Choose a window from the drop-down list and the audio will be shared whether you're streaming a window or a screen.
-   **Resolution** - Here you can set the width and the height (both are required). The ideal resolution is the resolution of the monitor you are streaming. An example would be `1080p` (height: `1920` width: `1080`).
-   **Framerate** - Here you can set the frame rate. The most common frame rate is `60`, but you can set it higher or lower if you like.
-   **Keyframe Interval** - Here you can set the keyframe interval in milliseconds. If you don't know anything about it, just leave it disabled, but if you want to understand it better, read through this [article](https://filmora.wondershare.com/video-editing/keyframe-interval-obs.html).
-   **Video Bitrate** - This is one of the most important settings as it affects the quality the most. Discord uses a low bitrate by default, so it's important to set it if you want good quality. If you want to find out your optimal bitrate, go to the video bitrate [section](https://github.com/Vendicated/Vencord/tree/main/src/plugins/betterScreenshare#video-bitrate).
-   **Audio Bitrate** - This is almost the same as video bitrate, but it works a little differently for audio. If you want to learn more about it, you can read through this [article](https://www.adobe.com/creativecloud/video/discover/audio-bitrate.html). But I would recommend setting it between `96kb/s` and `320kb/s` (higher means better).
-   **Video Codec** - Here you can set your video codec. Discord currently supports 4 codecs. Each codec offers different quality and performance. The most popular codec is **H264**, which I recommend. However, if you have a 40 series card, use the **AV1** codec.
    -   **AV1** - Only supported on 40-series cards.
    -   **VP8**
    -   **VP9**
    -   **H264**
-   **HDR** - Allows streaming in HDR.

## Bitrate

To find your optimal bitrate, you must first find your upload speed. You can do this by running a speed test on this [website](https://www.speedtest.net/). When you're done, you'll see a number in the upload field that represents your maximum upload speed in (`Mbps`) `Mb/s`. To use the upload you need to convert it from `Mb/s` to `Kb/s` by multiplying it by `1000`. I'd recommend going a bit lower as you probably won't always hit your max upload speed and it will affect your ping. Heres is a example `5000 Kb/s` -> `4000 Kb/s`.

**IMPORTANT**: Discord added a cap of `10000 Kb/s`, if you went higher everyone would experience packet loss. It is not known if there is a bypass for this.

## Presets

If you don't want to do any of the above, you can just try the presets in the Profile Options tab and see what works best for you. And if you want to change a setting in the preset, you can simply copy it and save it as a new one.

## Known Issues

~~When sharing a window directly it can sometimes happen that no changes are applied, the reason for this is currently unknown, but to avoid this you can simply share your whole screen and set the audio source if required.~~
