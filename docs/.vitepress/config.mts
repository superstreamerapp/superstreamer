import { defineConfig } from "vitepress";
import pkg from "../package.json";

export default defineConfig({
  base: "/",
  title: "Superstreamer",
  description:
    "An open, scalable, online streaming setup. All-in-one toolkit from ingest to adaptive video playback.",
  lang: "en-US",
  head: [
    ["link", { rel: "icon", type: "image/png", href: "/logo-mascotte.png" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:locale", content: "en" }],
    [
      "meta",
      {
        property: "og:title",
        content:
          "Superstreamer | All-in-one toolkit from ingest to adaptive video playback",
      },
    ],
    ["meta", { property: "og:site_name", content: "Superstreamer" }],
    [
      "script",
      {},
      `
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId setPersonProperties".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
          posthog.init('phc_pNLByqSP4cjmxC6BcLttR3rpa4jbOpJlOmQeV9EzwBR',{api_host:'https://eu.i.posthog.com', person_profiles: 'identified_only' // or 'always' to create profiles for anonymous users as well
        })
      `,
    ],
  ],
  themeConfig: {
    logo: {
      src: "/logo-mascotte.png",
      height: 21,
    },
    search: {
      provider: "algolia",
      options: {
        appId: "4JIX5YPW7R",
        apiKey: "97be940a67cc7ae000c625203b1c51f1",
        indexName: "matvp91io",
      },
    },
    nav: [
      {
        text: "Guide",
        link: "/guide/what-is-superstreamer",
        activeMatch: "/guide/",
      },
      {
        text: "Reference",
        link: "/reference/player",
        activeMatch: "/reference/",
      },
      {
        text: pkg.version,
        items: [
          {
            text: "Contributing",
            link: "https://github.com/matvp91/superstreamer/blob/main/CONTRIBUTING.md",
          },
          {
            text: "Code of Conduct",
            link: "https://github.com/matvp91/superstreamer/blob/main/CODE_OF_CONDUCT.md",
          },
        ],
      },
    ],
    sidebar: {
      "/guide/": {
        base: "/guide/",
        items: sidebarGuide(),
      },
      "/reference/": {
        base: "/reference/",
        items: sidebarReference(),
      },
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/matvp91/superstreamer" },
    ],
    editLink: {
      pattern: "https://github.com/matvp91/superstreamer/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
    footer: {
      message: "Released under the MPL-2.0 License.",
      copyright: "Copyright © 2024-present Matthias Van Parijs",
    },
  },
  vite: {
    clearScreen: false,
  },
});

function sidebarGuide() {
  return [
    {
      text: "Introduction",
      items: [
        {
          text: "What is Superstreamer?",
          link: "what-is-superstreamer",
        },
        {
          text: "Getting Started",
          link: "getting-started",
        },
      ],
    },
    {
      text: "Project",
      items: [
        {
          text: "What's included",
          link: "whats-included",
        },
        {
          text: "Building blocks",
          link: "building-blocks",
          items: [
            {
              text: "Video processing",
              link: "video-processing",
            },
            {
              text: "Video personalization",
              link: "video-personalization",
            },
            {
              text: "Player",
              link: "player",
            },
          ],
        },
        {
          text: "Tutorials",
          items: [
            {
              text: "Play adaptive video",
              link: "tutorials/play-adaptive-video"
            },
            {
              text: "Add bumper like Netflix",
              link: "tutorials/add-bumper-like-netflix"
            }
          ]
        }
      ],
    },
    {
      text: "Miscellaneous",
      items: [
        {
          text: "Contribute",
          link: "contribute",
        },
        {
          text: "Thank you",
          link: "thank-you",
        },
      ],
    },
  ];
}

function sidebarReference() {
  return [
    {
      text: "Reference",
      items: [
        {
          text: "Player",
          link: "/player",
        },
      ],
    },
  ];
}
