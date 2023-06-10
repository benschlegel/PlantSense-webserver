# PlantSense web server

This project contains the source code of the main web server of the [PlantSense](https://github.com/benschlegel/PlantSense-app) project.

---

## Setup
After cloning the project locally, run the following commands:

Installing dependencies
```bash
pnpm install
```
Start project
```bash
pnpm dev
```

---

## Project structure

This project runs as a `node.js` web server using the `fastify` framework (with `typescript`).

All source files are found in `src/`. Changing defaults (relating to states, prefixes, etc) can be done under `src/config/config.ts
`.

The entry point of the project is `src/index.ts`. Here, the `fastify` web server gets initialized. Most endpoints are moved to `src/endpoints`.

Types can be found under `src/types`, static functions under `src/helpers`.



## Building project
To build the project, run:
```bash
pnpm build
```

Test the build by running:
```
pnpm start
```
