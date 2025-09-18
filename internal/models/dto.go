package models

type InitRequest struct {
	Class1 Class `json:"class1"`
	Class2 Class `json:"class2"`
}

type InitResponse struct {
	Ok bool `json:"ok"`
}

type ClassifyRequest struct {
	Properties []string `json:"properties"`
}

type ClassifyResponse struct {
	Guess          string   `json:"guess"`
	Reason         string   `json:"reason"`
	KnownHits      []string `json:"knownHits"`
	Unknown        []string `json:"unknown"`
	Recommendation string   `json:"recommendation"`
}

type FeedbackRequest struct {
	Variant    string   `json:"variant"`
	Properties []string `json:"properties"`
}

type FeedbackResponse struct {
	Ok bool `json:"ok"`
}
