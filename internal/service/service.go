package service

import (
	"sync"

	"github.com/AntonKhPI2/self-learning-classifier/internal/models"
)

type Service interface {
	Init(c1, c2 models.Class)
	Classify(props []string) models.ClassifyResponse
	Feedback(variant string, props []string)
	Snapshot() models.Snapshot
}

type memoryService struct {
	mu           sync.RWMutex
	class1       models.Class
	class2       models.Class
	generalClass []string
	noneClass    []string
}

func NewMemoryService() Service { return &memoryService{} }

func (s *memoryService) Init(c1, c2 models.Class) {
	s.mu.Lock()
	defer s.mu.Unlock()

	c1.Properties = unique(c1.Properties)
	c2.Properties = unique(c2.Properties)

	na, nb, inter := removeIntersection(c1.Properties, c2.Properties)
	s.class1 = models.Class{Name: c1.Name, Properties: na}
	s.class2 = models.Class{Name: c2.Name, Properties: nb}
	s.generalClass = unique(append(s.generalClass, inter...))
}

func (s *memoryService) Classify(props []string) models.ClassifyResponse {
	s.mu.RLock()
	defer s.mu.RUnlock()

	props = unique(props)

	known := union(union(s.class1.Properties, s.class2.Properties), s.generalClass)
	unknown := diff(props, known)

	guess, hits := choose(s.class1, s.class2, props)

	resp := models.ClassifyResponse{
		Guess:          guess,
		Reason:         explain(guess, hits),
		KnownHits:      sortStrings(hits),
		Unknown:        sortStrings(unknown),
		Recommendation: "",
	}
	if guess == "" {
		resp.Recommendation = "Please specify whether it is \"" + s.class1.Name + "\" or \"" + s.class2.Name + "\". Otherwise, unknown properties will be added to 'none'."
	} else {
		resp.Recommendation = "Please confirm or adjust the suggestion."
	}

	return resp
}

func (s *memoryService) Feedback(variant string, props []string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	props = unique(props)

	na, nb, inter := removeIntersection(s.class1.Properties, s.class2.Properties)
	s.class1.Properties = na
	s.class2.Properties = nb
	s.generalClass = unique(append(s.generalClass, inter...))

	switch variant {
	case "class1":
		s.class1.Properties = unique(append(s.class1.Properties, props...))
	case "class2":
		s.class2.Properties = unique(append(s.class2.Properties, props...))
	case "none":
		known := union(union(s.class1.Properties, s.class2.Properties), s.generalClass)
		unknown := diff(props, known)
		if len(unknown) > 0 {
			s.noneClass = union(s.noneClass, unknown)
		}
	}

	na2, nb2, inter2 := removeIntersection(s.class1.Properties, s.class2.Properties)
	s.class1.Properties = na2
	s.class2.Properties = nb2
	s.generalClass = unique(append(s.generalClass, inter2...))
}

func (s *memoryService) Snapshot() models.Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return models.Snapshot{
		Class1:       s.class1,
		Class2:       s.class2,
		GeneralClass: sortStrings(s.generalClass),
		NoneClass:    sortStrings(s.noneClass),
	}
}
