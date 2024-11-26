---
outline: [2,3]
---

# Player

Superstreamer comes with a player wrapper around [HLS.js](https://github.com/video-dev/hls.js/). Our goal is to offer a simplified API alongside HLS.js, tailored for developers building a player UI, while preserving access to the powerful features that HLS.js provides.

<iframe class="iframe" style="aspect-ratio: 13.55 / 9;" src="https://stackblitz.com/edit/superstreamer-player-demo?embed=1&file=src%2FPlayer.tsx&view=preview"></iframe>

The wrapper focuses on the following goals:

- Offer intuitive data structures, events, and methods tailored for developers building a player UI.
- Implement a robust state machine.
- Provide simplified player-centric methods like `playOrPause`, `setVolume`, and more.
- Support spec-compliant plugins, including features like ad signaling.

::: tip

If you're only interested in the React bindings and components, you can skip the facade section. The React integration uses a facade internally, so there's no need for you to provide one yourself.

:::

## Installation

::: code-group

```sh [npm]
npm i hls.js@1.6.0-beta.1
npm i @superstreamer/player
```

```sh [pnpm]
pnpm add hls.js@1.6.0-beta.1
pnpm add @superstreamer/player
```

```sh [yarn]
yarn add hls.js@1.6.0-beta.1
yarn add @superstreamer/player
```

```sh [bun]
bun add hls.js@1.6.0-beta.1
bun add @superstreamer/player
```

:::

::: warning

We're currently using a beta version of HLS.js, v1.6.0-beta.1. Once the final release is available, we'll update the peer dependency accordingly.

:::

## Facade

Create a new `HlsFacade` instance and pass it your existing `Hls` instance Start by consulting the HLS.js [docs](https://github.com/video-dev/hls.js/) first.

::: code-group

```ts [TypeScript]
import Hls from "hls.js";
import { HlsFacade } from "@superstreamer/player";

// Create an Hls & HlsFacade instance.
const hls = new Hls();
const facade = new HlsFacade(hls);

// Attach a media element.
const mediaElement = document.querySelector("video");
hls.attachMedia(mediaElement);

// Load a source.
hls.loadSource("https://domain.com/master.m3u8");
```

:::

## React

Using React to define your UI declaratively is far more enjoyable than taking an imperative approach. Since the UI serves as a visual representation of the state, creating controls in React is a pleasant experience. 

However, there are some considerations to keep in mind. 

Extracting state from the facade and storing it in memory solely to inform React of changes can be resource-intensive. That's why we've dedicated significant effort to ensuring that state updates are as lightweight as possible.

Our hooks allow you to efficiently consume player state by creating small, memoized subsets of the specific state needed for each component, ensuring optimal performance.

### Tailwind

The components are styled with [Tailwind](https://tailwindcss.com/), make sure you have it setup properly. Open your `tailwind.config.js` file and include the player build.
 
::: code-group

```ts [tailwind.config.js]
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    // Add the following line:
    "./node_modules/@superstreamer/player/dist/**/*.{js,ts,jsx,tsx}",
  ],
  // ...
};
```

:::

### Controls

We developed a React component for player controls, along with a controller hook that significantly simplifies the setup of a facade instance. If you're working with React, use the `@superstreamer/player/react` import instead.

::: code-group

```tsx [Player.tsx]
import Hls from "hls.js";
import {
  ControllerProvider,
  Controls,
  useController,
} from "@superstreamer/player/react";

export function Player() {
  const [hls] = useState(() => new Hls());
  const controller = useController(hls);

  // Controller creates a facade internally, interact with it as you please.
  const { facade } = controller;

  useEffect(() => {
    if (url) {
      hls.loadSource(url);
    }
  }, [url]);

  return (
    <ControllerProvider controller={controller}>
      <div
        className="relative aspect-video bg-black overflow-hidden"
        data-sprs-container
      >
        <video
          ref={controller.mediaRef}
          className="absolute inset-O w-full h-full"
        />
        <Controls />
      </div>
    </ControllerProvider>
  );
}
```

:::

### Custom components

Building your own components with Superstreamer is straightforward. We've introduced a custom hook called `useSelector` that allows you to define a subset of the facade state and scopes it to a single component. This ensures that your component only re-renders when the specified subset of state changes. This approach significantly reduces the number of re-renders in React, which is particularly important for a player where state changes frequently and rapidly over short periods.

The selector hook is available in components that have the `ControllerProvider` context as a parent.

::: code-group

```tsx [CustomTime.tsx]
import { useSelector } from "@superstreamer/player/react";

export function CustomTime() {
  const time = useSelector(facade => facade.time);
  const duration = useSelector(facade => facade.duration);

  if (!Number.isFinite(duration)) {
    // Bail out early when the duration is NaN.
    return null;
  }

  return <span>You have watched {Math.trunc(time / duration * 100)}%</span>
}
```

```tsx [Player.tsx]
// Other imports ...
import { CustomTime } from "./CustomTime";

export function Player() {
  // Other logic ...
  return (
    <ControllerProvider controller={controller}>
      <div
        className="relative aspect-video bg-black overflow-hidden"
        data-sprs-container
      >
        {/* Add your own component */}
        <CustomTime />
      </div>
    </ControllerProvider>
  )
}
```

:::

::: tip

If you're looking for examples of the useSelector hook, our controls are packed with them. Visit https://github.com/matvp91/superstreamer/tree/main/packages/player/src/react/controls/components for many examples.

:::