# Use Node.js 20 as base
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- Build Stage ---
FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build

# --- Production Stage ---
FROM base
COPY --from=build /usr/src/app/dist /usr/src/app/dist
COPY --from=build /usr/src/app/package.json /usr/src/app/package.json
COPY --from=build /usr/src/app/node_modules /usr/src/app/node_modules

WORKDIR /usr/src/app
EXPOSE 3000

ENV NODE_ENV=production
CMD [ "pnpm", "start" ]
