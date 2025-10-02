# Silence Audio File

This file (silence.mp3) is a 1-second silent audio file used for iOS background timer support.

To generate the file, run:
```bash
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 silence.mp3
```

This audio file is looped continuously during rest timers to keep the app active in iOS background mode.
