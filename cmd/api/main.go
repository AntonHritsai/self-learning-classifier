package main

import (
	"encoding/json"
	"log"
	"net/http"
	"project/githubpoject/self-learning-classifier/internal/classifier"
)

func main() {
	svc := classifier.NewMemoryService()

	mux := http.NewServeMux()

	mux.HandleFunc("POST /init", func(w http.ResponseWriter, r *http.Request) {
		var req classifier.InitRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json: "+err.Error(), http.StatusBadRequest)
			return
		}
		if req.Class1.Name == "" || req.Class2.Name == "" {
			http.Error(w, "class names are required", http.StatusBadRequest)
			return
		}
		svc.Init(req.Class1, req.Class2)
		_ = json.NewEncoder(w).Encode(classifier.InitResponse{Ok: true})
	})

	mux.HandleFunc("POST /classify", func(w http.ResponseWriter, r *http.Request) {
		var req classifier.ClassifyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json: "+err.Error(), http.StatusBadRequest)
			return
		}
		resp := svc.Classify(req.Properties)
		_ = json.NewEncoder(w).Encode(resp)
	})

	mux.HandleFunc("POST /feedback", func(w http.ResponseWriter, r *http.Request) {
		var req classifier.FeedbackRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json: "+err.Error(), http.StatusBadRequest)
			return
		}
		switch req.Variant {
		case "class1", "class2", "none":
			svc.Feedback(req.Variant, req.Properties)
			_ = json.NewEncoder(w).Encode(classifier.FeedbackResponse{Ok: true})
		default:
			http.Error(w, "variant must be one of: class1|class2|none", http.StatusBadRequest)
			return
		}
	})

	mux.HandleFunc("GET /state", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(svc.Snapshot())
	})

	log.Println("HTTP server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
