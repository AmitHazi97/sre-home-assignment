FROM nginx:alpine

# Custom config: static files + /api reverse proxy to the API service.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80
