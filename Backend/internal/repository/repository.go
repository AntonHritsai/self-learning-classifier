package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	_ "github.com/go-sql-driver/mysql"

	"github.com/AntonKhPI2/self-learning-classifier/internal/models"
)

type State struct {
	Class1       models.Class
	Class2       models.Class
	GeneralClass []string
	NoneClass    []string
}

type Repository interface {
	GetState(userID string) (State, error)
	UpsertState(userID string, st State) error
	ResetUser(userID string) error
}

type MySQLRepo struct {
	DB *sql.DB
}

func New(dsn string) (*MySQLRepo, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	if err := ensureSchema(db); err != nil {
		return nil, err
	}
	return &MySQLRepo{DB: db}, nil
}

func ensureSchema(db *sql.DB) error {
	const ddl = `
CREATE TABLE IF NOT EXISTS user_state (
  user_id       VARCHAR(128)  NOT NULL PRIMARY KEY,
  class1_name   VARCHAR(255)  NOT NULL DEFAULT '',
  class2_name   VARCHAR(255)  NOT NULL DEFAULT '',
  class1_props  JSON          NOT NULL,
  class2_props  JSON          NOT NULL,
  general_props JSON          NOT NULL,
  none_props    JSON          NOT NULL,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
	_, err := db.Exec(ddl)
	return err
}

func (r *MySQLRepo) GetState(userID string) (State, error) {
	const q = `
SELECT class1_name, class2_name, class1_props, class2_props, general_props, none_props
FROM user_state
WHERE user_id = ?`
	var (
		c1Name, c2Name    string
		c1pJSON, c2pJSON  []byte
		genJSON, noneJSON []byte
	)
	err := r.DB.QueryRowContext(context.Background(), q, userID).
		Scan(&c1Name, &c2Name, &c1pJSON, &c2pJSON, &genJSON, &noneJSON)
	if errors.Is(err, sql.ErrNoRows) {
		return State{}, nil
	}
	if err != nil {
		return State{}, err
	}

	var c1p, c2p, gen, none []string
	_ = json.Unmarshal(c1pJSON, &c1p)
	_ = json.Unmarshal(c2pJSON, &c2p)
	_ = json.Unmarshal(genJSON, &gen)
	_ = json.Unmarshal(noneJSON, &none)

	return State{
		Class1:       models.Class{Name: c1Name, Properties: c1p},
		Class2:       models.Class{Name: c2Name, Properties: c2p},
		GeneralClass: gen,
		NoneClass:    none,
	}, nil
}

func (r *MySQLRepo) UpsertState(userID string, st State) error {
	c1pJSON, _ := json.Marshal(st.Class1.Properties)
	c2pJSON, _ := json.Marshal(st.Class2.Properties)
	genJSON, _ := json.Marshal(st.GeneralClass)
	noneJSON, _ := json.Marshal(st.NoneClass)

	const q = `
INSERT INTO user_state (user_id, class1_name, class2_name, class1_props, class2_props, general_props, none_props)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  class1_name = VALUES(class1_name),
  class2_name = VALUES(class2_name),
  class1_props = VALUES(class1_props),
  class2_props = VALUES(class2_props),
  general_props = VALUES(general_props),
  none_props = VALUES(none_props),
  updated_at = CURRENT_TIMESTAMP
`
	_, err := r.DB.ExecContext(context.Background(), q,
		userID,
		st.Class1.Name, st.Class2.Name,
		c1pJSON, c2pJSON, genJSON, noneJSON,
	)
	return err
}

func (r *MySQLRepo) ResetUser(userID string) error {
	_, err := r.DB.Exec(`DELETE FROM user_state WHERE user_id = ?`, userID)
	return err
}

var _ Repository = (*MySQLRepo)(nil)
