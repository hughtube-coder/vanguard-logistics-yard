/**
 * Vanguard Logistics Yard (VLY) - Registered Terminal Personnel Accounts
 * Maps each group member to an operational role and credentials.
 */
const vlyRegisteredPersonnel = [
  { username: "admin1", password: "yard2026", name: "Aira Mae Canlas", role: "Yard Operations Director", initials: "AC", id: "VLY-DIR-101" }, //[cite: 5]
  { username: "admin2", password: "yard2026", name: "Darren Gonzales", role: "Senior Inventory Specialist", initials: "DG", id: "VLY-INV-102" }, //[cite: 5]
  { username: "admin3", password: "yard2026", name: "Hugh Daniel Raymundo", role: "Inbound Freight & Receiving Officer", initials: "HR", id: "VLY-RCV-103" }, //[cite: 5]
  { username: "admin4", password: "yard2026", name: "Jessica Mae Estojero", role: "Outbound Fulfillment Lead", initials: "JE", id: "VLY-FUL-104" }, //[cite: 5]
  { username: "admin5", password: "yard2026", name: "Ladyayessa Gatdula", role: "Stock Movement & Audit Officer", initials: "LG", id: "VLY-AUD-105" }, //[cite: 5]
  { username: "admin6", password: "yard2026", name: "Nina Maria Pangan", role: "Compliance & QA Lead", initials: "NP", id: "VLY-QAC-106" }, //[cite: 5]
  { username: "admin7", password: "yard2026", name: "Rod Anne Pantaleon", role: "Terminal Station Supervisor", initials: "RP", id: "VLY-DSP-107" }, //[cite: 5]
  { username: "admin", password: "yard2026", name: "Hugh Raymundo", role: "Yard Shift Lead", initials: "HR", id: "VLY-OP-401" }
];

const vlySeedInventory = [
  { sku: "VLY-HW-101", name: "High-Tensile Structural I-Beams (Grade A)", category: "Structural Hardware", quantity: 24, location: "BAY-A-01", status: "In Stock", supplier: "Apex Industrial Parts" },
  { sku: "VLY-EQ-204", name: "Hydraulic Rough-Terrain Yard Stacker", category: "Heavy Equipment", quantity: 3, location: "BAY-E-02", status: "Low Stock", supplier: "Titan Cargo Lines" },
  { sku: "VLY-PKG-305", name: "Heavy Polyethylene Pallet Wrap (Rolls)", category: "Freight Supplies", quantity: 320, location: "BAY-P-11", status: "In Stock", supplier: "PacEuro Packaging" },
  { sku: "VLY-EL-409", name: "Industrial Ruggedized RFID Scanner Hub", category: "Electronics", quantity: 4, location: "BAY-T-04", status: "Low Stock", supplier: "Global Tech Supply Co." },
  { sku: "VLY-HW-115", name: "Reinforced Dock Leveler Steel Chocks", category: "Structural Hardware", quantity: 0, location: "BAY-A-09", status: "Out of Stock", supplier: "Apex Industrial Parts" },
  { sku: "VLY-PKG-312", name: "Weatherproof Container Cargo Seals", category: "Freight Supplies", quantity: 510, location: "BAY-P-02", status: "In Stock", supplier: "PacEuro Packaging" },
  { sku: "VLY-EQ-210", name: "Electric Tugger Tow Tractor (Model TX)", category: "Heavy Equipment", quantity: 2, location: "BAY-E-08", status: "Low Stock", supplier: "Titan Cargo Lines" }
];

const vlySeedOrders = [
  {
    orderId: "VLY-ORD-9021",
    customer: "Metro Rail Fabrication Yard",
    date: "2026-09-24",
    status: "Picking",
    destination: "Outbound Freight Dock 2",
    items: [
      { sku: "VLY-EL-409", name: "Industrial Ruggedized RFID Scanner Hub", qty: 2, picked: true, location: "BAY-T-04" },
      { sku: "VLY-HW-101", name: "High-Tensile Structural I-Beams (Grade A)", qty: 6, picked: false, location: "BAY-A-01" }
    ]
  },
  {
    orderId: "VLY-ORD-9022",
    customer: "Pacific Bridge Construction Works",
    date: "2026-09-24",
    status: "Pending",
    destination: "Staging Bay 14",
    items: [
      { sku: "VLY-PKG-305", name: "Heavy Polyethylene Pallet Wrap (Rolls)", qty: 40, picked: false, location: "BAY-P-11" },
      { sku: "VLY-PKG-312", name: "Weatherproof Container Cargo Seals", qty: 100, picked: false, location: "BAY-P-02" }
    ]
  },
  {
    orderId: "VLY-ORD-8980",
    customer: "Keystone Rail Assembly Depot",
    date: "2026-09-23",
    status: "Completed",
    destination: "Flatbed Rail Car 09",
    items: [
      { sku: "VLY-HW-101", name: "High-Tensile Structural I-Beams (Grade A)", qty: 12, picked: true, location: "BAY-A-01" }
    ]
  }
];

const vlySeedMovements = [
  {
    id: "MV-7740",
    timestamp: "2026-09-24 10:30",
    type: "Received",
    sku: "VLY-PKG-305",
    qtyChange: "+150",
    prevStock: 170,
    newStock: 320,
    user: "A. Canlas",
    reference: "BOL-VLY-4902"
  },
  {
    id: "MV-7739",
    timestamp: "2026-09-24 09:10",
    type: "Released",
    sku: "VLY-HW-101",
    qtyChange: "-12",
    prevStock: 36,
    newStock: 24,
    user: "D. Gonzales",
    reference: "VLY-ORD-8980"
  },
  {
    id: "MV-7738",
    timestamp: "2026-09-23 15:40",
    type: "Adjusted",
    sku: "VLY-HW-115",
    qtyChange: "-2",
    prevStock: 2,
    newStock: 0,
    user: "L. Gatdula",
    reference: "Safety Defect Scrap"
  },
  {
    id: "MV-7737",
    timestamp: "2026-09-23 11:20",
    type: "Transferred",
    sku: "VLY-EQ-204",
    qtyChange: "0",
    prevStock: 3,
    newStock: 3,
    user: "R. Pantaleon",
    reference: "Relocated BAY-B-01 -> BAY-E-02"
  }
];

const vlySeedAlerts = [
  { id: 101, type: "warning", message: "Low stock alert: Hydraulic Rough-Terrain Yard Stacker down to 3 units.", time: "18 min ago", read: false },
  { id: 102, type: "danger", message: "Out of Stock: Reinforced Dock Leveler Steel Chocks depleted at BAY-A-09.", time: "1 hour ago", read: false },
  { id: 103, type: "info", message: "Inbound Carrier Titan Cargo Lines checked in at North Gate.", time: "2 hours ago", read: false },
  { id: 104, type: "success", message: "Order VLY-ORD-8980 cleared for Flatbed Rail Car 09 dispatch.", time: "5 hours ago", read: true }
];