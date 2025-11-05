# NativeIdle

Provides native idle integration for Vesktop, mimicking the official Discord desktop client's auto-idling behaviours.

Vesktop will idle when:

- the user is inactive on their pc for more than 10 minutes\*
- system suspends/sleeps
- system lockscreen is triggered\*\*

\*on Wayland linux, this requires [ext-idle-notify-v1](https://wayland.app/protocols/ext-idle-notify-v1) to be implemented by your compositor.

\*\*only works on Windows and MacOS
