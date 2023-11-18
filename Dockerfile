FROM guergeiro/pnpm:18-8

WORKDIR /app
COPY package.json tsconfig.json pnpm-lock.yaml ./
COPY ./prisma ./prisma
RUN pnpm install --frozen-lockfile
 
COPY . .
RUN pnpm run prisma:generate
RUN pnpm build

EXPOSE 3000
CMD pnpm run prisma:dbpush;node build