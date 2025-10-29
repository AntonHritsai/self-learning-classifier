package handler

import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestCORS_Middleware_OPTIONS_and_Get(t *testing.T) {
    mux := http.NewServeMux()
    mux.HandleFunc("/ok", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte("ok"))
    })

    h := CORS("*")(mux)
    srv := httptest.NewServer(h)
    defer srv.Close()

    req, _ := http.NewRequest(http.MethodOptions, srv.URL+"/ok", nil)
    req.Header.Set("Origin", "https://example.test")
    req.Header.Set("Access-Control-Request-Method", "GET")
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        t.Fatalf("options request failed: %v", err)
    }
    if resp.StatusCode != http.StatusNoContent {
        t.Fatalf("options status=%d; want 204", resp.StatusCode)
    }
    if resp.Header.Get("Access-Control-Allow-Origin") != "*" {
        t.Fatalf("allow origin=%q; want '*'", resp.Header.Get("Access-Control-Allow-Origin"))
    }

    h2 := CORS("https://site.example")(mux)
    srv2 := httptest.NewServer(h2)
    defer srv2.Close()
    req2, _ := http.NewRequest(http.MethodGet, srv2.URL+"/ok", nil)
    req2.Header.Set("Origin", "https://site.example")
    resp2, err := http.DefaultClient.Do(req2)
    if err != nil {
        t.Fatalf("get request failed: %v", err)
    }
    if resp2.StatusCode != http.StatusOK {
        t.Fatalf("get status=%d; want 200", resp2.StatusCode)
    }
    if resp2.Header.Get("Access-Control-Allow-Origin") != "https://site.example" {
        t.Fatalf("allow origin=%q; want 'https://site.example'", resp2.Header.Get("Access-Control-Allow-Origin"))
    }
}
