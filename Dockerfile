FROM alpine:latest AS builder
LABEL maintainer="tomasz@chorwat.pl"
LABEL project="https://github.com/tchorwat/stockfish"

# Install dependencies
RUN apk add --no-cache git g++ make

RUN git clone --depth 1 --branch sf_14 https://github.com/official-stockfish/Stockfish.git

WORKDIR /Stockfish/src
RUN echo "arch:$( uname -m )" \
&& case $( uname -m ) in \
  x86_64) \
    make build ARCH=x86-64-modern \
  ;; \
  aarch64) \
    make build ARCH=armv8 \
  ;; \
  armv7l) \
    make build ARCH=armv7 \
  ;; \
  ppc64le) \
    make build ARCH=ppc-64 \
  ;; \
  *) \
    exit 1 \
  ;; \
esac

# FROM alpine:latest
# # Common build stage
FROM mhart/alpine-node:14 as common-build-stage

LABEL maintainer="tomasz@chorwat.pl"
LABEL project="https://github.com/tchorwat/stockfish"

RUN apk add git

COPY ./entrypoint.sh /

RUN chmod +x /entrypoint.sh \
 && apk add --no-cache libstdc++ ucspi-tcp6 \
 && addgroup -g 1000 stockfish \
 && adduser -u 1000 -G stockfish -HD stockfish

WORKDIR /stockfish/
#USER stockfish:stockfish

#COPY --chown=stockfish:stockfish --from=builder /Stockfish/src/stockfish /stockfish/
#COPY --chown=stockfish:stockfish --from=builder /Stockfish/Copying.txt /stockfish/
#COPY --chown=stockfish:stockfish source.txt /stockfish/
#COPY --chown=stockfish:stockfish --from=builder /Stockfish/src/*.nnue /stockfish/
COPY  --from=builder /Stockfish/src/stockfish /stockfish/
COPY  --from=builder /Stockfish/Copying.txt /stockfish/
COPY source.txt /stockfish/
COPY --from=builder /Stockfish/src/*.nnue /stockfish/

EXPOSE 23249
# ENTRYPOINT ["/entrypoint.sh"]

WORKDIR /

COPY . ./app

WORKDIR /app

RUN npm install

EXPOSE 6000

# Development build stage
# FROM common-build-stage as development-build-stage

ENV NODE_ENV development

CMD ["npm", "run", "dev"]

# # Production build stage
# FROM common-build-stage as production-build-stage

# ENV NODE_ENV production

# CMD ["npm", "run", "start"]
