package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"time"

	"github.com/joho/godotenv"

	"github.com/AntonKhPI2/self-learning-classifier/internal/handler"
	"github.com/AntonKhPI2/self-learning-classifier/internal/repository"
)

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func buildDSNFromParts() string {
	user := envOr("DB_USER", "root")
	pass := os.Getenv("DB_PASSWORD")
	host := envOr("DB_HOST", "127.0.0.1")
	port := envOr("DB_PORT", "3306")
	name := envOr("DB_NAME", "slc")

	if sock := os.Getenv("DB_SOCKET"); sock != "" {
		return fmt.Sprintf("%s:%s@unix(%s)/%s?parseTime=true&charset=utf8mb4&loc=Local",
			user, url.QueryEscape(pass), sock, name)
	}
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&loc=Local",
		user, url.QueryEscape(pass), host, port, name)
}

func main() {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port

	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = buildDSNFromParts()
	}
	repo, err := repository.New(dsn)
	if err != nil {
		log.Fatalf("mysql connect error: %v", err)
	}

	mux := handler.NewHTTPMux(repo)

	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadTimeout:       10 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("→ HTTP server listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	<-stop

	log.Println("↘ shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
		if cerr := srv.Close(); cerr != nil {
			log.Printf("force close error: %v", cerr)
		}
	}

	log.Println("✓ server stopped")
}
