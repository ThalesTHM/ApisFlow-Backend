FROM node:20.19-alpine AS build

WORKDIR /app
# O postinstall do npm ci roda `prisma generate`, então o schema precisa vir antes
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npm run build

# Estágio build também é a imagem de migração (tem o Prisma CLI)
COPY scripts ./scripts

FROM node:20.19-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --omit=optional --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["node", "dist/main"]
