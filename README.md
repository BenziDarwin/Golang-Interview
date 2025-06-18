## 🧬 National Patient Registry System

A secure and scalable system to register, manage, and view patient data for cancer and sickle cell cases. Built with a **Golang (Fiber)** backend and a lightweight **HTML/CSS** frontend, this project is designed to enhance patient tracking, diagnostics, and referrals at national scale.

---

## 📁 Project Structure

```
cancer-registry-system/
├── main.go               # Go backend entry point
├── .env                  # Environment variables (DB config)
├── frontend/             # Static HTML/CSS frontend
│   ├── index.html
│   └── ...
├── routes/               # Fiber API route definitions
├── service/              # Core business logic
└── middleware/           # HTTP middleware (auth, logging, CORS, etc.)
```

---

## 🚀 Getting Started

---

#### Requirements:

* [Go](https://golang.org/dl/)
* PostgreSQL or MySQL database
* A `.env` file for DB configuration

#### `.env` File Example:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

#### Run Backend:

```bash
go run main.go
```

The server will listen on `localhost:6060` or another port defined in your `main.go`.

---

## 🔌 API Overview

All endpoints are versioned under `/api/v1` and grouped by entity:

---

### 🏥 Facility API (`/api/v1/facilities`)

| Method | Endpoint                       | Description                     |
| ------ | ------------------------------ | ------------------------------- |
| POST   | `/`                            | Create a new facility           |
| POST   | `/login`                       | Facility login                  |
| GET    | `/`                            | Get all facilities              |
| GET    | `/name/:name`                  | Search facility by name         |
| GET    | `/name/exists/:name`           | Check if a facility name exists |
| GET    | `/registry/:registryId`        | Get facilities by registry ID   |
| GET    | `/registry/exists/:registryId` | Check if registry ID exists     |
| PUT    | `/:id`                         | Update facility details         |
| PUT    | `/status/:id`                  | Update facility status          |

---

### 👨‍⚕️ Cancer Patient API (`/api/v1/cancer-patients`)

| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| POST   | `/`                             | Register a new cancer patient  |
| GET    | `/`                             | Get all cancer patients        |
| GET    | `/:id`                          | Get patient by ID              |
| GET    | `/registration/:registrationId` | Get patient by registration ID |
| GET    | `/facility/:id`                 | Get patients by facility       |
| DELETE | `/:id`                          | Delete patient by ID           |
| POST   | `/:id/diagnosis`                | Add a diagnosis for a patient  |
| GET    | `/:id/diagnosis`                | Get diagnoses for a patient    |
| POST   | `/:id/referral`                 | Create referral for a patient  |
| GET    | `/:id/referrals`                | Get referrals for a patient    |

---

### 🧬 Sickle Cell Patient API (`/api/v1/sickle-cell-patients`)

Same structure as cancer patients:

* Register
* Retrieve
* Diagnose
* Refer
* Delete

---

### 🔁 Referral API (`/api/v1/referrals`)

| Method | Endpoint       | Description                 |
| ------ | -------------- | --------------------------- |
| POST   | `/`            | Create a referral           |
| GET    | `/`            | Get all referrals           |
| GET    | `/patient/:id` | Get referrals for a patient |

---

### 🔐 Admin API (`/api/v1/admin`)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST   | `/login` | Admin login |

---

## 🛠 Tech Stack

| Layer      | Technology                    |
| ---------- | ----------------------------- |
| Backend    | Go (Fiber framework)          |
| Database   | PostgreSQL / MySQL (via GORM) |
| Frontend   | HTML, CSS                     |
| Middleware | Logging, Auth, CORS           |

---