package service

import (
	"log"

	"github.com/AntonKhPI2/self-learning-classifier/internal/models"
	"github.com/AntonKhPI2/self-learning-classifier/internal/repository"
)

type userService struct {
	repo   repository.Repository
	userID string
}

func NewUserService(repo repository.Repository, userID string) Service {
	return &userService{repo: repo, userID: userID}
}

func (u *userService) withState(fn func(*memoryService)) (models.Snapshot, error) {

	st, err := u.repo.GetState(u.userID)
	if err != nil {
		log.Printf("[user=%s] load state error: %v", u.userID, err)
		return models.Snapshot{}, err
	}

	mem := &memoryService{}
	if st.Class1.Name != "" || st.Class2.Name != "" {
		mem.class1 = st.Class1
		mem.class2 = st.Class2
		mem.generalClass = st.GeneralClass
		mem.noneClass = st.NoneClass
	}

	fn(mem)

	newState := repository.State{
		Class1:       mem.class1,
		Class2:       mem.class2,
		GeneralClass: mem.generalClass,
		NoneClass:    mem.noneClass,
	}
	if err := u.repo.UpsertState(u.userID, newState); err != nil {
		log.Printf("[user=%s] save state error: %v", u.userID, err)
		return models.Snapshot{}, err
	}
	return mem.Snapshot(), nil
}

func (u *userService) Init(c1, c2 models.Class) {
	_, _ = u.withState(func(ms *memoryService) { ms.Init(c1, c2) })
}

func (u *userService) Classify(props []string) models.ClassifyResponse {
	var out models.ClassifyResponse
	_, _ = u.withState(func(ms *memoryService) { out = ms.Classify(props) })
	return out
}

func (u *userService) Feedback(variant string, props []string) {
	_, _ = u.withState(func(ms *memoryService) { ms.Feedback(variant, props) })
}

func (u *userService) Snapshot() models.Snapshot {
	snap, _ := u.withState(func(ms *memoryService) { /* no-op */ })
	return snap
}

var _ Service = (*userService)(nil)
