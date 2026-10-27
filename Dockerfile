FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# Vite is imported at module load time; keep builder dependencies for now.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/db/migrations ./db/migrations
# Keep only the runtime data directory writable; run the service without root.
RUN mkdir -p /app/data && chown -R node:node /app/data
EXPOSE 8080
USER node
CMD ["node", "dist/server.cjs"]
