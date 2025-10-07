FROM golang:1.22-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app/slc ./cmd/api

FROM alpine:3.20
RUN adduser -D -g '' app && apk add --no-cache ca-certificates curl
USER app
WORKDIR /app

COPY --from=build /app/slc /usr/local/bin/slc
EXPOSE 8080
ENV GIN_MODE=release
CMD ["slc"]
