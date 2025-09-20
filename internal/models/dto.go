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

type RemovePropertyRequest struct {
	Area     string `json:"area"`
	Property string `json:"property"`
}

type MovePropertyRequest struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Property string `json:"property"`
}

type RenameClassRequest struct {
	Class string `json:"class"`
	Name  string `json:"name"`
}

type RenamePropertyRequest struct {
	Area string `json:"area"`
	From string `json:"from"`
	To   string `json:"to"`
}

type AddPropertyRequest struct {
	Area     string `json:"area"`
	Property string `json:"property"`
}

type OkResponse struct {
	Ok bool `json:"ok"`
}
