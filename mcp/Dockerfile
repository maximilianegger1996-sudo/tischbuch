# Hostable guest MCP + REST (Streamable HTTP on PORT).
# Build:  docker build -t tischbuch-guest-mcp ./mcp
# Run:    docker run --rm -p 8787:8787 tischbuch-guest-mcp
# Optional: -e TISCHBUCH_MCP_TOKEN=… -e TISCHBUCH_SUPA_URL=… -e TISCHBUCH_SUPA_ANON_KEY=…
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY openapi ./openapi
COPY README.md ./
ENV HOST=0.0.0.0
ENV PORT=8787
EXPOSE 8787
USER node
CMD ["node", "src/http.js"]
