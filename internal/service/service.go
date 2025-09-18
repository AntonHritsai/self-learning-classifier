package service

import (
	"sync"
)

type Service interface {
	Init(c1, c2 Class)
	Classify(props []string) ClassifyResponse
	Feedback(variant string, props []string)
	Snapshot() Snapshot
}

type memoryService struct {
	mu           sync.RWMutex
	class1       Class
	class2       Class
	generalClass []string
	noneClass    []string
}

func NewMemoryService() Service {
	return &memoryService{}
}

func (s *memoryService) Init(c1, c2 Class) {
	s.mu.Lock()
	defer s.mu.Unlock()

	c1.Properties = unique(c1.Properties)
	c2.Properties = unique(c2.Properties)

	na, nb, inter := removeIntersection(c1.Properties, c2.Properties)
	s.class1 = Class{Name: c1.Name, Properties: na}
	s.class2 = Class{Name: c2.Name, Properties: nb}
	s.generalClass = unique(append(s.generalClass, inter...))

}

func (s *memoryService) Classify(props []string) ClassifyResponse {
	s.mu.RLock()
	defer s.mu.RUnlock()

	props = unique(props)

	known := union(union(s.class1.Properties, s.class2.Properties), s.generalClass)
	unknown := diff(props, known)

	guess, hits := choose(s.class1, s.class2, props)

	resp := ClassifyResponse{
		Guess:          guess,
		Reason:         explain(guess, hits),
		KnownHits:      sortStrings(hits),
		Unknown:        sortStrings(unknown),
		Recommendation: "",
	}

	if guess == "" {
		resp.Recommendation = "уточните: это \"" + s.class1.Name + "\" или \"" + s.class2.Name + "\"? иначе добавим в none"
	} else {
		resp.Recommendation = "подтвердите предположение или скорректируйте"
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

func (s *memoryService) Snapshot() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return Snapshot{
		Class1:       s.class1,
		Class2:       s.class2,
		GeneralClass: sortStrings(s.generalClass),
		NoneClass:    sortStrings(s.noneClass),
	}
}
