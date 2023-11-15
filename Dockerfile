FROM guergeiro/pnpm:18-8
 
WORKDIR /app
COPY package.json ./
RUN pnpm install
 
COPY . .
RUN pnpm run prisma:generate
RUN pnpm build
 
RUN rm -f /app/.env && echo "PRISMA_URL=$PRISMA_URL" > /app/.env

EXPOSE 3000
CMD ["node", "build"]