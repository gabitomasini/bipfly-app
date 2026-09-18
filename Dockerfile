# 1. Base image com Node 20 e dependências do Playwright
FROM mcr.microsoft.com/playwright:v1.46.0-jammy

WORKDIR /app

# 2. Copia arquivos de dependências
COPY package.json yarn.lock ./

# 3. Instala dependências
RUN yarn install --frozen-lockfile

# 4. Copia código-fonte
COPY . .

# 5. Build de produção do Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN yarn build

# 6. Cria diretório para o banco de dados SQLite persistente
RUN mkdir -p /app/data

# 7. Expõe a porta padrão
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 8. Inicia a aplicação em modo de produção
CMD ["yarn", "start"]
