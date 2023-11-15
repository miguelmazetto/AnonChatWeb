FROM guergeiro/pnpm:18-8
 
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
 
COPY . .
RUN pnpm run prisma:generate
RUN pnpm build
 
RUN rm -f /app/.env && echo "PRISMA_URL=$PRISMA_URL" > /app/.env

EXPOSE 3000
CMD ["node", "build"]