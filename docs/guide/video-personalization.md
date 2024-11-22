---
outline: [2,4]
---

# Video personalisation

Superstreamer comes with a separate project named Stitcher, an HLS playlist manipulator that can insert interstitials on-the-fly. You can use Stitcher to set individual quality limits for each user or to insert advertisements into your content.

Make sure you read the [Video processing](/guide/video-processing) page first. In order to stitch playlists together, we must first make sure we have our video files processed and available as HLS playlists.

## Terminology

Before we dive in, let's cover some basic terminology. We'll keep this brief, but if you're eager to learn more about video, check out [howvideo.works](https://howvideo.works/). They provide a great explanation of the video delivery process from source to playback.

- Stitching

  Stitching is the real-time manipulation of a video stream, where multiple HLS playlists are combined and adjusted on the fly. It allows for adding bumpers or ads seamlessly.

- HLS

  HLS (HTTP Live Streaming) is a protocol that splits video into small chunks and delivers them over HTTP. For Superstreamer, we focus exclusively on using HLS for streaming.

- Interstitial

  An interstitial is a type of video segment inserted into an HLS playback session, usually serving as a mid-stream interruption for purposes like advertisements, informational messages, or promotional content.

## Use cases

- Insert linear ads at given cue points, derived from a VMAP (a spec compliant format that includes the positions of where ads should be in a video).
- Add a bumper playlist at the start of a playlist, like Netflix' intro. You wouldn't want to re-transcode an asset if a bumper changes.
- Filter a media playlist to exclude qualities, eg; free users can stream up to 720p.

## Create a session

To personalize a playback session, begin by creating a session for a specific user. This requires a `POST` request, where the body includes parameters for Stitcher to generate a customized playlist in response.

<div style="display: flex; justify-content: center;">
  <img class="schema" src="/schema-stitcher.png" style="max-width: 350px;" />
</div>

Providing input for the stitcher happens in the form of a `uri`. The support uri schemas are:

- **asset://{assetId}**

  We want to greatly simplify how you stitch playlists together. If you use the asset scheme, Superstreamer will know that you mean a package result from within the platform.
  
- **https://{url}/master.m3u8**

  In case you want to use HLS playlists hosted elsewhere, you can use the http(s) scheme.

```sh
curl -X POST
  "https://stitcher.domain.com/session"
  -H "Content-Type: application/json"
```

```json
{
  // If your asset is known to Superstreamer API, you can refer to it by assetId:
  "uri": "asset://2d6e6c0e-07d9-48b1-8192-318f32a3b909",

  // OR - if you provide a UUID without scheme, we'll assume it's an assetId:
  "uri": "2d6e6c0e-07d9-48b1-8192-318f32a3b909",

  // OR - an external playlist:
  "uri": "https://my-awesome-external-service/assets/123/master.m3u8"
}
```

The response includes the new playlist URL, and you can pass this on directly to the player. The UUID in the playlist URL is the `sessionId`. Superstreamer will keep a session in memory with information about the session.

```json
{
  "url": "{PUBLIC_STITCHER_ENDPOINT}/out/625f68c2-6c09-44d4-a50f-81873cb7839b/master.m3u8"
}
```

That's nice and all, but all we did was play an asset through the stitcher. That's not very interesting. What is interesting is the fact that we can manipulate the playlist for each session individually.

### Filters

You can apply filters, such as limit the different resolutions. Filters can apply to both the master as the media playlist.

#### Resolution

When streaming over networks with limited bandwidth (eg; mobile networks), removing higher-bitrate renditions can help prevent buffering issues or excessive data usage, or if you want to serve a specific set of users with a lower resolution.

```json
{
  "uri": "asset://f7e89553-0d3b-4982-ba7b-3ce5499ac689",
  "filter": {
    // Remove all renditions with a height lower or equal than 480.
    "resolution": "<= 480"
  }
}
```

#### Audio language

To filter by audio language, provide a comma-separated list.

```json
{
  "uri": "asset://f7e89553-0d3b-4982-ba7b-3ce5499ac689",
  "filter": {
    // Keep only English and Dutch as audio track.
    "audioLanguage": "eng, nld"
  }
}
```

### Manual interstitials

Let's say you transcoded and packaged a new asset, a bumper for example. We'll add it as an interstitial. An HLS interstitials supported player will then switch to the new asset at position 10 and when finished, it'll go back to the primary content.

```json
{
  "uri": "asset://f7e89553-0d3b-4982-ba7b-3ce5499ac689",
  "interstitials": [
    {
      "timeOffset": 10,
      "uri": "asset://abbda878-8e08-40f6-ac8b-3507f263450a"
    }
  ]
}
```

If you'd like to add a bumper, you'd insert an interstitial at position 0.

### Linear advertisements

We solely work with standards. VMAP (Video Multiple Ad Playlist) is an XML-based specification that defines how multiple ad breaks can be inserted into a video stream. Instruct Stitcher to add interstitials based on VMAP definitions. Each VMAP contains one or more AdBreak elements with a position of where the interstitial should be.

```json
{
  "uri": "asset://f7e89553-0d3b-4982-ba7b-3ce5499ac689",
  "vmap": {
    "url": "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&cust_params=sample_ar%3Dpremidpost&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&impl=s&cmsid=496&vid=short_onecue&correlator="
  }
}
```

Stitcher will perform a couple of actions behind the scenes:

- Fetches the VMAP. Parses, resolves and flattens each corresponding VAST. For each ad that has not yet been transcoded, it'll start a transcode and package job with sane defaults.
- Each transcode or package job responsible for an ad is tagged with ad and can be observed in the dashboard.
- For each ad break that is available, it'll add an interstitial so that players can play the ad.

::: warning

Ad impressions are not tracked yet, we'd eventually like to provide a client wrapper that tracks ads in a certified manner. There's a spec on the way! More news later.

:::