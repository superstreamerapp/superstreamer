# Video processing

We'll begin by processing and preparing our video source file (e.g., MP4, MKV, ...), ensuring it's properly formatted and optimized for the next stages of transcoding and packaging.

## Terminology

Before we dive in, let's cover some basic terminology. We'll keep this brief, but if you're eager to learn more about video, check out [howvideo.works](https://howvideo.works/). They provide a great explanation of the video delivery process from source to playback.

- Transcode

  The first step is video transcoding, which converts a video from one format or codec to another, ensuring it works across different devices, browsers, and network conditions. For Superstreamer, this involves transcoding into various tracks, such as 720p or 1080p video, and stereo or surround audio.

- Packaging

  After transcoding, we have different video and audio tracks, but they need to be combined into a single format that can be played smoothly. Video packaging organizes these tracks so the player can easily access and switch between them based on the user's device and internet speed. For Superstreamer, we generate HLS playlists.

- HLS

  HLS (HTTP Live Streaming) is a protocol that splits video into small chunks and delivers them over HTTP. For Superstreamer, we focus exclusively on using HLS for streaming.

## Start a transcode <Badge type="info" text="Step 1" />

To stream an MP4 file to your audience, the process begins with transcoding it into various qualities, potentially adding multiple audio languages or subtitle tracks. To interact with Superstreamer, simply make an API request to get started.

<img class="schema" src="/schema-transcode.png" />

We'll begin by sending a `POST` request to the `/transcode` endpoint of our API. In this request, we'll specify the source files (our available inputs) and define the desired outputs — specifically, HD and Full HD video tracks, along with English audio.

```sh
curl -X POST
  "https://api.domain.com/transcode"

```

::: code-group

```json [Request]
{
  "inputs": [
    {
      "type": "video",
      "path": "https://domain.com/video.mp4"
    },
    {
      "type": "audio",
      "path": "https://domain.com/video.mp4",
      "language": "eng"
    }
  ],
  "streams": [
    {
      "type": "video",
      "codec": "h264",
      "height": 1080
    },
    {
      "type": "video",
      "codec": "h264",
      "height": 720
    },
    {
      "type": "audio",
      "codec": "aac",
      "language": "eng"
    }
  ]
}
```

:::

Under the hood, Superstreamer kicks off a transcode job to produce the output streams. Once completed, each job is assigned a unique UUID. For example, in this case, the UUID is `46169885-f274-43ad-ba59-a746d33304fd`.

This request above will provide a response containing the jobId:

::: code-group

```json [Response]
{
  "jobId": "transcode_46169885-f274-43ad-ba59-a746d33304fd"
}
```

:::

This UUID serves as a reference for the asset across all interactions with the Superstreamer API.

When the job is done, we have separate video tracks in various quality levels and a single audio track in English, exactly the result we were aiming for.

## Start a package <Badge type="info" text="Step 2" />

Our video and audio tracks are stored as separate files. Let's package them into an HLS playlist, which players will use to determine what to load and at which resolution.

<img class="schema" src="/schema-package.png" />

We'll send a `POST` request to the `/package` endpoint of our API, and all we'll have to do is provide the assetId returned by our transcode job.

```sh
curl -X POST
  "https://api.domain.com/package"
```

::: code-group

```json [Request]
{
  "assetId": "46169885-f274-43ad-ba59-a746d33304fd"
}
```

:::

We'll check the dashboard app to check the status of our transcode job.

And that's it. We now have an HLS playlist available on our S3 bucket.

```
https://cdn.domain.com/package/46169885-f274-43ad-ba59-a746d33304fd/master.m3u8
```

## Start a pipeline

In earlier steps, we covered how to transcode and package your video file. With a pipeline job, these two steps can be combined into a single process.

```sh
curl -X POST
  "https://api.domain.com/pipeline"

```

```json [Request]
{
  "inputs": [
    {
      "type": "video",
      "path": "https://domain.com/video.mp4"
    },
    {
      "type": "audio",
      "path": "https://domain.com/video.mp4",
      "language": "eng"
    }
  ],
  "streams": [
    {
      "type": "video",
      "codec": "h264",
      "height": 1080
    },
    {
      "type": "video",
      "codec": "h264",
      "height": 720
    },
    {
      "type": "audio",
      "codec": "aac",
      "language": "eng"
    }
  ]
}
```

The pipeline job generates a unique UUID, and once complete, your asset is instantly available as an HLS playlist — just as if you had packaged it manually.