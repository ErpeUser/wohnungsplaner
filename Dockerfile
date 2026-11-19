FROM node:24-bookworm AS builder

WORKDIR /app/wohnungsplaner
COPY . .
RUN node scripts/workspace-setup.mjs ensure
RUN npm run build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    NODE_OPTIONS=--import=/app/wohnungsplaner/scripts/resolve-dependencies.mjs

WORKDIR /app/wohnungsplaner
COPY --from=builder /app/wohnungsplaner/serve-local.mjs ./serve-local.mjs
COPY --from=builder /app/wohnungsplaner/public ./public
COPY --from=builder /app/wohnungsplaner/scripts/resolve-dependencies.mjs ./scripts/resolve-dependencies.mjs
COPY --from=builder /app/Wohnungsplaner_Generated /app/Wohnungsplaner_Generated

EXPOSE 8080
CMD ["node", "serve-local.mjs"]
