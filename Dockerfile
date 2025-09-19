FROM golang:1.22-alpine AS build
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server ./cmd/api
FROM alpine:3.20
RUN adduser -D -g '' app && apk add --no-cache ca-certificates tzdata
USER app
WORKDIR /app
COPY --from=build /app/server /app/server
COPY .env.example /app/.env.example
EXPOSE 8080
ENV GIN_MODE=release
CMD ["/app/server"]
