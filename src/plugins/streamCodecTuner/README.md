# StreamCodecTuner

Force a video codec (VP8 / VP9 / H264 / AV1 / H265) and a custom min/start/max bitrate envelope for screen streaming (Go Live), overriding Discord's automatic selection.

Three independently-toggleable layers:

1. **Codec table** — reorder/disable codecs in Discord's encoder negotiation.
2. **SDP** — keep/reorder video payload types and inject `x-google-{min,start,max}-bitrate` into the offer.
3. **Bitrate constants** — raise Discord's built-in `desktopBitrate` and Go Live quality caps.

A settings panel reports which codecs the host's GPU can actually encode (WebGPU / WebCodecs / native RTC probes), grays out codecs proven unavailable, and can rewrite H264 Constrained Baseline → Baseline to select a hardware encoder over OpenH264.
