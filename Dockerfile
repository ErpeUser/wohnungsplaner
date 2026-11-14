# Package the production output already verified by Quality and Playwright.
# Run npm ci && npm run build before docker build for a local image.
FROM node:22.22.2-bookworm-slim

ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
WORKDIR /app

# The bundled Vinext runtime needs no node_modules. The Node adapter writes
# its temporary Cloudflare shim beside dist/server/index.js during startup.
COPY --chown=node:node package.json serve-local.mjs ./
COPY --chown=node:node dist/ ./dist/
COPY --chown=node:node public/ ./public/
RUN mkdir .local && chown node:node .local

USER node
EXPOSE 8080
CMD ["node", "serve-local.mjs"]
