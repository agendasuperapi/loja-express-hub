# Etapa 1 - Build do projeto React/Vite
FROM node:18 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2 - Servidor Express
FROM node:18
WORKDIR /app

# Copiar build do React
COPY --from=builder /app/dist ./dist

# Copiar servidor Express
COPY server.js ./server.js

# Instalar dependências do Express
RUN npm install express node-fetch

EXPOSE 3000
CMD ["node", "server.js"]
