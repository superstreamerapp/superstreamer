# Play adaptive video

Adaptive video, or adaptive bitrate streaming, is a technique that adjusts the quality of a video stream based on the viewer's network conditions and device capabilities. 

Instead of a single video file, adaptive streaming involves multiple versions of the same video at different quality levels.

In order to do this, we'll have to create an HLS playlist from our video file.

In this tutorial, we'll use the dashboard as a way to inspect what Superstreamer does. When you use our Docker images, the dashboard is hosted on `http://localhost:52000` by default.

## <span class="number">1</span> Upload our source

We'll take this Big Buck Bunny video and upload it somewhere. This could either be on the S3 configured in Superstreamer or have it accessible through http(s).

<video src="/tutorials/play-adaptive-video-input.mp4" controls class="video"></video>

For this tutorial, we'll upload it to the S3 configured in Superstreamer' `config.env` file. We have it available as `s3://input_bbb.mp4`.

## <span class="number">2</span> Transcode to multiple qualities

We'll transcode our Big Buck Bunny video and produce the following streams:

- 720 in height.
- 480 in height.
- An audio track with language "eng" (English).

<video src="/tutorials/play-adaptive-video-transcode.mp4" controls class="video"></video>

If you want fine grained control, take a look at the API docs in order to specify a different bitrate or framerate. For now, we'll rely on the sane defaults provided by Superstreamer.

Once the transcode job is finished, a unique UUID is assigned to this asset. In our example, Superstreamer created the new UUID `56bfe1d6-ce51-4a28-b688-bc64a89508b6`. From now on, if we want to do something with this transcode result, we'll simply provide this id.

<img src="/tutorials/play-adaptive-video-storage-transcode.png" class="image"></img>

We'll now see in the Storage tab that Superstreamer produced several video and audio tracks.

## <span class="number">3</span> Package to HLS

At this stage, these separate tracks don't hold much value for a player. What we need is for video players to switch between different qualities based on the user's bandwidth or preferences. To achieve this, we'll extract segments — small chunks of video—for each stream and package them into an HLS playlist.

<video src="/tutorials/play-adaptive-video-package.mp4" controls class="video"></video>

Packaging is straightforward: just grab the UUID from the transcode job (`56bfe1d6-ce51-4a28-b688-bc64a89508b6`) and pass it to the package endpoint. This triggers a packaging job behind the scenes.

## <span class="number">4</span> Check HLS playlist in storage

If we'd like to know what's being produced, we can go back to the Storage tab and inspect the `/package/56bfe1d6-ce51-4a28-b688-bc64a89508b6` folder.

<video src="/tutorials/play-adaptive-video-storage.mp4" controls class="video"></video>

Notice how we transformed a single MP4 video file into a collection of segments, all referenced by an HLS playlist. This playlist is ready to be played by any HLS-compliant player.

## <span class="number">5</span> Play our HLS playlist

<video src="/tutorials/play-adaptive-video-play.mp4" controls class="video"></video>

Superstreamer comes with a player page where you can easily test your videos. In our example, the HLS playlist is available at:

```sh

https://{PUBLIC_S3_ENDPOINT}/package/56bfe1d6-ce51-4a28-b688-bc64a89508b6/master.m3u8

```