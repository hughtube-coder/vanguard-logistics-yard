# Vanguard Logistics Yard (VLY) | Full-Stack Industrial Terminal Console

An industrial-grade Warehouse Inventory & Order Management System engineered for Human-Computer Interaction (HCI) standards. The interface is built for rugged terminals, high-throughput freight hubs, and low-cognitive-load floor operations, strictly demonstrating **Shneiderman's Eight Golden Rules of Interface Design** alongside a full-stack **Render PostgreSQL** cloud database and **Hugging Face Inference AI Copilot**.

---

## Live Deployment & Repository Access

* **Production Web Service (Render):** `https://vanguard-logistics-yard.onrender.com`
* **Static Fallback (GitHub Pages):** [https://hughtube-coder.github.io/vanguard-logistics-yard/](https://hughtube-coder.github.io/vanguard-logistics-yard/)
* **Source Code Repository:** [https://github.com/hughtube-coder/vanguard-logistics-yard](https://github.com/hughtube-coder/vanguard-logistics-yard)
* **Default Security Passcode (All Accounts):** `yard2026`

---

## Team Roster & Module Ownership (3-CS4 | Group 4)

| Operator Account | Passcode | Full Name | Station Role | Primary Module Focus |
| :--- | :--- | :--- | :--- | :--- |
| `admin1` | `yard2026` | **Aira Mae Canlas** | Yard Operations Director | Module 2: Warehouse Dashboard |
| `admin2` | `yard2026` | **Darren Gonzales** | Senior Inventory Specialist | Module 3: Inventory Management |
| `admin3` | `yard2026` | **Hugh Daniel Raymundo** | Inbound Freight Officer | Module 4: Receiving Management |
| `admin4` | `yard2026` | **Jessica Mae Estojero** | Outbound Fulfillment Lead | Module 5: Order/Picking Management |
| `admin5` | `yard2026` | **Ladyayessa Gatdula** | Stock Movement & Audit Officer | Module 6: Stock Movement & Tracking |
| `admin6` | `yard2026` | **Nina Maria Pangan** | Compliance & QA Lead | Module 7: Reports & Notifications |
| `admin7` | `yard2026` | **Rod Anne Pantaleon** | Terminal Station Supervisor | Module 1: Login & User Management |
| `admin` | `yard2026` | *Root Fallback Account* | Yard Shift Lead | System Administration & Overrides |

---

## Full-Stack Architecture

* **Frontend:** Vanilla HTML5, Custom Industrial CSS3 (Dark/Light Mode Design System), and Modular ES6 JavaScript.
* **Backend Server:** Node.js & Express (`server.js`) with RESTful state synchronization endpoints.
* **Cloud Database:** Render Managed PostgreSQL (`db.js`) with automated schema migration and seed hydration for `inventory`, `orders`, and `movements`.
* **AI Logistics Copilot:** Hugging Face Serverless Inference API (`Qwen/Qwen2.5-72B-Instruct` & `Mistral-7B-Instruct-v0.3`) providing real-time natural language answers on low-stock SKUs, storage bay coordinates, and active picking orders.

---

## Core System Modules (7 Required Modules)

1. **Module 1: Login & User Management** — Role-based authentication, inline validation, persistent station locks, and confirmed session exit dialogs.
2. **Module 2: Warehouse Dashboard** — 5 live KPI metric pods (Cataloged SKUs, Total Storage Units, Critical Replenishment, Dock Inbound Scheduled, Awaiting Pick Run), broadcast feed, and live movement stream.
3. **Module 3: Inventory Management** — Master catalog mapped to storage bays (`BAY-A-01`), dual-tier filtering, real-time search, CRUD curator modals, and reversible purge actions with an inline `UNDO` buffer.
4. **Module 4: Receiving Management** — 3-Stage sequential freight intake wizard (*Manifest Intake* -> *Physical Verification* -> *Bay Stock Committed*) with stamped receipt generation.
5. **Module 5: Order / Picking Management** — 4-Phase fulfillment pipeline (*Pending* -> *Picking* -> *Ready* -> *Completed*) with an interactive floor picking slip checklist and completion progress bar.
6. **Module 6: Stock Movement & Tracking** — Immutable chronological audit ledger tracking *Received*, *Released*, *Transferred*, and *Adjusted* stock movements with one-click CSV export.
7. **Module 7: Reports & Notifications** — Topbar emergency siren beacon popover and tabbed audit report generator (*Master Inventory*, *Low Stock Replenishment*, *Stock Movement Audit*, and *Outbound Orders*).

---

## Keyboard Hotkey Reference

| Key Combination | Targeted Terminal Action |
| :--- | :--- |
| `Alt + 1` | Switch to **Yard Dashboard** (Module 2) |
| `Alt + 2` | Switch to **Inventory Catalog** (Module 3) |
| `Alt + 3` | Switch to **Freight Receiving** (Module 4) |
| `Alt + 4` | Switch to **Order Fulfillment** (Module 5) |
| `Alt + 5` | Switch to **Movement Ledger** (Module 6) |
| `Alt + 6` | Switch to **Reports & Broadcasts** (Module 7) |
| `Alt + S` | Focus and highlight **Global Terminal Search** |
| `Esc` | Close any active modal, AI drawer, popover, or autocomplete dropdown |

---

## Local Setup & Execution

```bash
git clone [https://github.com/hughtube-coder/vanguard-logistics-yard.git](https://github.com/hughtube-coder/vanguard-logistics-yard.git)
cd vanguard-logistics-yard
npm install
npm start