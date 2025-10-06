# Self-Learning Classifier

[![Go Version](https://img.shields.io/badge/go-1.22-blue.svg)](https://go.dev)
[![Built with](https://img.shields.io/badge/Built%20with-React%20%26%20Go-cyan.svg)](#tech-stack)

This is a full-stack web application that allows users to classify objects into two categories based on their textual features. The system learns and improves in real-time from user feedback.

The project consists of a **Go** backend providing a REST API and a **React (TypeScript)** frontend. The entire stack, including a MySQL database, is containerized with Docker for easy setup and deployment.

![App Screenshot](docs/readme.png)

## 💡 Key Features

-   🧠 **Real-time Learning:** The system updates its knowledge base after every user-confirmed classification.
-   ↔️ **Feature Separation:** Automatically identifies common properties shared between both classes, unique properties for each, and irrelevant ("none") properties.
-   ⚙️ **Flexible Management:** The UI allows for adding, removing, moving, and renaming properties and classes on the fly.
-   🚀 **Modern Stack:** Built with Go for the backend, React/Vite/TS for the frontend, and MySQL for persistence.
-   🐳 **Fully Containerized:** The entire project runs with a single `docker-compose up` command.

## 🛠️ Tech Stack

-   **Backend:** Go, `net/http`, `go-sql-driver/mysql`
-   **Frontend:** React, TypeScript, Vite, Nginx (for serving static files)
-   **Database:** MySQL 8.0
-   **DevOps:** Docker, Docker Compose

## 🚀 Quick Start with Docker

This is the recommended way to run the project for demonstration or development. Ensure you have **Docker** and **Docker Compose** installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AntonKhPI2/self-learning-classifier.git
    cd self-learning-classifier
    ```

2.  **Set up environment variables:**
    Create a `.env` file by copying the example. The default values are already configured for local Docker development.
    ```bash
    cp .env.example .env
    ```

3.  **Launch the project:**
    This command will build the images, start all containers, and set up the network.
    ```bash
    docker-compose up --build
    ```

4.  **Access the application:**
    -   **Frontend:** [http://localhost:3000](http://localhost:3000)
    -   **Backend API:** [http://localhost:8080](http://localhost:8080)

## 🛠️ Local Development (Without Docker)

If you prefer to run the services natively, you will need:
- Go 1.22+
- Node.js 20+
- A running MySQL 8.0 instance

### Backend

1.  Navigate to the `Backend` directory:
    ```bash
    cd Backend
    ```
2.  Install dependencies:
    ```bash
    go mod tidy
    ```
3.  Set the required environment variables to connect to your MySQL instance. For example:
    ```bash
    export DB_HOST=127.0.0.1
    export DB_PORT=3306
    export DB_USER=your_user
    export DB_PASSWORD=your_password
    export DB_NAME=slc
    ```
4.  Run the server:
    ```bash
    go run ./cmd/api
    ```
    The backend will be available at `http://localhost:8080`.

### Frontend

1.  Navigate to the `Frontend` directory:
    ```bash
    cd Frontend/slc-frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env.local` file and specify the backend API URL:
    ```
    VITE_API_URL=http://localhost:8080
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173` (or another port specified by Vite).


## 🧪 Testing

The Go backend includes a suite of unit tests for handlers, services, and core logic. The tests use in-memory mocks for the repository to ensure isolation and speed.

To run the tests, navigate to the `Backend` directory and execute:
```bash
cd Backend
go test -v ./...
```

## 📁 Project Structure
```
.
├── Backend/                # Go Backend
│   ├── cmd/api/            # Application entry point
│   ├── internal/           # All business logic
│   └── ...
├── Frontend/
│   └── slc-frontend/       # React Application
│       ├── src/            # Frontend source code
│       └── ...
├── docs/                   # Documentation and assets
├── .env.example            # Example environment file
└── docker-compose.yml      # Orchestration file for all services
```
## ⚙️ Configuration

The application is configured using environment variables. See .env.example for a complete list. Key variables include:

| Variable | Default | Description |
| ------------------- | ----------------------- | ---------------------------------------------- |
| `\DB_HOST` | `db` | Hostname of the MySQL database service. |`
| `\DB_USER` | `slc` | MySQL user. |`
| `\MYSQL_PASSWORD` | `slcpass` | Password for the MySQL user. |`
| `\DB_NAME` | `self-learning-classifier`| Name of the database. |`
| `\BACKEND_PORT` | `8080` | Port on which the Go backend listens. |`
| `\FRONTEND_PORT` | `3000` | Port on which the Nginx frontend is exposed. |`
| `\VITE_API_URL` | `http://localhost:8080\` | URL of the backend API for the frontend to use.|`

## 📚 API Endpoints

Base URL: /api/v1

| Method | Path | Description |
|:-------| :------------------- | :--------------------------------------------- |
| `\POST`  | `/init` | Initializes the classes and their seed properties. |`
| `\POST`  | `/reset` | Resets the state for the current user. |`
| `\POST`  | `/classify` | Classifies a given set of properties. |`
| `\POST`  | `/feedback` | Provides feedback to train the model. |`
| `\GET`  | `/state` | Retrieves the current state of the classifier. |`
| `\POST` | `/prop/add` | Adds a new property to a specific area. |`
| `\POST` | `/prop/remove` | Removes a property from a specific area. |`
| `\POST` | `/prop/move` | Moves a property between areas. |`
| `\POST` | `/prop/rename` | Renames a property within an area or globally. |`
| `\POST` | `/classes/rename` | Renames a class. |`
| `\GET`  | `/status` | Health check endpoint. |`
