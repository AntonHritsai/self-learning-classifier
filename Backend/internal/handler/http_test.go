package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"testing"

	"github.com/AntonKhPI2/self-learning-classifier/internal/models"
	"github.com/AntonKhPI2/self-learning-classifier/internal/repository"
)

type mockRepo struct {
	state map[string]repository.State
}

func newMockRepo() *mockRepo { return &mockRepo{state: make(map[string]repository.State)} }

func (m *mockRepo) GetState(userID string) (repository.State, error) {
	return m.state[userID], nil
}
func (m *mockRepo) UpsertState(userID string, st repository.State) error {
	m.state[userID] = st
	return nil
}
func (m *mockRepo) ResetUser(userID string) error {
	delete(m.state, userID)
	return nil
}

func decode[T any](t *testing.T, resp *http.Response, out *T) {
	t.Helper()
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		t.Fatalf("decode: %v", err)
	}
}

func TestHTTP_Flow(t *testing.T) {
	mux := NewHTTPMux(newMockRepo())
	srv := httptest.NewServer(mux)
	defer srv.Close()

	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar}

	initReq := models.InitRequest{
		Class1: models.Class{Name: "Cat", Properties: []string{"whiskers", "purr"}},
		Class2: models.Class{Name: "Dog", Properties: []string{"bark"}},
	}
	b, _ := json.Marshal(initReq)
	resp, err := client.Post(srv.URL+"/api/v1/init", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("init status=%d", resp.StatusCode)
	}
	resp.Body.Close()
	clReq := models.ClassifyRequest{Properties: []string{"purr", "tail"}}
	b, _ = json.Marshal(clReq)
	resp, err = client.Post(srv.URL+"/api/v1/classify", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("classify status=%d", resp.StatusCode)
	}
	var cl models.ClassifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&cl); err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	fbReq := models.FeedbackRequest{Variant: "class2", Properties: []string{"tail"}}
	b, _ = json.Marshal(fbReq)
	resp, err = client.Post(srv.URL+"/api/v1/feedback", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("feedback status=%d", resp.StatusCode)
	}
	resp.Body.Close()

	resp, err = client.Get(srv.URL + "/api/v1/state")
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("state status=%d", resp.StatusCode)
	}
	var snap models.Snapshot
	if err := json.NewDecoder(resp.Body).Decode(&snap); err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	found := false
	for _, p := range snap.Class2.Properties {
		if p == "tail" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf(`expected "tail" in class2 properties: %v`, snap.Class2.Properties)
	}

	resp, err = client.Get(srv.URL + "/status")
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("status status=%d", resp.StatusCode)
	}
	resp.Body.Close()
}
