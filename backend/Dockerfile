FROM node:18-alpine

# install build deps (esbuild may require build tools)
RUN apk add --no-cache python3 make g++ || true

WORKDIR /usr/src/app

# copy package manifests and install (will install dev deps needed for build)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# copy source then build into dist/
COPY . .
RUN npm run build

# runtime settings
ENV PORT=4000
EXPOSE 4000

# run the built output
CMD ["npm", "run", "start"]
