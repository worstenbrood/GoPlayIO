FROM node:alpine
WORKDIR /home/node/app
COPY package.json .
RUN npm install --quiet
COPY . .
# Expose default ports
EXPOSE 7007
ENTRYPOINT []
CMD ["node", "/home/node/app/addon.js"]