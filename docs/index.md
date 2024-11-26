---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: Superstreamer
  text: Deliver video
  tagline: Building blocks for video streaming that's smooth, simple, and scales like a champ!
  actions:
    - theme: brand
      text: Introduction
      link: /guide/what-is-superstreamer
    - theme: alt
      text: Getting Started
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/matvp91/superstreamer
  image:
    src: /logo-mascotte.png
    alt: VitePress

features:
  - title: Transcode
    details: Converting a video file from one format or codec to another, at scale.
    icon: 
      src: /icon-transcode.svg
      width: 45
  - title: Package
    details: Prepare and organize video files for delivery and playback. Upload directly to S3.
    icon: 
      src: /icon-package.svg
      width: 40
  - title: Stitcher
    details: Personalize and tailor each video on the fly with HLS interstitials, customized for every viewer.
    icon: 
      src: /icon-stitcher.svg
      width: 54
  - title: Player
    details: A unified API and React components that seamlessly integrate into your player.
    icon: 
      src: /icon-player.svg
      width: 37
---