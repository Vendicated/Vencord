# HardwareMuteSync

Mutes Discord when you mute your microphone with its hardware button (e.g. the tap-to-mute sensor on the HyperX DuoCast), and unmutes it when you unmute.

Many USB microphones don't tell the system when their mute button is pressed, they just stop sending audio. The plugin listens to the microphone and treats near-total silence (far below any real noise floor) as muted.

Set the device name in the plugin settings (e.g. `DuoCast`) or leave it empty to use the system default microphone.
