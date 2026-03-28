FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p /app/data
EXPOSE 8080
ENV PORT=8080
CMD ["npm", "run", "start"]
