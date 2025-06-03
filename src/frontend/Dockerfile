FROM node:20-alpine as frontend_build
ARG BACKEND_URL
WORKDIR /app

COPY ./package.json ./package-lock.json ./tsconfig.json ./index.html ./vite.config.mts ./tailwind.config.mjs ./postcss.config.js /app/
RUN npm install
COPY ./src /app/src
RUN npm run build

FROM nginx
COPY --from=frontend_build /app/build/ /usr/share/nginx/html
COPY /nginx.conf /etc/nginx/conf.d/default.conf
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh
ENV BACKEND_URL=https://language-backend-yuiy4.ondigitalocean.app/
CMD ["/start-nginx.sh"]
