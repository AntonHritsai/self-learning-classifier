package service

import (
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

func TestUserServiceFlow(t *testing.T) {
	repo := newMockRepo()
	us := NewUserService(repo, "u1")

	us.Init(
		models.Class{Name: "Cat", Properties: []string{"whiskers", "purr"}},
		models.Class{Name: "Dog", Properties: []string{"bark"}},
	)
	snap := us.Snapshot()
	if snap.Class1.Name != "Cat" || snap.Class2.Name != "Dog" {
		t.Fatalf("names not set: %+v", snap)
	}

	resp := us.Classify([]string{"purr"})
	if resp.Guess != "Cat" {
		t.Fatalf("guess=%q; want Cat", resp.Guess)
	}

	us.Feedback("class2", []string{"tail"})
	snap = us.Snapshot()
	if !contains(toSet(snap.Class2.Properties), "tail") {
		t.Fatalf("tail not saved in class2: %v", snap.Class2.Properties)
	}

	if err := us.Reset(); err != nil {
		t.Fatalf("reset error: %v", err)
	}
	snap = us.Snapshot()
	if !(snap.Class1.Name == "" &&
		len(snap.Class1.Properties) == 0 &&
		snap.Class2.Name == "" &&
		len(snap.Class2.Properties) == 0 &&
		len(snap.GeneralClass) == 0 &&
		len(snap.NoneClass) == 0) {
		t.Fatalf("snapshot after reset must be logically empty, got %+v", snap)
	}

}

func TestUserService_PropertyOps(t *testing.T) {
	repo := newMockRepo()
	us := NewUserService(repo, "u2")
	us.Init(models.Class{Name: "A", Properties: []string{"x"}}, models.Class{Name: "B", Properties: []string{"y"}})

	if err := us.AddProperty("class1", "z"); err != nil {
		t.Fatalf("add: %v", err)
	}
	if err := us.MoveProperty("class1", "class2", "z"); err != nil {
		t.Fatalf("move: %v", err)
	}
	if err := us.RemoveProperty("class2", "z"); err != nil {
		t.Fatalf("remove: %v", err)
	}
	if err := us.RenameClass("class1", "Alpha"); err != nil {
		t.Fatalf("rename class: %v", err)
	}
	if err := us.RenameProperty("class2", "y", "yy"); err != nil {
		t.Fatalf("rename property: %v", err)
	}

	snap := us.Snapshot()
	if snap.Class1.Name != "Alpha" {
		t.Fatalf("class1 name=%q; want Alpha", snap.Class1.Name)
	}
	if contains(toSet(snap.Class2.Properties), "y") || !contains(toSet(snap.Class2.Properties), "yy") {
		t.Fatalf("rename property failed: %v", snap.Class2.Properties)
	}
}
