FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod ./
RUN go mod download 2>/dev/null || true
COPY . .
RUN go build -o livepoll-backend .

FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/livepoll-backend .
EXPOSE 8080
CMD ["./livepoll-backend"]
