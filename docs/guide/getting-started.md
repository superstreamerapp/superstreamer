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
  superstreamer-app:
    image: "superstreamerapp/app:latest"
    ports:
      - 52000:52000
    environment:
      - PUBLIC_API_ENDPOINT=http://localhost:52001
      - PUBLIC_STITCHER_ENDPOINT=http://localhost:52002

  superstreamer-api:
    image: "superstreamerapp/api:latest"
    restart: always
    ports:
      - 52001:52001
    depends_on:
      - superstreamer-postgres
      - superstreamer-redis
    env_file: config.env
    environment:
      - REDIS_HOST=superstreamer-redis
      - DATABASE_URI=postgresql://postgres:sprs@superstreamer-postgres/sprs

  superstreamer-stitcher:
    image: "superstreamerapp/stitcher:latest"
    restart: always
    ports:
      - 52002:52002
    depends_on:
      - superstreamer-redis
    env_file: config.env
    environment:
      - REDIS_HOST=superstreamer-redis
      - PUBLIC_API_ENDPOINT=http://localhost:52001
      - PUBLIC_STITCHER_ENDPOINT=http://localhost:52002

  superstreamer-artisan:
    image: "superstreamerapp/artisan:latest"
    restart: always
    depends_on:
      - superstreamer-redis
    env_file: config.env
    environment:
      - REDIS_HOST=superstreamer-redis

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

Create a `config.env` file in the same folder.

::: code-group

```sh [config.env]
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

::: info

In a scalable architecture, you probably do not want to run the ffmpeg and transcode workers on the same machine as your api or the stitcher.

:::

::: tip

If you'd like to change the port of each service individually, provide the `PORT` environment variable for each service individually.

- [AWS S3](https://aws.amazon.com/s3/)

- [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/)

:::

### Use S3

Superstreamer supports any S3 compliant service. Just add the appropriate credentials to your `config.env` file, and you're all set.

### Use local

If you'd like to emulate or provide S3-like object storage environments locally, we'd suggest you pick one of the following projects:

- [MinIO](https://min.io/)
- [LocalStack](https://www.localstack.cloud/)

## Local builds

One of our main goals is to help you get up and running locally with minimal hassle. Superstreamer is organized as a monorepo, and each service or app comes with its own `build` script. You can build the entire project and all its packages with just a single command. The backend services use Bun, while the frontend app and player are built with Vite. Superstreamer relies on a unified environment variable setup, the `config.env` file at the root of the project.

### Prerequisites

- Redis, we suggest [Redis Stack](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/).
- [Bun](https://bun.sh/) v1.1.30 or above.

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

### Build packages

Before we build, we're going to configure a few environment variables first.

::: code-group

```sh [Terminal]
$ cp config.env.example config.env
# Edit config.env with your own variables
```

If you'd like to use a local S3 setup, we recommend [LocalStack](https://www.localstack.cloud/), a fully functional local AWS cloud stack that enables developers to test and develop cloud applications offline. While we definitely don't need an entire AWS-like setup, we can use the S3 part.

:::

Next up, we're going to build the different packages into their single Javascript files. The bundling for services happens under the hood with Bun, and each client package is built with Vite. The build files are created in the `dist` folder of each package respectively.

::: code-group

```sh [Terminal]
$ bun run build
```

:::

### Up and Running

Now that we have each package build, let's run them locally.

::: code-group

```sh [Terminal]
# Run the api, default port is 52001
$ bun run packages/api/dist/index.js

# Run artisan, the job runner
$ bun run packages/artisan/dist/index.js

# Run the stitcher, default port is 52002
$ bun run packages/stitcher/dist/index.js
```

:::

If you'd like to interact with the API, or with Stitcher, run the app. It's a single page application (SPA), you can host it statically everywhere you like. When the app is build, it'll read the `PUBLIC_` environment variables from the config file at the root of the project and include these into the Javascript bundles. If you'd like to run the app locally, you can use our dev script.

::: code-group

```sh [Terminal]
$ bun run --filter=\"@superstreamer/app\" dev
```

:::

If you'd like to host the app elsewhere, all files can be found in `packages/app/dist`.

### Development

We've already covered how to build Superstreamer locally, and we've also made it easy to start developing on the project. Just run `bun run dev` from the root of the project, and it will launch all the services, including the app. Head over to `http://localhost:52000`, and you'll be welcomed by the app!

::: code-group

```sh [Terminal]
$ bun run dev
```

### Quick Development Environment Setup

We have also created a `docker-compose-dev.yml` so you can setup your development environment faster and start getting hands on!

```shell
# We have prebuilt developmnet containers, see docker/docker-compose-dev.yml
cd docker
docker-compose -f docker-compose-dev.yml up
```

You can use this `config.env.development` for a quick setup:

```shell
S3_ENDPOINT=http://s3.localhost.localstack.cloud:4566/
S3_REGION=us-east-1
S3_ACCESS_KEY=test
S3_SECRET_KEY=test
S3_BUCKET=sprs-bucket

# With Docker, use "redis", use "localhost" when you
# run Redis on your own device.
REDIS_HOST=localhost
REDIS_PORT=6379

# These are public, they'll end up in client JS.
PUBLIC_API_ENDPOINT=http://localhost:52001
PUBLIC_STITCHER_ENDPOINT=http://localhost:52002
PUBLIC_S3_ENDPOINT=http://s3.localhost.localstack.cloud:4566/sprs-bucket

# Shared secret
# *** Never EVER expose this publicly, auth tokens are signed with this secret.
SUPER_SECRET=abc

# Database
# Provide a PostgreSQL connection string
DATABASE_URI=postgresql://postgres:sprs@localhost:5432/sprs
```

Run it with:

```shell
# Install dependencies
bun install

# Install binary dependencies, such as ffmpeg
bun run install-bin

# RUN!
bun run dev
```

:::
