FROM node:18-alpine

# install build deps if needed (alpine)
RUN apk add --no-cache python3 make g++ || true

WORKDIR /usr/src/app

# copy package manifests first to install deps
COPY package*.json ./
# use npm ci to get a reproducible install
RUN npm ci --no-audit --no-fund

# copy source
COPY . .

# default port (compose uses 4000)
ENV PORT=4000
EXPOSE 4000

# default start (docker-compose may override)
CMD ["npm", "run", "start"]
