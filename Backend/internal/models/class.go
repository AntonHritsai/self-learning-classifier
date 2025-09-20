package models

type Class struct {
	Name       string   `json:"name"`
	Properties []string `json:"properties"`
}

type Snapshot struct {
	Class1       Class    `json:"class1"`
	Class2       Class    `json:"class2"`
	GeneralClass []string `json:"generalClass"`
	NoneClass    []string `json:"noneClass"`
}
