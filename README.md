# AutoOps

AutoOps is an autonomous agent platform with a web dashboard, orchestration backend, and agentic AI with integrated web tools. It allows planning, execution, and monitoring of tasks in real time.

## Architecture Overview

AutoOps uses a microservices architecture with RabbitMQ for asynchronous communication:

```
Frontend (React Dashboard)
        │
Backend API Gateway (ASP.NET)
        │
┌───────────────────────────────────────┐
│ Auth Service     (ASP.NET)            │
│ Agent Service    (FastAPI, LangGraph) │
│ Tool Service     (FastAPI)            │
│ Workflow Service (ASP.NET)            │
│ Event Service    (ASP.NET, SignalR)   │
│ Notification Service (FastAPI)        │
│ Scheduler Service (ASP.NET, Hangfire) │
└───────────────────────────────────────┘
        │
Database (PostgreSQL)
```

## Tech Stack

### Frontend
- **React** – Dashboard and user interface
- **TailwindCSS** – Styling and component library
- **WebSockets (SignalR)** – Live updates from backend events. The dashboard can remain open and will automatically update with task progress, notifications, and results in real time.

### Backend
- **ASP.NET (C#)** – API Gateway, Auth Service, Workflow Service, Scheduler Service, Event Service
- **FastAPI (Python)** – Agent Service (reasoning and planning), Tool Service (high-level tools), Notification Service
- **RabbitMQ / MassTransit** – Asynchronous communication between services
- **PostgreSQL** – Persistent storage
- **LangGraph** – Agent reasoning, planning, and orchestration
- **Hangfire** – Recurring and delayed task scheduling

## Key Features

- **Human-in-the-loop planning** – Agents can propose plans which users can verify or edit before execution.
- **High-level AI tools** – Tools like `research`, `generate_report`, and `compute_expression` can be chained into workflows.
- **Notifications** – Users can receive concise messages via channels such as Telegram.
- **Real-time dashboard** – The frontend updates automatically via SignalR/WebSockets. Leave the dashboard open and watch tasks, runs, and notifications update in real time.
- **Task scheduling** – Recurring or delayed tasks are handled reliably by the Scheduler Service.
- **Extensible microservices** – New tools or services can be added without disrupting existing workflows.

## Deployment

- Self-hosted on a local Linux environment (**Raspberry Pi 5**).
- Microservices run in separate containers for modularity.
- PostgreSQL, RabbitMQ, and all backend services are self-hosted in this local environment.

## Example Use Cases
- Monitoring prices and sending alerts when thresholds are crossed.
- Automated research and report generation from web sources.
- Scheduled data collection and summarisation for analytics or notifications.