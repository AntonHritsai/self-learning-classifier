package service

import (
	"errors"
	"strings"
	"sync"

	"github.com/AntonKhPI2/self-learning-classifier/internal/models"
)

type Service interface {
	Init(c1, c2 models.Class)
	Classify(props []string) models.ClassifyResponse
	Feedback(variant string, props []string)
	Snapshot() models.Snapshot
	Reset() error
	RemoveProperty(area, prop string) error
	MoveProperty(from, to, prop string) error
	RenameClass(class, name string) error
	RenameProperty(area, from, to string) error
	AddProperty(area, prop string) error
}

type memoryService struct {
	mu           sync.RWMutex
	class1       models.Class
	class2       models.Class
	generalClass []string
	noneClass    []string
}

func NewMemoryService() Service { return &memoryService{} }

func (u *userService) RenameProperty(area, from, to string) error {
	from = strings.TrimSpace(from)
	to = strings.TrimSpace(to)
	if from == "" || to == "" || from == to {
		return nil
	}
	_, err := u.withState(func(ms *memoryService) {
		rename := func(xs []string) []string {
			// если целевое имя уже было — просто удаляем старое
			foundTo := false
			for _, v := range xs {
				if v == to {
					foundTo = true
					break
				}
			}
			out := xs[:0]
			for _, v := range xs {
				if v == from {
					if !foundTo {
						out = append(out, to)
					}
				} else {
					out = append(out, v)
				}
			}
			return out
		}

		switch strings.ToLower(area) {
		case "class1":
			ms.class1.Properties = rename(ms.class1.Properties)
		case "class2":
			ms.class2.Properties = rename(ms.class2.Properties)
		case "general":
			ms.generalClass = rename(ms.generalClass)
		case "none":
			ms.noneClass = rename(ms.noneClass)
		case "all":
			ms.class1.Properties = rename(ms.class1.Properties)
			ms.class2.Properties = rename(ms.class2.Properties)
			ms.generalClass = rename(ms.generalClass)
			ms.noneClass = rename(ms.noneClass)
		}
	})
	return err
}

func (s *memoryService) RenameProperty(area, from, to string) error { return nil }

func (u *userService) RemoveProperty(area, prop string) error {
	_, err := u.withState(func(ms *memoryService) {
		switch strings.ToLower(area) {
		case "class1":
			ms.class1.Properties = remove(ms.class1.Properties, prop)
		case "class2":
			ms.class2.Properties = remove(ms.class2.Properties, prop)
		case "general":
			ms.generalClass = remove(ms.generalClass, prop)
		case "none":
			ms.noneClass = remove(ms.noneClass, prop)
		}
	})
	return err
}
func (s *memoryService) RemoveProperty(area, prop string) error   { return nil }
func (s *memoryService) MoveProperty(from, to, prop string) error { return nil }
func (s *memoryService) RenameClass(class, name string) error     { return nil }

func (u *userService) MoveProperty(from, to, prop string) error {
	if strings.EqualFold(from, to) {
		return nil
	}
	_, err := u.withState(func(ms *memoryService) {
		// remove
		switch strings.ToLower(from) {
		case "class1":
			ms.class1.Properties = remove(ms.class1.Properties, prop)
		case "class2":
			ms.class2.Properties = remove(ms.class2.Properties, prop)
		case "general":
			ms.generalClass = remove(ms.generalClass, prop)
		case "none":
			ms.noneClass = remove(ms.noneClass, prop)
		}
		// add
		switch strings.ToLower(to) {
		case "class1":
			ms.class1.Properties = uniqueAppend(ms.class1.Properties, prop)
		case "class2":
			ms.class2.Properties = uniqueAppend(ms.class2.Properties, prop)
		case "general":
			ms.generalClass = uniqueAppend(ms.generalClass, prop)
		case "none":
			ms.noneClass = uniqueAppend(ms.noneClass, prop)
		}
	})
	return err
}

func (u *userService) RenameClass(class, name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("empty name")
	}
	_, err := u.withState(func(ms *memoryService) {
		switch strings.ToLower(class) {
		case "class1":
			ms.class1.Name = name
		case "class2":
			ms.class2.Name = name
		}
	})
	return err
}

func (s *userService) Reset() error {
	return s.repo.ResetUser(s.userID)
}

func (s *memoryService) Reset() error {
	return nil
}

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

func pickArea(st *models.Snapshot, area string) (*[]string, error) {
	switch strings.ToLower(area) {
	case "class1":
		return &st.Class1.Properties, nil
	case "class2":
		return &st.Class2.Properties, nil
	case "general":
		return &st.GeneralClass, nil
	case "none":
		return &st.NoneClass, nil
	default:
		return nil, errors.New("bad area (use class1|class2|general|none)")
	}
}

func uniqueAppend(xs []string, v string) []string {
	for _, x := range xs {
		if x == v {
			return xs
		}
	}
	return append(xs, v)
}

func remove(xs []string, v string) []string {
	out := xs[:0]
	for _, x := range xs {
		if x != v {
			out = append(out, x)
		}
	}
	return out
}

// Добавление свойства (userService через withState)
func (u *userService) AddProperty(area, prop string) error {
	prop = strings.TrimSpace(prop)
	if prop == "" {
		return nil
	}
	_, err := u.withState(func(ms *memoryService) {
		switch strings.ToLower(area) {
		case "class1":
			ms.class1.Properties = uniqueAppend(ms.class1.Properties, prop)
		case "class2":
			ms.class2.Properties = uniqueAppend(ms.class2.Properties, prop)
		case "general":
			ms.generalClass = uniqueAppend(ms.generalClass, prop)
		case "none":
			ms.noneClass = uniqueAppend(ms.noneClass, prop)
		}
	})
	return err
}

func (s *memoryService) AddProperty(area, prop string) error { return nil }
