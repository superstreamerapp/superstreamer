# @superstreamer/artisan

The actual workers, this is where ffmpeg, ffprobe and the packager run.

We rely on [bullmq](https://www.npmjs.com/package/bullmq) as queue. Artisan will pick an available job from the queue and get to work.