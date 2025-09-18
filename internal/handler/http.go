package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/AntonKhPI2/self-learning-classifier/internal/models"
	"github.com/AntonKhPI2/self-learning-classifier/internal/service"
)

type httpHandler struct {
	svc service.Service
}

func NewHTTPMux(svc service.Service) *http.ServeMux {
	h := &httpHandler{svc: svc}
	mux := http.NewServeMux()

	mux.Handle("/api/v1/init", h.wrap(h.init))
	mux.Handle("/api/v1/classify", h.wrap(h.classify))
	mux.Handle("/api/v1/feedback", h.wrap(h.feedback))
	mux.Handle("/api/v1/state", h.wrap(h.state))

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	return mux
}

func (h *httpHandler) init(w http.ResponseWriter, r *http.Request) error {
	if r.Method == http.MethodOptions {
		return h.cors(w, r)
	}
	if r.Method != http.MethodPost {
		return h.methodNotAllowed(w, r, http.MethodPost)
	}

	var req models.InitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return h.badRequest(w, "bad json: "+err.Error())
	}
	if req.Class1.Name == "" || req.Class2.Name == "" {
		return h.badRequest(w, "class names are required")
	}
	h.svc.Init(req.Class1, req.Class2)
	return h.writeJSON(w, http.StatusOK, models.InitResponse{Ok: true})
}

func (h *httpHandler) classify(w http.ResponseWriter, r *http.Request) error {
	if r.Method == http.MethodOptions {
		return h.cors(w, r)
	}
	if r.Method != http.MethodPost {
		return h.methodNotAllowed(w, r, http.MethodPost)
	}

	var req models.ClassifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return h.badRequest(w, "bad json: "+err.Error())
	}
	resp := h.svc.Classify(req.Properties)
	return h.writeJSON(w, http.StatusOK, resp)
}

func (h *httpHandler) feedback(w http.ResponseWriter, r *http.Request) error {
	if r.Method == http.MethodOptions {
		return h.cors(w, r)
	}
	if r.Method != http.MethodPost {
		return h.methodNotAllowed(w, r, http.MethodPost)
	}

	var req models.FeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return h.badRequest(w, "bad json: "+err.Error())
	}
	switch req.Variant {
	case "class1", "class2", "none":
		h.svc.Feedback(req.Variant, req.Properties)
		return h.writeJSON(w, http.StatusOK, models.FeedbackResponse{Ok: true})
	default:
		return h.badRequest(w, "variant must be one of: class1|class2|none")
	}
}

func (h *httpHandler) state(w http.ResponseWriter, r *http.Request) error {
	if r.Method == http.MethodOptions {
		return h.cors(w, r)
	}
	if r.Method != http.MethodGet {
		return h.methodNotAllowed(w, r, http.MethodGet)
	}
	return h.writeJSON(w, http.StatusOK, h.svc.Snapshot())
}

func (h *httpHandler) wrap(fn func(http.ResponseWriter, *http.Request) error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Vary", "Origin")

		defer func() {
			if rec := recover(); rec != nil {
				_ = h.writeJSON(w, http.StatusInternalServerError, map[string]any{
					"error": "internal server error",
				})
			}
		}()

		if err := fn(w, r); err != nil {

			_ = err
		}
	})
}

func (h *httpHandler) writeJSON(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	return enc.Encode(v)
}

func (h *httpHandler) badRequest(w http.ResponseWriter, msg string) error {
	return h.writeJSON(w, http.StatusBadRequest, map[string]any{"error": msg})
}

func (h *httpHandler) methodNotAllowed(w http.ResponseWriter, r *http.Request, allow ...string) error {
	w.Header().Set("Allow", joinAllow(allow))
	return h.writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
		"error": "method not allowed",
	})
}

func (h *httpHandler) cors(w http.ResponseWriter, _ *http.Request) error {

	w.WriteHeader(http.StatusNoContent)
	return nil
}

func joinAllow(methods []string) string {
	switch len(methods) {
	case 0:
		return ""
	case 1:
		return methods[0]
	default:

		out := methods[0]
		for i := 1; i < len(methods); i++ {
			out += ", " + methods[i]
		}
		return out
	}
}

var _ = errors.New
