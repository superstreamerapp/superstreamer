# Audio (lang, 5.1)

Superstreamer will probe audio input and figure out the amount of channels and the language from the input metadata. When metadata cannot be extracted, you must provide your own language code.

```sh
curl -X POST
  "https://api.superstreamer.xyz/jobs/transcode"

```

::: code-group

```json [Request]
{
  "inputs": [
    // The audio present in the video input is English.
    {
      "type": "audio",
      "path": "s3://source/video.mp4",
      "language": "eng"
    },
    // We'll add a separate, Dutch, audio track.
    {
      "type": "audio",
      "path": "s3://source/video/dutch.mp3",
      "language": "nld"
    },
    // And we have a variant, Dutch, track with 5.1 (6 channels) audio.
    {
      "type": "audio",
      "path": "s3://source/video/dutch_5.1.mp3",
      "language": "nld",
      // You can omit "channels" if Superstreamer is able to extract the amount of channels by probing.
      "channels": 6
    },
    // ... video and text input
  ],
  "streams": [
    {
      "type": "audio",
      "language": "eng"
    },
    {
      "type": "audio",
      "language": "nld"
    }
  ]
}
```