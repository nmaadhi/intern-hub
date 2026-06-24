# InternHub

> A full-stack intern management platform built for organizations to streamline their internship programs with real-time collaboration, AI-powered tools, and Agile sprint management.

![InternHub](https://img.shields.io/badge/InternHub-v1.0-purple?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?style=for-the-badge&logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)

---

## Overview

InternHub is a comprehensive intern management system that brings together three roles — **Admin**, **Mentor**, and **Intern** — into a single unified platform. It supports real-time communication, Agile sprint planning with a Kanban board, AI-assisted code review, AI quiz generation, assignment management, and much more.

Built as a final-year project at **SSN College of Engineering**, Chennai.

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | [https://intern-hub-client.vercel.app](https://intern-hub-client.vercel.app) |
| Backend API | [https://intern-hub-server.onrender.com](https://intern-hub-server.onrender.com) |

---

## Features

### 🔐 Authentication & Access Control
- JWT-based authentication with role-based access (Admin / Mentor / Intern)
- Invitation-only account creation — accounts are created by Admin only
- Secure password setup flow with email-based reset links
- Account activation / deactivation by Admin
- Auto-redirect based on role after login

### 👨‍💼 Admin
- Create, deactivate, and delete mentor and intern accounts
- Create and manage cohorts with mentor assignment
- Alert system for cohorts without a mentor assigned
- Monitor all sprints across all cohorts with filters
- Real-time chat with any mentor or intern

### 👨‍🏫 Mentor
- View all assigned interns with cohort details
- Create and review assignments with **AI-generated feedback** (Groq LLM)
- Assign tasks with status tracking
- Schedule meetings with direct join links
- Share notes and file attachments (Cloudinary)
- Full **Agile Sprint Board** with Kanban, burndown chart, and velocity tracking
- **AI Standup Summarizer** — summarizes daily standup feed using AI
- Create live polls with real-time results
- Post pinned announcements with live delivery
- **AI Quiz Generator** — generate MCQ quizzes on any topic using AI

### 👨‍💻 Intern
- Submit daily standups (yesterday / today / blockers)
- Submit assignments with text, links, and file uploads
- Update task and sprint card statuses
- View and join scheduled meetings
- Access mentor-shared notes
- **AI Code Review** — write code in Monaco editor (VS Code style), run it via Piston API, and get instant AI feedback with score, strengths, and improvements
- Participate in live polls and view announcements
- Take AI-generated quizzes with instant scoring

### 💬 Real-Time Features (Socket.io)
- Live chat with WhatsApp-style delivery ticks (sent / delivered / read)
- Sound notifications for new messages
- Real-time Kanban board updates (drag and drop synced across users)
- Live announcements and poll results
- Sprint phase change broadcasts
- AI code review auto-moves approved cards to Done

### 🌙 Dark Mode
- System-wide dark/light mode toggle
- Preference saved in localStorage and persists across sessions

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework and build tool |
| Tailwind CSS v4 | Styling |
| Zustand | Global state management |
| React Router v6 | Client-side routing |
| Socket.io Client | Real-time communication |
| Axios | HTTP requests |
| @dnd-kit | Drag and drop Kanban board |
| Monaco Editor | In-browser code editor |
| Recharts | Burndown chart visualization |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| Prisma ORM | Database access layer |
| PostgreSQL (Neon) | Primary database |
| Socket.io | Real-time WebSocket server |
| JWT | Authentication tokens |
| Bcrypt | Password hashing |
| Nodemailer + Gmail SMTP | Transactional emails |
| Groq SDK (LLaMA 3.3 70B) | AI features |
| Piston API | Remote code execution |
| Cloudinary | File upload storage |

### Deployment
| Service | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | Neon PostgreSQL |
| File Storage | Cloudinary |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Vercel)                   │
│         React + Vite + Tailwind + Zustand            │
│              Socket.io Client + Axios                │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS + WSS
┌───────────────────────▼─────────────────────────────┐
│                   SERVER (Render)                    │
│              Express + Socket.io Server              │
│                  Prisma ORM + JWT                    │
└──────┬────────────────┬───────────────┬─────────────┘
       │                │               │
┌──────▼──────┐  ┌──────▼──────┐  ┌────▼────────────┐
│    Neon     │  │    Groq     │  │   Cloudinary    │
│ PostgreSQL  │  │  LLaMA 3.3  │  │  File Storage   │
└─────────────┘  └─────────────┘  └─────────────────┘
```

---

## Database Models

- **User** — Admin, Mentor, Intern with role-based fields
- **Cohort** — Group of interns under one mentor
- **Assignment** + **Submission** — Assignment lifecycle
- **Task** — Individual intern tasks
- **Meeting** + **Note** — Mentor resources
- **Sprint** + **SprintTask** + **SprintDailySnapshot** — Agile sprint system
- **CodeSubmission** — AI code review records
- **Standup** — Daily standup entries
- **Poll** + **PollOption** + **PollResponse** — Live polling
- **Announcement** — Team announcements
- **Quiz** + **QuizQuestion** + **QuizOption** + **QuizAttempt** — AI quiz system
- **Message** — Direct messaging with delivery tracking
- **PasswordResetToken** — Secure password reset flow

---

## AI Features

| Feature | Model | Description |
|---|---|---|
| Assignment Feedback | LLaMA 3.3 70B (Groq) | Reviews intern submissions and drafts warm mentor feedback |
| Standup Summarizer | LLaMA 3.3 70B (Groq) | Summarizes team standup feed into key highlights and blockers |
| Quiz Generator | LLaMA 3.3 70B (Groq) | Generates MCQ quizzes on any topic with correct answer keys |
| Code Review | LLaMA 3.3 70B (Groq) + Piston | Runs intern code, evaluates correctness, gives scored feedback |

---

## Project Structure

```
intern-hub/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Shared components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── layouts/         # Role-specific layouts (sidebar)
│   │   ├── lib/             # Axios + Socket config
│   │   ├── pages/
│   │   │   ├── admin/       # Admin pages
│   │   │   ├── mentor/      # Mentor pages
│   │   │   └── intern/      # Intern pages
│   │   └── store/           # Zustand stores
│   └── vite.config.js
│
└── server/                  # Express backend
    ├── middleware/           # Auth middleware
    ├── prisma/
    │   └── schema.prisma    # Database schema
    ├── routes/              # API route handlers
    │   ├── admin.js
    │   ├── auth.js
    │   ├── mentor.js
    │   ├── intern.js
    │   ├── sprint.js
    │   ├── chat.js
    │   ├── quiz.js
    │   └── ...
    ├── utils/               # Helper utilities
    └── index.js             # Server entry point
```

---

## Getting Started (Local Development)

### Prerequisites

- Node.js v18+
- PostgreSQL database (or Neon account)
- Groq API key
- Cloudinary account
- Gmail account for SMTP

### 1. Clone the repository

```bash
git clone https://github.com/nmaadhi/intern-hub.git
cd intern-hub
```

### 2. Setup the backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
DATABASE_URL=your_neon_postgresql_url
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_gmail_app_password
GROQ_API_KEY=your_groq_api_key
```

Run database migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the server:

```bash
node index.js
```

Server runs on `http://localhost:5000`.

### 3. Setup the frontend

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

### 4. Create your first Admin account

```bash
cd server
node utils/createAdmin.js
```

Or insert directly via Prisma Studio:

```bash
npx prisma studio
```

---

## Deployment

### Backend → Render

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install && npx prisma generate && npx prisma migrate deploy` |
| Start Command | `node index.js` |

Add all `.env` variables in Render environment settings.

### Frontend → Vercel

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Framework | Vite |
| Environment Variable | `VITE_API_URL=https://your-app.onrender.com/api` |

---

## Roles & Permissions Summary

| Feature | Admin | Mentor | Intern |
|---|:---:|:---:|:---:|
| Manage Mentors | ✅ | ❌ | ❌ |
| Manage Cohorts | ✅ | ❌ | ❌ |
| Manage Interns | ✅ | ❌ | ❌ |
| View All Sprints | ✅ | ❌ | ❌ |
| Create Sprint | ✅ | ✅ | ❌ |
| Manage Kanban Board | ✅ | ✅ | Own cards |
| Create Assignments | ❌ | ✅ | ❌ |
| Submit Assignments | ❌ | ❌ | ✅ |
| AI Feedback | ❌ | ✅ | ❌ |
| AI Standup Summary | ❌ | ✅ | ❌ |
| AI Quiz Generator | ❌ | ✅ | ❌ |
| AI Code Review | ❌ | ❌ | ✅ |
| Chat | ✅ | ✅ | ✅ |
| Dark Mode | ✅ | ✅ | ✅ |

---

## Author

**Aadhi** — CSE Student, SSN College of Engineering, Chennai  
Graduating May 2027

[![GitHub](https://img.shields.io/badge/GitHub-nmaadhi-black?style=flat&logo=github)](https://github.com/nmaadhi)

---

## License

This project is built for academic and demonstration purposes.

---

*Built with ❤️ using React, Node.js, PostgreSQL, and AI*
