# Use Node.js 20 as base
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- Build Stage ---
FROM base AS build
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_APP_ID
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
ENV VITE_APP_ID=$VITE_APP_ID

COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build

# --- Production Stage ---
FROM base
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist /usr/src/app/dist
COPY --from=build /usr/src/app/package.json /usr/src/app/package.json
COPY --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --from=build /usr/src/app/drizzle /usr/src/app/drizzle
COPY --from=build /usr/src/app/drizzle.config.ts /usr/src/app/drizzle.config.ts

WORKDIR /usr/src/app
EXPOSE 3000

ENV NODE_ENV=production
# Run db:deploy before starting the server to ensure DB is up to date
CMD ["sh", "-c", "pnpm db:deploy && pnpm start"]
