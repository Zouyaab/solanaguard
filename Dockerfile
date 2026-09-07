# syntax=docker/dockerfile:1

FROM node:22-bookworm AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY cli ./cli
COPY examples ./examples
COPY vitest.config.ts prettier.config.js eslint.config.js ./

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @solanaguard/types... --filter @solanaguard/config... --filter @solanaguard/solana... --filter @solanaguard/analyzer... --filter @solanaguard/risk-engine... --filter @solanaguard/api... run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3001
ENV LOG_LEVEL=info
ENV SOLANA_RPC_URL=https://api.devnet.solana.com
ENV SOLANA_NETWORK=devnet

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3001)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "--filter", "@solanaguard/api", "start"]
