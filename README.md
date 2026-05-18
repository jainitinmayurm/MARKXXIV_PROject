# 📅 Meeting Slot Booking System

A full-stack **Meeting Slot Booking System** built for seamless scheduling, real-time conflict detection, and intelligent room management. Supports online & offline meetings, recurring schedules, calendar views, and admin room control.

> **Team Member:** Jai Nitin Mayur M

---

## 🚀 Tech Stack

| Layer       | Technology                  |
| ----------- | --------------------------- |
| Frontend    | React 18 + Vite             |
| Backend     | Node.js + Express           |
| Database    | PostgreSQL                  |
| Auth        | JWT (bcrypt + access token) |
| Time Zones  | All stored UTC, rendered local |

---

## 📸 Screenshots & Demo

### Screenshots
*(Add your screenshots here)*
- [ ] Dashboard View
- [ ] Create Meeting / Slot Picker
- [ ] Calendar View
- [ ] Reports Analytics

### Demo Video Link
*(Paste your YouTube or Loom demo video link here)*
- **Link:** `[Insert Demo Link]`

---

## ⚙️ Setup Instructions

### Prerequisites

- **Node.js** v18+
- **PostgreSQL** 14+
- **npm** v9+

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/Blaze_Test.git
cd Blaze_Test
```

### 2. Backend Setup (`/server`)

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/meeting_booking
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
PORT=5000
```

Start the server (this will automatically run all SQL migrations and seed the database on the first run):

```bash
npm run dev
```

### 3. Frontend Setup (`/client`)

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Default Credentials (Seed Data)

The database is heavily seeded upon startup. Use these credentials to test the application:

| Role  | Email               | Password    |
| ----- | ------------------- | ----------- |
| Admin | admin@blaze.com     | Admin@123   |
| User  | alice@blaze.com     | User@123    |
| User  | bob@blaze.com       | User@123    |
| User  | charlie@blaze.com   | User@123    |
| User  | diana@blaze.com     | User@123    |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint             | Description          |
| ------ | -------------------- | -------------------- |
| POST   | `/api/auth/register` | Register a new user  |
| POST   | `/api/auth/login`    | Login & get JWT      |
| GET    | `/api/auth/me`       | Get current user     |

### Meetings
| Method | Endpoint              | Description            |
| ------ | --------------------- | ---------------------- |
| POST   | `/api/meetings`       | Create a meeting       |
| GET    | `/api/meetings`       | List meetings (filtered) |
| GET    | `/api/meetings/:id`   | Meeting details        |
| PUT    | `/api/meetings/:id`   | Edit / reschedule      |
| DELETE | `/api/meetings/:id`   | Cancel (soft-delete)   |

### Availability & Calendar
| Method | Endpoint                                    | Description       |
| ------ | ------------------------------------------- | ----------------- |
| GET    | `/api/availability?participants=&date=`     | Free slots        |
| GET    | `/api/calendar?from=&to=`                   | Calendar feed     |

### Rooms
| Method | Endpoint          | Description         |
| ------ | ----------------- | ------------------- |
| GET    | `/api/rooms`      | List rooms          |
| POST   | `/api/rooms`      | Create room (admin) |
| PUT    | `/api/rooms/:id`  | Edit room (admin)   |

### Reports
| Method | Endpoint                        | Description          |
| ------ | ------------------------------- | -------------------- |
| GET    | `/api/reports/summary`          | Meeting statistics   |
| GET    | `/api/reports/room-utilization` | Room usage stats     |
| GET    | `/api/reports/no-shows`         | No-show tracking     |

---

## 🏗️ Project Structure

```
Blaze_Test/
├── database_schema.sql   # Standalone DB schema dump
├── readme.txt            # Quick credentials reference
├── server/               # Express backend
│   ├── migrations/       # Raw SQL migration files & seed data
│   ├── postman/          # Postman collection
│   ├── src/              # Controllers, Services, Models
│   └── .env.example
├── client/               # React + Vite frontend
│   ├── src/              # Pages, Components, Hooks
│   └── index.css         # Global Design System
└── README.md
```

---

## 📄 License

This project was built for a hackathon submission. All rights reserved.
