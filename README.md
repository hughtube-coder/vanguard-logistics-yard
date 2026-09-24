# Vanguard Logistics Yard (VLY) | Industrial Terminal Console

An industrial-grade Warehouse Inventory & Order Management System UI/UX interactive prototype developed for Human-Computer Interaction (HCI) standards. The interface is engineered for rugged terminals, high-throughput freight hubs, and low-cognitive-load floor operations, strictly demonstrating **Shneiderman's Eight Golden Rules of Interface Design**.

---

## Live Prototype Access

* **Interactive Prototype URL:** [https://hughtube-coder.github.io/vanguard-logistics-yard/](https://hughtube-coder.github.io/vanguard-logistics-yard/)
* **Repository:** [https://github.com/hughtube-coder/vanguard-logistics-yard](https://github.com/hughtube-coder/vanguard-logistics-yard)
* **Default Security Passcode (All Accounts):** `yard2026`

---

## Team Roster & Module Ownership

| Operator Account | Passcode | Full Name | Station Role | Primary Module Focus |
| :--- | :--- | :--- | :--- | :--- |
| `admin1` | `yard2026` | **Aira Mae Canlas** | Yard Operations Director | Module 2: Warehouse Dashboard |
| `admin2` | `yard2026` | **Darren Gonzales**[cite: 5] | Senior Inventory Specialist | Module 3: Inventory Management |
| `admin3` | `yard2026` | **Hugh Daniel Raymundo**[cite: 5] | Inbound Freight Officer | Module 4: Receiving Management |
| `admin4` | `yard2026` | **Jessica Mae Estojero**[cite: 5] | Outbound Fulfillment Lead | Module 5: Order/Picking Management |
| `admin5` | `yard2026` | **Ladyayessa Gatdula**[cite: 5] | Stock Movement & Audit Officer | Module 6: Stock Movement & Tracking |
| `admin6` | `yard2026` | **Nina Maria Pangan**[cite: 5] | Compliance & QA Lead | Module 7: Reports & Notifications |
| `admin7` | `yard2026` | **Rod Anne Pantaleon**[cite: 5] | Terminal Station Supervisor | Module 1: Login & User Management |
| `admin` | `yard2026` | *Root Fallback Account* | Yard Shift Lead | System Administration & Overrides |

---

## Core System Modules (7 Required Modules)

The interface integrates all seven mandatory warehouse logistics modules within a unified terminal workstation shell:

1. **Module 1: Login & User Management**
   * Role-based credentials with visual validation error handling.
   * Persistent station session lock and active operator avatar tag in sidebar.
   * Explicit confirmed exit sequence preventing accidental session termination.
2. **Module 2: Warehouse Dashboard**
   * Real-time operational overview with 5 live KPI metric pods (Active SKUs, Storage Balance, Critical Low Stock, Dock Inbounds, and Open Orders).
   * Real-time floor broadcast feed and recent stock transaction mini-ledger.
3. **Module 3: Inventory Management**
   * Master product line catalog mapped to physical storage bays.
   * Dual-tier filtering by Product Class and Health/Stock status alongside live SKU search.
   * Full CRUD interactions: modal inspections, line editing, and reversible purge operations.
4. **Module 4: Receiving Management**
   * 3-Stage sequential freight intake wizard: Manifest Entry $\rightarrow$ Review & Tally $\rightarrow$ Bay Stamped Confirmation.
   * Freight condition assessment (*Pristine, Acceptable, Needs Quarantine*) and automatic balance reconciliation.
5. **Module 5: Order / Picking Management**
   * Outbound customer order tracking across a 4-phase pipeline: **Pending $\rightarrow$ Picking $\rightarrow$ Ready $\rightarrow$ Completed**.
   * Interactive modal picking slip checklist with automated pick-completion percentage calculation.
6. **Module 6: Stock Movement & Tracking**
   * Comprehensive audit trail tracking all movement types: **Received**, **Released**, **Transferred**, and **Adjusted**[cite: 1].
   * Modal tools for physical storage bay transfers and scrap/cycle count adjustments with direct browser CSV export[cite: 1].
7. **Module 7: Reports & Notifications**[cite: 1]
   * Topbar emergency beacon popover for immediate broadcast triage[cite: 1].
   * Tabbed reporting suite computing 4 live warehouse audits: *Master Inventory*, *Low Stock Replenishment*, *Movement Audit*, and *Outbound Orders*[cite: 1].

---

## Required Midterm User Flows

The system supports end-to-end operational user flows designed for presentation demonstration[cite: 1]:

```text
User Flow 1: Inbound Freight Receiving
[Login] ──> [Dashboard] ──> [Receiving Wizard: Step 1] ──> [Manifest Review: Step 2] ──> [Commit & Receipt: Step 3]
