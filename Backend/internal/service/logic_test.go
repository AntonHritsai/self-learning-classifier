package service

import (
	"reflect"
	"testing"

	"github.com/AntonKhPI2/self-learning-classifier/internal/models"
)

func TestUnique(t *testing.T) {
	in := []string{"a", "b", "a", " ", "c", "", "b"}
	got := unique(in)
	want := []string{"a", "b", "c"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unique(%v)=%v; want %v", in, got, want)
	}
}

func TestUnion(t *testing.T) {
	a := []string{"a", "b"}
	b := []string{"b", "c"}
	got := union(a, b)
	want := []string{"a", "b", "c"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("union(%v,%v)=%v; want %v", a, b, got, want)
	}
	if !reflect.DeepEqual(a, []string{"a", "b"}) || !reflect.DeepEqual(b, []string{"b", "c"}) {
		t.Fatalf("inputs mutated")
	}
}

func TestDiff(t *testing.T) {
	a := []string{"a", "b", "c", "b"}
	b := []string{"b"}
	got := diff(a, b)
	want := []string{"a", "c"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("diff(%v,%v)=%v; want %v", a, b, got, want)
	}
}

func TestIntersection(t *testing.T) {
	a := []string{"a", "b", "c"}
	b := []string{"c", "b", "d", "b"}
	got := intersection(a, b)
	want := []string{"c", "b"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("intersection(%v,%v)=%v; want %v", a, b, got, want)
	}
}

func TestRemoveIntersection(t *testing.T) {
	a := []string{"a", "b", "c"}
	b := []string{"b", "c", "d"}
	na, nb, inter := removeIntersection(a, b)
	if !reflect.DeepEqual(na, []string{"a"}) {
		t.Fatalf("na=%v; want [a]", na)
	}
	if !reflect.DeepEqual(nb, []string{"d"}) {
		t.Fatalf("nb=%v; want [d]", nb)
	}
	if !reflect.DeepEqual(inter, []string{"b", "c"}) {
		t.Fatalf("inter=%v; want [b c]", inter)
	}
}

func TestScoreAndChoose(t *testing.T) {
	c1 := models.Class{Name: "Cat", Properties: []string{"whiskers", "purr"}}
	c2 := models.Class{Name: "Dog", Properties: []string{"bark", "tail"}}

	guess, hits := choose(c1, c2, []string{"whiskers", "tail"})
	if guess != "" {
		t.Fatalf("guess=%q; want empty", guess)
	}
	if !reflect.DeepEqual(sortStrings(hits), []string{"tail", "whiskers"}) {
		t.Fatalf("hits=%v", hits)
	}

	guess, hits = choose(c1, c2, []string{"purr"})
	if guess != "Cat" {
		t.Fatalf("guess=%q; want Cat", guess)
	}
	if !reflect.DeepEqual(hits, []string{"purr"}) {
		t.Fatalf("hits=%v; want [purr]", hits)
	}

	guess, hits = choose(c1, c2, []string{"bark", "bark"})
	if guess != "Dog" {
		t.Fatalf("guess=%q; want Dog", guess)
	}
	if !reflect.DeepEqual(hits, []string{"bark"}) {
		t.Fatalf("hits=%v; want [bark]", hits)
	}
}

func TestExplain(t *testing.T) {
	if got := explain("", nil); got == "" {
		t.Fatalf("explain empty should be non-empty")
	}
	if got := explain("", []string{"a"}); got == "" {
		t.Fatalf("explain tie should be non-empty")
	}
	if got := explain("Cat", []string{"purr"}); got == "" {
		t.Fatalf("explain win should be non-empty")
	}
}

func TestMemoryService_Init_Classify_Feedback_Snapshot(t *testing.T) {
	ms := NewMemoryService().(*memoryService)
	ms.Init(
		models.Class{Name: "Cat", Properties: []string{"whiskers", "purr", "whiskers"}},
		models.Class{Name: "Dog", Properties: []string{"bark", "tail", "whiskers"}},
	)
	snap := ms.Snapshot()
	if !reflect.DeepEqual(snap.GeneralClass, []string{"whiskers"}) {
		t.Fatalf("general=%v; want [whiskers]", snap.GeneralClass)
	}
	if contains(toSet(snap.Class1.Properties), "whiskers") || contains(toSet(snap.Class2.Properties), "whiskers") {
		t.Fatalf("whiskers must not remain in class properties")
	}

	resp := ms.Classify([]string{"purr"})
	if resp.Guess != "Cat" {
		t.Fatalf("guess=%q; want Cat", resp.Guess)
	}

	ms.Feedback("none", []string{"purr", "new_unknown"})
	snap = ms.Snapshot()
	if !reflect.DeepEqual(snap.NoneClass, []string{"new_unknown"}) {
		t.Fatalf("none=%v; want [new_unknown]", snap.NoneClass)
	}
	ms.Feedback("class2", []string{"tail", "fur"})
	snap = ms.Snapshot()
	if !contains(toSet(snap.Class2.Properties), "tail") || !contains(toSet(snap.Class2.Properties), "fur") {
		t.Fatalf("class2 props missing: %v", snap.Class2.Properties)
	}
	ms.Feedback("class1", []string{"purr"})
	snap2 := ms.Snapshot()
	if !contains(toSet(snap2.Class1.Properties), "purr") {
		t.Fatalf("class1 must include purr")
	}
}
