# 🧬 Cancer Registry System

This is a Cancer Registry System built with a **Go (Golang)** backend and a basic **HTML/CSS** frontend. It allows users to register, manage, and view cancer patient data efficiently.

## 📁 Project Structure

```
cancer-registry-system/
├── backend/         # Golang API server
│   ├── main.go
│   ├── .env         # Environment variables (DB credentials)
│   └── ...
└── frontend/        # Basic HTML/CSS interface
    ├── index.html
    └── ...
```

---

## 🚀 Getting Started

### 🖥️ Frontend

The frontend is a static interface built with HTML and CSS. No build tools or servers required.

#### Steps to Run:

1. Navigate to the `frontend` folder.
2. Open `index.html` in your browser.

```bash
cd frontend
open index.html     # macOS
# OR
start index.html    # Windows
# OR
xdg-open index.html # Linux
```

---

### 🔧 Backend

The backend is built with Go and connects to a relational database (e.g., PostgreSQL, MySQL).

#### Prerequisites:

* [Go](https://golang.org/dl/) installed
* A running SQL database (PostgreSQL/MySQL)
* `.env` file configured

#### .env File Format:

Create a `.env` file inside the `backend` folder with the following keys:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

#### Steps to Run:

```bash
cd backend
go run main.go
```

The server will start and listen on the specified port (usually `localhost:6060` or as defined in the code).

---

## 🔌 API Endpoints

### 📡 API Route Overview (from `routes/routes.go`)

This file registers all route groups under the `/api/v1` path and connects them with corresponding service functions. The structure makes it easy to scale by grouping endpoints logically.

---

#### 🏥 Facility Routes (`/api/v1/facilities`)

| Method | Endpoint                | Description                       |
| ------ | ----------------------- | --------------------------------- |
| POST   | `/`                     | Create a new facility             |
| GET    | `/`                     | Retrieve all facilities           |
| GET    | `/name/:name`           | Find a facility by its name       |
| GET    | `/registry/:registryId` | Find facilities by registry ID    |
| PUT    | `/status/:id`           | Update status of a facility by ID |

#### 👨‍⚕️ Patient Routes (`/api/v1/patients`)

| Method | Endpoint                        | Description                     |
| ------ | ------------------------------- | ------------------------------- |
| POST   | `/`                             | Register a new patient          |
| GET    | `/`                             | Get all patients                |
| GET    | `/:id`                          | Get patient details by ID       |
| GET    | `/registration/:registrationId` | Find patient by registration ID |
| PUT    | `/:id`                          | Update patient record by ID     |
| DELETE | `/:id`                          | Delete a patient record by ID   |

---

## 🛠 Tech Stack

* **Backend**: Golang
* **Database**: PostgreSQL (Configurable)
* **Frontend**: HTML, CSS

---

## 📌 Notes

* Ensure your database is running and credentials are correct in the `.env` file.
* The frontend and backend are loosely coupled; you may use tools like Postman or browser-based calls to test the API manually.

---

## 🧪 Future Improvements

* Implement authentication and role-based access
* Deploy with Docker