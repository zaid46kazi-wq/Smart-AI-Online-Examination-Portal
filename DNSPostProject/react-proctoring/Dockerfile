# Building the React App
FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Nginx Server
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Include models in the final image
COPY --from=build /app/public/models /usr/share/nginx/html/models
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
