# Contribute

This is a living document about notes from contributors. If you'd like to contribute yourself, feel free to read through this info first.

## Running jobs

We rely on [BullMQ](https://docs.bullmq.io/), a queue job runner, to define transcode, package and ffmpeg jobs. Eg; take the `/transcode` endpoint, this will push a job to the Redis queue. Artisan constantly monitors the Redis queue for pending work, and when there is a pending job available, it'll start working on that. When finished, it'll update the job that it finished.

```
[api service]
  - POST /transcode
  - Pushes the job to the Redis queue

[artisan]
  - Monitors the Redis queue
  - Picks up a pending job and starts working (eg; transcode, ffmpeg or package)
  - Updates the state of the job on the Redis queue.
```

We choose this implementation because we'd like to horizontally scale artisan. You can run multiple machines with workers ready to consume work (like transcode jobs) while having a single api instance running on another machine.

## Playlist manipulation

The stitcher service can do playlist manipulation on the fly. High level it works like this:

```
[stitcher service]
  - POST /session will setup a serverside session and return a playlist URL with a sessionId.
  - https://stitcher.com/{sessionId}/master.m3u8 is a valid master playlist.
  - When fetching master.m3u8, we parse the HLS, manipulate it based on properties of the serverside session (eg; like a filter).
  - When fetching playlist.m3u8, we parse the HLS, manipulate it based on properties of the serverside session (eg; like adding interstitials).
```

It's important to note that we create a serverside session in order to keep state across the different endpoints (master.m3u8 / playlist.m3u8). Aslong as we have a sessionId available, we can get info or update the session based on this.

For example, when the client fetches `master.m3u8`, and the session has been started with a VMAP url, we'll fetch the VMAP and parse it internally before returning the playlist response to the client. When we parsed the VMAP on the backend, we'll update the session with a `vmapResponse` value.

Next up, when the client fetches a `playlist.m3u8`, it can grab the session and notice there is a `vmapResponse`. It can then interprete that info and add the right EXT-X-DATERANGE tags (also refered to as interstitials when `CLASS=com.apple.hls.interstitial`).

## HLS parser

Stitcher parses and stringifies HLS playlists. We wrote a custom parser, and the description below is a brief introduction to it. It's important to read the [HLS spec](https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis) first. Or atleast get a sense of what is mandatory, optional and the features of the spec. The stitcher service is built around this spec, from playlist parsing to manipulation to output.

- **parse**

  Parsing a playlist as text happens in 2 steps. It's important to note that we do not derive the type (master, media) of a playlist, and explicitly have to call parseMasterPlaylist, which will return a `MasterPlaylist` or parseMediaPlaylist which will return a `MediaPlaylist`.

  The first step is a lexical parse, where each `EXT-X-...` tag is presented in memory as a typed object. The result is a list of lexical tags. Each lexical tag is typed, eg: `EXT-X-MEDIA` has an attributes property that contains key value pairs specifically for that tag name. Know that lexical tags are merely a list, they do not include pointers of whether the playlist is a master or a media playlist. All they do is take a line of text and try and parse that to something that makes sense in a typed manner.

  The second step is creating a `MasterPlaylist` or a `MediaPlaylist` from these lexical tags. Both types are explicitly defined, while other parsers often create a generic parse method, we felt it's too generic. We'd rather instruct text to be parsed as a media or master playlist instead.

- **stringify**

  A `MasterPlaylist` can be stringified back to text with the stringifyMasterPlaylist method, the same for a `MediaPlaylist` but then you'd use the stringifyMediaPlaylist. The output is HLS spec compliant text.

## HLS interstitials

HLS (HTTP Live Streaming) interstitials are mid-stream content insertions in an HLS video stream. These can include ads, promotional content, or other types of video that interrupt the main content, typically during predefined breaks. Read Apple's [HLS Interstitials](https://developer.apple.com/streaming/GettingStartedWithHLSInterstitials.pdf) spec for more info.