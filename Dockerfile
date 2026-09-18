FROM node:22-bookworm-slim

WORKDIR /app

# 1. Dependências básicas de SO para Node, compilação nativa e certificados
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 2. Copia arquivos de pacotes
COPY package.json yarn.lock ./

# 3. Instala dependências do projeto
RUN yarn install --frozen-lockfile

# 4. Instala o binário do Chromium do Playwright e as bibliotecas do Linux necessárias
RUN npx playwright install --with-deps chromium

# 5. Copia o restante do código-fonte
COPY . .

# 6. Build de produção do Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN yarn build

# 7. Cria diretório para o banco SQLite
RUN mkdir -p /app/data

# 8. Variáveis de ambiente e porta
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["yarn", "start"]
