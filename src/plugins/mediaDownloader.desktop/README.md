# yt-dlp

This plugin adds a new `/yt-dlp` command. This command downloads a video from a given url, and creates a video attachment, ready to send.

![](https://github.com/Vendicated/Vencord/assets/18369995/4b396740-f128-41f9-9392-90ff7bc2a104)

## Requirements

This plugin requires that [yt-dlp](https://github.com/yt-dlp/yt-dlp) is insalled on the system, and accessible by Discord. This usually just means that it should be on PATH.
An optional dependency is [ffmpeg](https://ffmpeg.org/). Note that many installations of `yt-dlp` already come with `ffmpeg` preinstalled.

Yt-dlp is required for core functionality, e.g. downloading videos. Ffmpeg can also be installed to allow for local merging and muxing of video tracks. This means that, with ffmpeg installed, yt-dlp will be able to download video and audio separately and later merge them, which allows you to end up with higher quality videos without increasing filesize.
Ffmpeg is also required to use the Gif format, as they are not supported natively by most video sources.

## Usage

The plugin adds a single application command, activated by typing `/yt-dlp`. It has the following parameters.

| name          | required | description                                                                                                                                                                                                                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`         | Yes      | URL of the video to download. Supports any urls also supported by `yt-dlp`, most famously YouTube.                                                                                                                                                                                |
| `format`      | No       | The upload format, either Video, Audio or GIF. GIF requires ffmpeg to be installed. Defaults to Video.                                                                                                                                                                            |
| `gif_quality` | No       | Gif quality level when using `format:GIF`. You cannot dynamically determine gif quality based on target filesize like is possible with Audio and Video, so this option exists to make it possible to increas/decrease the quality of the gif as desired or needed. Defaults to 3. |
| `yt-dlp_args` | No       | Additional command line arguments to pass to yt-dlp¹. These will take precedence over the default arguments used by the plugin. See the yt-dlp documentation for more information.                                                                                                |
| `ffmpeg_args` | No       | Additional command line arguments to pass to ffmpeg². These will take precedence over the default arguments used by the plugin. See the ffmpeg documentation for more information.                                                                                                |

¹ The default arguments are: `yt-dlp <url> -f <format> -o "download.%(ext)s" --force-overwrites -I 1 --remux-video <remux>` where:

-   `<format>` is a custom download format visible [here](./native.ts##L117-L147),
-   `--remux-video <remux>` is only available when ffmpeg is installed,
-   `<remux>` is equal to `"webm>webm/mp4"` for video and `mp3` for audio.

² The default arguments are:

-   Audio: `ffmpeg -i <downloaded> -b:a <kilobits>k -maxrate <kilobits>k -bufsize 1M -y remux.mp3`.
-   Video: `ffmpeg -i <downloaded> -b:v <vkilobits>k -b:a <akilobits>k -maxrate <kilobits>k -bufsize 1M -y -filter:v scale=-1:<height>`.
-   GIF: `ffmpeg -i <downloaded> -vf fps=<fps>,scale=w=<width>:h=-1:flags=lanczos,mpdecimate,split[s0][s1];[s0]palettegen=max_colors=<colors>[p];[s1][p]paletteuse=dither=bayer:bayer_scale=<bayer_scale> -loop 0 -bufsize 1M -y`.

    where

-   `<downloaded>` is the output from the `yt-dlp` command,
-   `<kilobits>` is the total target bitrate, based on your nitro upload limit,
-   `<vkilobits>` is `<kilobits>*0.8`, bitrate for video,
-   `<akilobits>` is `<kilobits>*0.2`, bitrate for audio,
-   `<height>` is the video size (480p, 720p or 1080p) calculated based on the target bitrate.
-   `<fps>`, `<width>`, `<colors>` and `<bayer_scale>` are based on the `gif_quality` selected.

Note that you cannot use the above variables in your additional command line arguments.
