# MentionRain

Adds a brief rain animation across the screen when you get mentioned. Three styles: cinematic (default, with parallax + splashes), classic (simple lines), sparkle (diamond particles).

Triggers on direct `@user` mentions and on replies to your messages. `@everyone` is opt-in.

No network calls, no audio, no DOM patches into the chat tree. Renders to a single fullscreen `<canvas>` that gets cleaned up after the shower ends.
