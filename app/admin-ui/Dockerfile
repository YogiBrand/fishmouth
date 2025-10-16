# Multi-stage build for Admin UI (Vite -> Nginx)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_ADMIN_API
ENV VITE_ADMIN_API=${VITE_ADMIN_API}
RUN npm run build

FROM nginx:1.27-alpine
COPY serve/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3031
CMD ["nginx","-g","daemon off;"]
