# Getting Started

Setting up your video streaming platform has never been easier. With just a few simple steps, you'll be up and running, delivering seamless video experiences.

Let's dive in and get you started!

## Docker Compose

If you're familiar with [Docker](https://docs.docker.com/engine/install/), we suggest you use our hosted Docker images.

Create a new folder with a fresh `docker-compose.yml` file and copy the contents from below.

::: code-group

```yml [docker-compose.yml]
version: "3"

volumes:
  superstreamer_redis_data:
  superstreamer_postgres_data:

services:
  superstreamer-api:
    image: "superstreamerapp/api:latest"
    restart: always
    ports:
      - 52001:3000
    depends_on:
      - superstreamer-postgres
      - superstreamer-redis
    env_file: .env
    environment:
      - REDIS_URI=redis://superstreamer-redis:6379
      - DATABASE_URI=postgresql://postgres:sprs@superstreamer-postgres/sprs

  superstreamer-app:
    image: "superstreamerapp/app:latest"
    ports:
      - 52000:3000
    environment:
      - PUBLIC_API_ENDPOINT=http://localhost:52001
      - PUBLIC_STITCHER_ENDPOINT=http://localhost:52002

  superstreamer-artisan:
    image: "superstreamerapp/artisan:latest"
    restart: always
    depends_on:
      - superstreamer-redis
    env_file: .env
    environment:
      - REDIS_URI=redis://superstreamer-redis:6379

  superstreamer-stitcher:
    image: "superstreamerapp/stitcher:latest"
    restart: always
    ports:
      - 52002:3000
    depends_on:
      - superstreamer-redis
    env_file: .env
    environment:
      - REDIS_URI=redis://superstreamer-redis:6379
      - PUBLIC_API_ENDPOINT=http://localhost:52001
      - PUBLIC_STITCHER_ENDPOINT=http://localhost:52002

  superstreamer-redis:
    image: redis/redis-stack-server:7.2.0-v6
    ports:
      - 127.0.0.1:6379:6379
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
    volumes:
      - superstreamer_redis_data:/data

  superstreamer-postgres:
    image: "postgres:latest"
    restart: always
    stop_signal: SIGINT
    ports:
      - "5432:5432"
    volumes:
      - superstreamer_postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_INITDB_ARGS=--data-checksums
      - POSTGRES_DB=sprs
      - POSTGRES_PASSWORD=sprs
```

:::

Create a `.env` file in the same folder. Make sure to configure it properly for your setup.

::: code-group

```sh [.env]
S3_ENDPOINT=
S3_REGION=us-east-1
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=superstreamer
PUBLIC_S3_ENDPOINT=https://s3.us-east-1.amazonaws.com/superstreamer
SUPER_SECRET=somethingsupersecret
```

:::

Start the necessary services with [Docker Compose](https://docs.docker.com/compose/).

::: code-group

```sh [Terminal]
$ docker compose up -d
```

:::

By default, we host the app on port `52000`. Open `http://127.0.0.1:52000` in your browser, and you're all set!

The default username is `admin` and the default password is `admin`.

::: info

In a scalable architecture, you probably do not want to run the ffmpeg and transcode workers on the same machine as your api or the stitcher.

:::

## Without Docker

We're committed to making it easy to run Superstreamer on your setup of choice. Docker is not required, although it greatly simplifies the setup. The project is organized as a monorepo, and each service or app comes with its own `build` script. You can build the entire project and all its packages with just a single command. The backend services use [Bun](https://bun.sh/), while the frontend app and player are built with [Vite](https://vite.dev/). 

Know that each service or app requires a separate `.env` file, you'll have to configure these individually. We'll guide you through the setup.

### Prerequisites

- Redis, we suggest [Redis Stack](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/).
- [Bun](https://bun.sh/) v1.2.2 or above.
- A [PostgreSQL](https://www.postgresql.org/) database.

### Get source from GitHub

::: code-group

```sh [Terminal]
git clone git@github.com:superstreamerapp/superstreamer.git
cd superstreamer
```

:::

### Install dependencies

First, we're going to install a couple of dependencies. Run the following commands at the root of the project.

::: code-group

```sh [Terminal]
# Install dependencies
$ bun install
# Install binary dependencies, such as ffmpeg
$ bun run install-bin
```

:::

### Configure environment variables

As we mentioned earlier, each service or app requires a separate `.env` file. Make sure you have the env variables properly configured.

::: warning

The SUPER_SECRET env variable shall never be shared. It is used to encrypt and decrypt information, such as authentication tokens.

:::

First, we're going to configure the API. Create a `.env` file in **apps/api**.

::: code-group

```sh [.env]
PORT=52001
REDIS_URI=redis://localhost:6379
S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=
DATABASE_URI=
SUPER_SECRET=secret
```

:::

Now, we're going to configure the app. This is a dashboard that visualizes the API. Create a `.env` file in **apps/app**.

::: code-group

```sh [.env]
PUBLIC_STITCHER_ENDPOINT=http://localhost:52002
PUBLIC_API_ENDPOINT=http://localhost:52001
```

:::

Next, create a `.env` file in **apps/artisan**. The same configuration must be used as the API.

::: code-group

```sh [.env]
REDIS_URI=redis://localhost:6379
S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=
```

:::

Finally, we're going to configure the stitcher. Create a `.env` file in **apps/stitcher**.

::: code-group

```sh [.env]
PORT=52002
REDIS_URI=redis://localhost:6379
PUBLIC_S3_ENDPOINT=
PUBLIC_STITCHER_ENDPOINT=http://localhost:52002
PUBLIC_API_ENDPOINT=http://localhost:52001
SUPER_SECRET=secret
```

:::

### Build services or app

We're going to build the different apps into their single Javascript files. The bundling for services happens under the hood with Bun, and each client package is built with Vite. The build files are created in the `dist` folder of each package respectively.

Run the following command at the root of the project:

::: code-group

```sh [Terminal]
$ bun run build
```

:::

### Start services or app

Now that we have each service built, let's run them locally. In the example below, we'll start the **apps/api**. Know that each service can be started this way.

::: code-group

```sh [Terminal]
$ cd apps/api
$ bun run dist/index.js
```

:::

You're currently running the different backend services locally. If you'd like to interact with the API, or with the Stitcher, we suggest you run the dashboard app. It's a single page application (SPA), you can host it statically everywhere you like. When the app is build, it'll read the `PUBLIC_` environment variables from the config file at the root of the project and include these into the Javascript bundles.

::: code-group

```sh [Terminal]
$ cd apps/app
$ npx serve dist
```

:::

If you'd like to host the app elsewhere, all files can be found in `apps/app/dist`.

## Development

We've already covered how to build Superstreamer locally, and we've also made it easy to start developing on the project. Before you start, make sure you have the `.env` files properly configured [here](#configure-environment-variables).

Just run `bun run dev` from the root of the project, and it will launch all the services, including the app. Head over to `http://localhost:52000`, and you'll be welcomed by the app!

::: code-group

```sh [Terminal]
$ bun run dev
```

:::

## S3

Superstreamer supports any S3 compliant service. Just add the appropriate credentials to your `.env` file, and you're all set.

We've tested the following providers:

- [AWS S3](https://aws.amazon.com/s3/)
- [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/)
- [Backblaze B2](https://www.backblaze.com/cloud-storage)

### Local S3

If you'd like to emulate or provide S3-like object storage environments locally, we'd suggest you pick one of the following projects:

- [MinIO](https://min.io/)
- [LocalStack](https://www.localstack.cloud/)