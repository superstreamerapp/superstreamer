# Subtitles

You can provide multiple subtitle files (.vtt) to the transcode job and Superstreamer will create separate text tracks, which can then be packaged into an HLS playlist.

```sh
curl -X POST
  "https://api.superstreamer.xyz/jobs/transcode"

```

::: code-group

```json [Request]
{
  "inputs": [
    {
      "type": "text",
      "path": "s3://english_subtitles.vtt",
      "language": "eng"
    },
    {
      "type": "text",
      "path": "s3://dutch_subtitles.vtt",
      "language": "nld"
    }
    // ... audio and video input
  ],
  "streams": [
    {
      "type": "text",
      "language": "eng"
    },
    {
      "type": "text",
      "language": "nld"
    }
  ]
}
```