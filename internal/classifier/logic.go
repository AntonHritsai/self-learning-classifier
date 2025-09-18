package classifier

import (
	"slices"
	"strings"
)

func norm(s string) string { return strings.TrimSpace(s) }

func unique(ss []string) []string {
	seen := make(map[string]struct{}, len(ss))
	out := make([]string, 0, len(ss))
	for _, v := range ss {
		v = norm(v)
		if v == "" {
			continue
		}
		if _, ok := seen[v]; !ok {
			seen[v] = struct{}{}
			out = append(out, v)
		}
	}
	return out
}

func contains(set map[string]struct{}, v string) bool { _, ok := set[v]; return ok }

func toSet(ss []string) map[string]struct{} {
	m := make(map[string]struct{}, len(ss))
	for _, v := range ss {
		m[v] = struct{}{}
	}
	return m
}

func union(a, b []string) []string {
	return unique(append(append([]string{}, a...), b...))
}

func diff(a, b []string) []string {
	bs := toSet(b)
	out := make([]string, 0, len(a))
	for _, v := range a {
		if !contains(bs, v) {
			out = append(out, v)
		}
	}
	return unique(out)
}

func intersection(a, b []string) []string {
	as := toSet(a)
	out := make([]string, 0)
	for _, v := range b {
		if contains(as, v) {
			out = append(out, v)
		}
	}
	return unique(out)
}

func removeIntersection(a, b []string) (na, nb, inter []string) {
	inter = intersection(a, b)
	if len(inter) == 0 {
		return unique(a), unique(b), inter
	}
	na = diff(a, inter)
	nb = diff(b, inter)
	return unique(na), unique(nb), inter
}

func score(c Class, props []string) (hits []string, count int) {
	as := toSet(c.Properties)
	for _, p := range unique(props) {
		if contains(as, p) {
			hits = append(hits, p)
		}
	}
	return hits, len(hits)
}

func choose(c1, c2 Class, props []string) (guess string, hits []string) {
	h1, s1 := score(c1, props)
	h2, s2 := score(c2, props)

	switch {
	case s1 == 0 && s2 == 0:
		return "", nil
	case s1 > s2:
		return c1.Name, unique(h1)
	case s2 > s1:
		return c2.Name, unique(h2)
	default:

		return "", unique(union(h1, h2))
	}
}

func explain(guess string, hits []string) string {
	if guess == "" && len(hits) == 0 {
		return "нет совпадений — требуется подтверждение пользователя"
	}
	if guess == "" {
		return "совпадений поровну — требуется подтверждение пользователя"
	}
	return "совпало больше признаков с " + guess
}

func sortStrings(ss []string) []string {
	out := append([]string{}, ss...)
	slices.Sort(out)
	return out
}
