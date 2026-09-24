/**
 * Vanguard Logistics Yard - Terminal Interaction Controller
 * Fully implements Shneiderman's 8 Golden Rules and the 3 Midterm User Flows:
 * 1. Receive New Inventory (Login -> Dashboard -> Receiving -> Review -> Confirm)[cite: 1]
 * 2. Process an Order (Dashboard -> Orders -> Picking Modal -> Update Status -> Complete)[cite: 1]
 * 3. Manage Low Stock (Dashboard -> Low Stock Warning -> Inventory Details -> Review/Restock)[cite: 1]
 */

document.addEventListener("DOMContentLoaded", () => {
  // Application State
  const yardState = {
    activeOperator: null,
    inventory: [...vlySeedInventory],
    orders: [...vlySeedOrders],
    movements: [...vlySeedMovements],
    alerts: [...vlySeedAlerts],
    stagedFreight: null,
    activePickOrder: null,
    undoBuffer: null
  };

  // Reusable confirmation modal state callback
  let activeDangerCallback = null;

  // DOM Selectors
  const authViewport = document.getElementById("view-vly-auth");
  const workstation = document.getElementById("vly-workstation");
  const authForm = document.getElementById("vly-auth-form");
  const navAnchors = document.querySelectorAll(".nav-anchor");
  const yardModules = document.querySelectorAll(".yard-module");
  const toastShelf = document.getElementById("vly-toast-shelf");
  const globalLoader = document.getElementById("vly-global-loader");
  const dangerModal = document.getElementById("modal-danger-prompt");

  // Beacon Topbar Dropdown Selectors
  const beaconBtn = document.getElementById("vly-beacon-notif");
  const beaconMenu = document.getElementById("vly-beacon-menu");

  /* ==========================================================================
     THEME TOGGLE ENGINE (DARK / LIGHT WITH LOCALSTORAGE PERSISTENCE)
     ========================================================================== */
  const savedTheme = localStorage.getItem("vly-theme") || "dark";
  applyTheme(savedTheme);

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vly-theme", theme);
    const icons = document.querySelectorAll(".theme-icon");
    icons.forEach((ic) => (ic.textContent = theme === "dark" ? "☀️" : "🌙"));
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
    sendYardToast(`Station display mode set to ${current === "dark" ? "Light" : "Dark"} mode.`, "info");
  }

  document.getElementById("btn-theme-auth").addEventListener("click", toggleTheme);
  document.getElementById("btn-theme-topbar").addEventListener("click", toggleTheme);

  /* ==========================================================================
     UNIQUE PURE-VISUAL LOADER CONTROLLER (NO TEXT)
     ========================================================================== */
  function triggerVisualLoader(durationMs, callback) {
    globalLoader.classList.remove("hidden");
    setTimeout(() => {
      globalLoader.classList.add("hidden");
      if (callback) callback();
    }, durationMs);
  }

  /* ==========================================================================
     GENERALIZED CONFIRMATION MODAL (RULES 4, 5 & 6)[cite: 1]
     ========================================================================== */
  function showDangerModal({ title, message, confirmLabel = "Affirm", onConfirm }) {
    document.getElementById("danger-title").textContent = title;
    document.getElementById("danger-message").textContent = message;
    const affirmBtn = document.getElementById("btn-affirm-danger");
    affirmBtn.textContent = confirmLabel;
    activeDangerCallback = onConfirm;
    dangerModal.classList.remove("hidden");
  }

  document.getElementById("btn-dismiss-danger").addEventListener("click", () => {
    dangerModal.classList.add("hidden");
    activeDangerCallback = null;
  });

  document.getElementById("btn-cancel-danger").addEventListener("click", () => {
    dangerModal.classList.add("hidden");
    activeDangerCallback = null;
  });

  document.getElementById("btn-affirm-danger").addEventListener("click", () => {
    if (activeDangerCallback) {
      activeDangerCallback();
      activeDangerCallback = null;
    }
    dangerModal.classList.add("hidden");
  });

  /* ==========================================================================
     SHNEIDERMAN'S RULE 2: ACCESSIBILITY & GLOBAL KEYBOARD ACCELERATORS[cite: 1]
     ========================================================================== */
  window.addEventListener("keydown", (e) => {
    if (e.altKey && !isNaN(e.key) && parseInt(e.key, 10) >= 1 && parseInt(e.key, 10) <= 6) {
      e.preventDefault();
      const targets = [
        "mod-yard-dashboard",
        "mod-yard-inventory",
        "mod-yard-receiving",
        "mod-yard-picking",
        "mod-yard-tracking",
        "mod-yard-reports"
      ];
      switchModuleView(targets[parseInt(e.key, 10) - 1]);
    }

    if (e.altKey && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      const s = document.getElementById("vly-global-search");
      if (s) s.focus();
    }

    if (e.key === "Escape") {
      document.querySelectorAll(".modal-chassis").forEach((m) => m.classList.add("hidden"));
      const acBox = document.getElementById("vly-search-autocomplete");
      if (acBox) acBox.classList.add("hidden");
      if (beaconMenu) beaconMenu.classList.add("hidden");
      activeDangerCallback = null;
    }
  });

  /* ==========================================================================
     SHNEIDERMAN'S RULE 3 & 6: FEEDBACK & REVERSAL (TOAST WITH UNDO BUFFER)[cite: 1]
     ========================================================================== */
  function sendYardToast(message, variant = "info", undoCallback = null) {
    const toast = document.createElement("div");
    toast.className = `vly-toast ${variant}`;

    const textSpan = document.createElement("span");
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    if (undoCallback) {
      const undoBtn = document.createElement("button");
      undoBtn.type = "button";
      undoBtn.className = "btn-toast-undo";
      undoBtn.textContent = "UNDO";
      undoBtn.addEventListener("click", () => {
        undoCallback();
        toast.remove();
      });
      toast.appendChild(undoBtn);
    }

    toastShelf.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 250);
    }, undoCallback ? 5500 : 3500);
  }

  function resolveStatusBadge(status) {
    switch (status) {
      case "In Stock":
      case "Completed":
      case "Ready":
      case "Received":
        return "tag-success";
      case "Low Stock":
      case "Picking":
        return "tag-warning";
      case "Out of Stock":
      case "Needs Quarantine":
        return "tag-danger";
      default:
        return "tag-info";
    }
  }

  /* ==========================================================================
     GLOBAL SEARCH WITH REAL-TIME SUGGESTIONS
     ========================================================================== */
  const globalSearchInput = document.getElementById("vly-global-search");
  const searchAcBox = document.getElementById("vly-search-autocomplete");

  globalSearchInput.addEventListener("input", () => {
    const val = globalSearchInput.value.trim().toLowerCase();
    searchAcBox.innerHTML = "";

    if (!val) {
      searchAcBox.classList.add("hidden");
      return;
    }

    const matchedItems = yardState.inventory.filter(
      (i) => i.sku.toLowerCase().includes(val) || i.name.toLowerCase().includes(val) || i.location.toLowerCase().includes(val)
    );
    const matchedOrders = yardState.orders.filter(
      (o) => o.orderId.toLowerCase().includes(val) || o.customer.toLowerCase().includes(val)
    );

    if (matchedItems.length === 0 && matchedOrders.length === 0) {
      searchAcBox.innerHTML = `<div style="padding:0.75rem 1rem; font-size:0.8rem; color:var(--vly-text-subtle);">No items matched "${val}".</div>`;
      searchAcBox.classList.remove("hidden");
      return;
    }

    matchedItems.slice(0, 4).forEach((i) => {
      const row = document.createElement("div");
      row.className = "search-result-item";
      row.innerHTML = `
        <div>
          <strong>${i.name}</strong> <span class="mono">(${i.sku})</span>
          <div style="font-size:0.75rem; color:var(--vly-text-subtle);">Bay: ${i.location} | Qty: ${i.quantity}</div>
        </div>
        <span class="tag-status ${resolveStatusBadge(i.status)}">${i.status}</span>
      `;
      row.addEventListener("click", () => {
        searchAcBox.classList.add("hidden");
        switchModuleView("mod-yard-inventory");
        inspectProductDetails(i.sku);
      });
      searchAcBox.appendChild(row);
    });

    matchedOrders.slice(0, 3).forEach((o) => {
      const row = document.createElement("div");
      row.className = "search-result-item";
      row.innerHTML = `
        <div>
          <strong>${o.orderId}</strong> — ${o.customer}
          <div style="font-size:0.75rem; color:var(--vly-text-subtle);">${o.items.length} lines</div>
        </div>
        <span class="tag-status ${resolveStatusBadge(o.status)}">${o.status}</span>
      `;
      row.addEventListener("click", () => {
        searchAcBox.classList.add("hidden");
        switchModuleView("mod-yard-picking");
        launchPickingModal(o.orderId);
      });
      searchAcBox.appendChild(row);
    });

    searchAcBox.classList.remove("hidden");
  });

  /* ==========================================================================
     TOPBAR ALERT BEACON INTERACTIVE DROPDOWN FLYOUT
     ========================================================================== */
  function renderBeaconDropdown() {
    const list = document.getElementById("beacon-menu-list");
    list.innerHTML = "";

    if (yardState.alerts.length === 0) {
      list.innerHTML = `<li style="padding: 1.5rem; text-align: center; color: var(--vly-text-subtle); font-size: 0.8rem;">No active broadcasts.</li>`;
      return;
    }

    yardState.alerts.slice(0, 5).forEach((alert) => {
      const li = document.createElement("li");
      li.className = `beacon-menu-item ${alert.read ? "read" : "unread"}`;
      li.innerHTML = `
        <div class="beacon-item-meta">
          <span class="tag-status ${resolveStatusBadge(alert.type)}">${alert.type}</span>
          <span class="beacon-item-time">${alert.time}</span>
        </div>
        <div style="color: var(--vly-text-main); margin-top: 0.2rem;">${alert.message}</div>
      `;
      li.addEventListener("click", () => {
        alert.read = true;
        renderBroadcastList();
        renderBeaconDropdown();
        beaconMenu.classList.add("hidden");
        switchModuleView("mod-yard-reports");
        toggleReportSubpane("subpane-vly-alerts");
      });
      list.appendChild(li);
    });
  }

  // Toggle Dropdown Visibility
  beaconBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = beaconMenu.classList.contains("hidden");
    if (isHidden) {
      renderBeaconDropdown();
      beaconMenu.classList.remove("hidden");
    } else {
      beaconMenu.classList.add("hidden");
    }
  });

  // Close dropdown on outside click
  document.addEventListener("click", (e) => {
    if (beaconMenu && !beaconMenu.contains(e.target) && e.target !== beaconBtn) {
      beaconMenu.classList.add("hidden");
    }
  });

  // Quick Dismiss from Dropdown
  document.getElementById("btn-beacon-dismiss-all").addEventListener("click", (e) => {
    e.stopPropagation();
    yardState.alerts.forEach((a) => (a.read = true));
    renderBroadcastList();
    renderBeaconDropdown();
    sendYardToast("All active broadcasts marked as read.", "info");
  });

  // Jump to Module 7 from Dropdown
  document.getElementById("btn-beacon-view-module7").addEventListener("click", () => {
    beaconMenu.classList.add("hidden");
    switchModuleView("mod-yard-reports");
    toggleReportSubpane("subpane-vly-alerts");
  });

  /* ==========================================================================
     MODULE 1: AUTHENTICATION & MULTI-ACCOUNT ACCESS[cite: 1]
     ========================================================================== */
  authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const opInput = document.getElementById("vly-input-operator");
    const keyInput = document.getElementById("vly-input-key");
    const opErr = document.getElementById("err-vly-operator");
    const keyErr = document.getElementById("err-vly-passcode");

    opErr.textContent = "";
    keyErr.textContent = "";

    let hasErr = false;
    const inputUser = opInput.value.trim().toLowerCase();
    const inputPass = keyInput.value.trim();

    if (!inputUser) {
      opErr.textContent = "Operator ID or authorized handle required.";
      hasErr = true;
    }
    if (!inputPass) {
      keyErr.textContent = "Security access key is required.";
      hasErr = true;
    }
    if (hasErr) return;

    // Search against registered personnel roster
    const authenticatedUser = vlyRegisteredPersonnel.find(
      (p) => p.username.toLowerCase() === inputUser && p.password === inputPass
    );

    if (authenticatedUser) {
      triggerVisualLoader(800, () => {
        yardState.activeOperator = authenticatedUser;
        document.getElementById("vly-operator-name").textContent = authenticatedUser.name;
        document.getElementById("vly-operator-tier").textContent = authenticatedUser.role;
        document.getElementById("vly-badge-avatar").textContent = authenticatedUser.initials;

        authViewport.classList.add("hidden");
        workstation.classList.remove("hidden");
        sendYardToast(`Station authorized. Welcome, ${authenticatedUser.name} (${authenticatedUser.role}).`, "success");
        switchModuleView("mod-yard-dashboard");
        renderAllTerminalData();
      });
    } else {
      keyErr.textContent = "Invalid credentials. Use demo accounts: admin1 to admin7 / yard2026";
      sendYardToast("Access Denied: Terminal security check failed.", "error");
    }
  });

  // Confirmed Exit Dialog (Rule 5 & Module 1 Acceptance Criteria)[cite: 1]
  document.getElementById("btn-terminate-session").addEventListener("click", () => {
    showDangerModal({
      title: "Exit Workstation Terminal?",
      message: "Are you sure you want to end your active session? Any uncommitted work will be saved to audit ledgers.",
      confirmLabel: "Yes, Exit Terminal",
      onConfirm: () => {
        triggerVisualLoader(600, () => {
          yardState.activeOperator = null;
          workstation.classList.add("hidden");
          authViewport.classList.remove("hidden");
          authForm.reset();
          sendYardToast("Terminal station logged out safely.", "info");
        });
      }
    });
  });

  /* ==========================================================================
     NAVIGATION CONTROLLER
     ========================================================================== */
  function switchModuleView(targetViewId) {
    yardModules.forEach((mod) => {
      mod.classList.add("hidden");
      mod.classList.remove("active");
    });
    navAnchors.forEach((btn) => btn.classList.remove("active"));

    const activeView = document.getElementById(targetViewId);
    if (activeView) {
      activeView.classList.remove("hidden");
      activeView.classList.add("active");
    }

    const matchedBtn = document.querySelector(`.nav-anchor[data-view="${targetViewId}"]`);
    if (matchedBtn) matchedBtn.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navAnchors.forEach((b) => b.addEventListener("click", () => switchModuleView(b.dataset.view)));

  document.getElementById("btn-nav-to-receiving").addEventListener("click", () => switchModuleView("mod-yard-receiving"));
  document.getElementById("btn-nav-to-picking").addEventListener("click", () => switchModuleView("mod-yard-picking"));
  document.getElementById("btn-view-all-broadcasts").addEventListener("click", () => {
    switchModuleView("mod-yard-reports");
    toggleReportSubpane("subpane-vly-alerts");
  });
  document.getElementById("btn-view-all-stream").addEventListener("click", () => switchModuleView("mod-yard-tracking"));

  /* ==========================================================================
     MODULE 2: YARD DASHBOARD[cite: 1]
     ========================================================================== */
  function renderDashboardKPIs() {
    const totalSkus = yardState.inventory.length;
    const totalUnits = yardState.inventory.reduce((sum, item) => sum + Number(item.quantity), 0);
    const lowCount = yardState.inventory.filter((i) => i.quantity > 0 && i.quantity <= 5).length;
    const openOrdersCount = yardState.orders.filter((o) => o.status === "Pending" || o.status === "Picking").length;

    document.getElementById("kpi-sku-count").textContent = totalSkus;
    document.getElementById("kpi-total-units").textContent = totalUnits.toLocaleString();
    document.getElementById("kpi-low-units").textContent = lowCount;
    document.getElementById("kpi-open-orders").textContent = openOrdersCount;

    const feed = document.getElementById("dashboard-bulletin-list");
    feed.innerHTML = "";
    yardState.alerts.slice(0, 4).forEach((a) => {
      const li = document.createElement("li");
      li.style.padding = "0.6rem 0";
      li.style.borderBottom = "1px solid var(--vly-border-dim)";
      li.style.fontSize = "0.85rem";
      li.innerHTML = `<strong>[${a.time}]</strong> ${a.message}`;
      feed.appendChild(li);
    });

    const streamTbody = document.getElementById("dashboard-quick-movements");
    streamTbody.innerHTML = "";
    yardState.movements.slice(0, 4).forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="tag-status ${resolveStatusBadge(m.type)}">${m.type}</span></td>
        <td><code>${m.sku}</code></td>
        <td style="font-weight:700;">${m.qtyChange}</td>
        <td class="mono">${m.reference}</td>
        <td>${m.timestamp.split(" ")[1]}</td>
      `;
      streamTbody.appendChild(tr);
    });
  }

  // USER FLOW 3: Click Low Stock KPI -> Filter Inventory -> Inspect Item[cite: 1]
  document.getElementById("kpi-card-low-stock").addEventListener("click", () => {
    switchModuleView("mod-yard-inventory");
    const healthSelect = document.getElementById("inv-filter-health");
    healthSelect.value = "Low Stock";
    renderInventoryCatalog();
    sendYardToast("Inventory catalog filtered to items with active low-stock replenishment warnings.", "info");
  });

  /* ==========================================================================
     MODULE 3: INVENTORY CATALOG MANAGEMENT (COMPACT ACTIONS & SAFE PURGE)[cite: 1]
     ========================================================================== */
  function renderInventoryCatalog() {
    const searchVal = document.getElementById("inv-query-field").value.toLowerCase();
    const groupVal = document.getElementById("inv-filter-group").value;
    const healthVal = document.getElementById("inv-filter-health").value;
    const tbody = document.getElementById("vly-inventory-rows");
    tbody.innerHTML = "";

    const matched = yardState.inventory.filter((item) => {
      const matchSearch = item.sku.toLowerCase().includes(searchVal) ||
                          item.name.toLowerCase().includes(searchVal) ||
                          item.location.toLowerCase().includes(searchVal);
      const matchGroup = groupVal === "ALL" || item.category === groupVal;
      const matchHealth = healthVal === "ALL" || item.status === healthVal;
      return matchSearch && matchGroup && matchHealth;
    });

    if (matched.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="center-align" style="padding:2rem;">No items match the chosen filter criteria.</td></tr>`;
      return;
    }

    matched.forEach((i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><code class="mono">${i.sku}</code></td>
        <td><strong>${i.name}</strong></td>
        <td>${i.category}</td>
        <td><code class="mono">${i.location}</code></td>
        <td style="font-weight:700;">${i.quantity}</td>
        <td><span class="tag-status ${resolveStatusBadge(i.status)}">${i.status}</span></td>
        <td>${i.supplier}</td>
        <td class="align-right">
          <div class="row-actions-group">
            <button type="button" class="btn btn-table btn-vly-outline btn-inspect-item" data-sku="${i.sku}">Details</button>
            <button type="button" class="btn btn-table btn-vly-outline btn-edit-item" data-sku="${i.sku}">Edit</button>
            <button type="button" class="btn btn-table btn-table-danger btn-purge-item" data-sku="${i.sku}">Purge</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll(".btn-inspect-item").forEach((b) => b.addEventListener("click", () => inspectProductDetails(b.dataset.sku)));
    document.querySelectorAll(".btn-edit-item").forEach((b) => b.addEventListener("click", () => launchCuratorModal(b.dataset.sku)));
    document.querySelectorAll(".btn-purge-item").forEach((b) => b.addEventListener("click", () => promptItemPurge(b.dataset.sku)));
  }

  document.getElementById("inv-query-field").addEventListener("input", renderInventoryCatalog);
  document.getElementById("inv-filter-group").addEventListener("change", renderInventoryCatalog);
  document.getElementById("inv-filter-health").addEventListener("change", renderInventoryCatalog);
  document.getElementById("btn-inv-reset-filters").addEventListener("click", () => {
    document.getElementById("inv-query-field").value = "";
    document.getElementById("inv-filter-group").value = "ALL";
    document.getElementById("inv-filter-health").value = "ALL";
    renderInventoryCatalog();
  });

  function inspectProductDetails(sku) {
    const item = yardState.inventory.find((i) => i.sku === sku);
    if (!item) return;

    document.getElementById("spec-item-name").textContent = item.name;
    document.getElementById("spec-sku").textContent = item.sku;
    document.getElementById("spec-group").textContent = item.category;
    document.getElementById("spec-bay").textContent = item.location;
    document.getElementById("spec-balance").textContent = `${item.quantity} available units`;
    document.getElementById("spec-vendor").textContent = item.supplier;

    const pill = document.getElementById("spec-status-pill");
    pill.className = `tag-status ${resolveStatusBadge(item.status)}`;
    pill.textContent = item.status;

    const alertBox = document.getElementById("spec-deficit-alert");
    alertBox.style.display = item.quantity <= 5 ? "block" : "none";

    document.getElementById("modal-product-details").classList.remove("hidden");
  }

  document.getElementById("btn-close-details").addEventListener("click", () => document.getElementById("modal-product-details").classList.add("hidden"));
  document.getElementById("btn-dismiss-details").addEventListener("click", () => document.getElementById("modal-product-details").classList.add("hidden"));
  document.getElementById("btn-route-to-restock").addEventListener("click", () => {
    const targetSku = document.getElementById("spec-sku").textContent;
    document.getElementById("modal-product-details").classList.add("hidden");
    switchModuleView("mod-yard-receiving");
    document.getElementById("intake-sku-select").value = targetSku;
    sendYardToast(`Navigated to Receiving for ${targetSku}.`, "info");
  });

  const curatorModal = document.getElementById("modal-product-curator");
  const curatorForm = document.getElementById("form-item-curator");

  function launchCuratorModal(sku = null) {
    curatorForm.reset();
    if (sku) {
      const item = yardState.inventory.find((i) => i.sku === sku);
      document.getElementById("curator-modal-title").textContent = `Edit Inventory Line: ${sku}`;
      document.getElementById("curator-sku-hidden").value = item.sku;
      document.getElementById("curator-name").value = item.name;
      document.getElementById("curator-group").value = item.category;
      document.getElementById("curator-stock").value = item.quantity;
      document.getElementById("curator-bay").value = item.location;
      document.getElementById("curator-vendor").value = item.supplier;
    } else {
      document.getElementById("curator-modal-title").textContent = "Catalog New Inventory Line";
      document.getElementById("curator-sku-hidden").value = "";
    }
    curatorModal.classList.remove("hidden");
  }

  document.getElementById("btn-trigger-add-item").addEventListener("click", () => launchCuratorModal());
  document.getElementById("btn-dismiss-curator").addEventListener("click", () => curatorModal.classList.add("hidden"));
  document.getElementById("btn-cancel-curator").addEventListener("click", () => curatorModal.classList.add("hidden"));

  curatorForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const hiddenSku = document.getElementById("curator-sku-hidden").value;
    const name = document.getElementById("curator-name").value.trim();
    const category = document.getElementById("curator-group").value;
    const quantity = parseInt(document.getElementById("curator-stock").value, 10);
    const location = document.getElementById("curator-bay").value.trim().toUpperCase();
    const supplier = document.getElementById("curator-vendor").value.trim();

    let computedStatus = "In Stock";
    if (quantity === 0) computedStatus = "Out of Stock";
    else if (quantity <= 5) computedStatus = "Low Stock";

    if (hiddenSku) {
      const existing = yardState.inventory.find((i) => i.sku === hiddenSku);
      if (existing) {
        existing.name = name;
        existing.category = category;
        existing.quantity = quantity;
        existing.location = location;
        existing.supplier = supplier;
        existing.status = computedStatus;
        sendYardToast(`Line ${hiddenSku} updated successfully.`, "success");
      }
    } else {
      const generatedSku = `VLY-${category.substring(0, 2).toUpperCase()}-${300 + yardState.inventory.length + 1}`;
      yardState.inventory.push({ sku: generatedSku, name, category, quantity, location, status: computedStatus, supplier });
      sendYardToast(`New line ${generatedSku} cataloged into ${location}.`, "success");
    }

    curatorModal.classList.add("hidden");
    renderInventoryCatalog();
    renderDashboardKPIs();
    fillReceivingDropdown();
    fillAdjustmentDropdown();
  });

  // Reversible Purge with Confirmation Modal & Undo Buffer (Rule 5 & 6)[cite: 1]
  function promptItemPurge(sku) {
    showDangerModal({
      title: "Purge Inventory Record",
      message: `Are you certain you wish to purge SKU ${sku} from yard inventory? You can undo this action immediately.`,
      confirmLabel: "Affirm Deletion",
      onConfirm: () => {
        const deletedItem = yardState.inventory.find((i) => i.sku === sku);
        yardState.undoBuffer = { ...deletedItem };
        yardState.inventory = yardState.inventory.filter((i) => i.sku !== sku);

        sendYardToast(`Item ${sku} removed from catalog.`, "info", () => {
          if (yardState.undoBuffer) {
            yardState.inventory.push(yardState.undoBuffer);
            yardState.undoBuffer = null;
            renderInventoryCatalog();
            renderDashboardKPIs();
            sendYardToast("Action reversed: Inventory item restored.", "success");
          }
        });

        renderInventoryCatalog();
        renderDashboardKPIs();
      }
    });
  }

  /* ==========================================================================
     MODULE 4: INBOUND FREIGHT RECEIVING (USER FLOW 1)[cite: 1]
     ========================================================================== */
  function fillReceivingDropdown() {
    const selector = document.getElementById("intake-sku-select");
    selector.innerHTML = '<option value="">Choose catalog product...</option>';
    yardState.inventory.forEach((i) => {
      const opt = document.createElement("option");
      opt.value = i.sku;
      opt.textContent = `${i.sku} — ${i.name} [Bay: ${i.location}]`;
      selector.appendChild(opt);
    });
  }

  document.getElementById("intake-timestamp").value = new Date().toISOString().split("T")[0];

  const intakeForm = document.getElementById("vly-intake-form");
  const paneStage1 = document.getElementById("receiving-pane-stage1");
  const paneStage2 = document.getElementById("receiving-pane-stage2");
  const paneStage3 = document.getElementById("receiving-pane-stage3");
  const chk1 = document.getElementById("rcv-chk-1");
  const chk2 = document.getElementById("rcv-chk-2");
  const chk3 = document.getElementById("rcv-chk-3");

  intakeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const bol = document.getElementById("intake-bol-number").value.trim();
    const vendor = document.getElementById("intake-vendor-select").value;
    const sku = document.getElementById("intake-sku-select").value;
    const qty = parseInt(document.getElementById("intake-quantity").value, 10);
    const cond = document.getElementById("intake-condition").value;
    const date = document.getElementById("intake-timestamp").value;

    if (!bol || !vendor || !sku || !qty || qty <= 0) {
      sendYardToast("Validation Error: Please verify all intake fields.", "error");
      return;
    }

    const item = yardState.inventory.find((i) => i.sku === sku);
    yardState.stagedFreight = { bol, vendor, sku, qty, cond, date, bay: item ? item.location : "BAY-UNASSIGNED" };

    document.getElementById("vfy-bol").textContent = bol;
    document.getElementById("vfy-vendor").textContent = vendor;
    document.getElementById("vfy-product").textContent = `${item ? item.name : ""} (${sku})`;
    document.getElementById("vfy-bay").textContent = yardState.stagedFreight.bay;
    document.getElementById("vfy-amount").textContent = `+${qty} Units`;
    document.getElementById("vfy-health").textContent = cond;
    document.getElementById("vfy-time").textContent = date;

    paneStage1.classList.add("hidden");
    paneStage2.classList.remove("hidden");
    chk1.classList.remove("active");
    chk2.classList.add("active");
  });

  document.getElementById("btn-modify-manifest").addEventListener("click", () => {
    paneStage2.classList.add("hidden");
    paneStage1.classList.remove("hidden");
    chk2.classList.remove("active");
    chk1.classList.add("active");
  });

  document.getElementById("btn-commit-freight").addEventListener("click", () => {
    if (!yardState.stagedFreight) return;
    
    triggerVisualLoader(750, () => {
      const { bol, sku, qty, vendor, bay, cond } = yardState.stagedFreight;
      const targetItem = yardState.inventory.find((i) => i.sku === sku);

      if (targetItem) {
        const priorCount = targetItem.quantity;
        targetItem.quantity += qty;
        targetItem.status = targetItem.quantity > 5 ? "In Stock" : "Low Stock";

        yardState.movements.unshift({
          id: `MV-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
          type: "Received",
          sku: targetItem.sku,
          qtyChange: `+${qty}`,
          prevStock: priorCount,
          newStock: targetItem.quantity,
          user: yardState.activeOperator ? yardState.activeOperator.name : "Yard Specialist",
          reference: bol
        });

        yardState.alerts.unshift({
          id: Date.now(),
          type: "success",
          message: `Freight confirmed: +${qty} units credited to ${targetItem.sku} (${bol}).`,
          time: "Just now",
          read: false
        });

        document.getElementById("vfy-receipt-box").innerHTML = `
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem;">
            <div><strong>Bill of Lading:</strong> <span class="mono">${bol}</span></div>
            <div><strong>Freight Carrier:</strong> ${vendor}</div>
            <div><strong>Catalog SKU:</strong> <span class="mono">${sku}</span></div>
            <div><strong>Storage Bay:</strong> <span class="mono">${bay}</span></div>
            <div><strong>Units Added:</strong> +${qty}</div>
            <div><strong>Condition:</strong> ${cond}</div>
          </div>
        `;
      }

      paneStage2.classList.add("hidden");
      paneStage3.classList.remove("hidden");
      chk2.classList.remove("active");
      chk3.classList.add("active");

      sendYardToast("Inbound freight successfully committed to warehouse stock.", "success");
      renderDashboardKPIs();
      renderInventoryCatalog();
      renderLedgerLogs();
      renderBroadcastList();
    });
  });

  document.getElementById("btn-reset-intake-cycle").addEventListener("click", () => {
    intakeForm.reset();
    document.getElementById("intake-timestamp").value = new Date().toISOString().split("T")[0];
    paneStage3.classList.add("hidden");
    paneStage1.classList.remove("hidden");
    chk3.classList.remove("active");
    chk1.classList.add("active");
    fillReceivingDropdown();
  });

  document.getElementById("btn-jump-to-inventory").addEventListener("click", () => {
    switchModuleView("mod-yard-inventory");
    paneStage3.classList.add("hidden");
    paneStage1.classList.remove("hidden");
    chk3.classList.remove("active");
    chk1.classList.add("active");
  });

  /* ==========================================================================
     MODULE 5: ORDER FULFILLMENT & PICKING (USER FLOW 2)[cite: 1]
     ========================================================================== */
  function renderOrderDeck() {
    const filterVal = document.getElementById("vly-filter-order-phase").value;
    const container = document.getElementById("vly-orders-deck");
    container.innerHTML = "";

    const matched = yardState.orders.filter((o) => filterVal === "ALL" || o.status === filterVal);

    if (matched.length === 0) {
      container.innerHTML = `<p style="grid-column:1/-1; padding:2rem; text-align:center;">No fulfillment orders found in this phase.</p>`;
      return;
    }

    matched.forEach((ord) => {
      const card = document.createElement("div");
      card.className = "manifest-card";
      const totalUnits = ord.items.reduce((sum, item) => sum + item.qty, 0);

      card.innerHTML = `
        <div>
          <div class="manifest-card-head">
            <strong class="mono">${ord.orderId}</strong>
            <span class="tag-status ${resolveStatusBadge(ord.status)}">${ord.status}</span>
          </div>
          <div class="manifest-card-body">
            <div><strong>Client Target:</strong> ${ord.customer}</div>
            <div><strong>Dispatch Gate:</strong> ${ord.destination}</div>
            <div><strong>Order Units:</strong> ${totalUnits} pcs (${ord.items.length} lines)</div>
            <div><strong>Date Scheduled:</strong> ${ord.date}</div>
          </div>
        </div>
        <div>
          <button type="button" class="btn btn-vly-primary btn-block btn-start-picking" data-id="${ord.orderId}">
            ${ord.status === "Completed" ? "Review Dispatched Slip" : "Execute Floor Pick Run"}
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    document.querySelectorAll(".btn-start-picking").forEach((b) => b.addEventListener("click", () => launchPickingModal(b.dataset.id)));
  }

  document.getElementById("vly-filter-order-phase").addEventListener("change", renderOrderDeck);

  const pickingModal = document.getElementById("modal-picking-flow");
  function launchPickingModal(orderId) {
    const order = yardState.orders.find((o) => o.orderId === orderId);
    if (!order) return;
    yardState.activePickOrder = order;

    document.getElementById("flow-order-code").textContent = `Fulfillment Run: ${order.orderId}`;
    const badge = document.getElementById("flow-order-tag");
    badge.className = `tag-status ${resolveStatusBadge(order.status)}`;
    badge.textContent = order.status;

    document.getElementById("flow-client-target").textContent = order.customer;
    document.getElementById("flow-dispatch-gate").textContent = order.destination;
    document.getElementById("flow-manifest-date").textContent = order.date;

    const tbody = document.getElementById("flow-pick-line-items");
    tbody.innerHTML = "";

    order.items.forEach((item, index) => {
      const matchInv = yardState.inventory.find((i) => i.sku === item.sku);
      const onHand = matchInv ? matchInv.quantity : 0;
      const tr = document.createElement("tr");

      const isSufficient = onHand >= item.qty;

      tr.innerHTML = `
        <td style="text-align:center;">
          <input type="checkbox" class="chk-pick-item" data-index="${index}" ${item.picked ? "checked" : ""} ${order.status === "Completed" || !isSufficient ? "disabled" : ""}>
        </td>
        <td><code class="mono">${item.location}</code></td>
        <td><strong class="mono">${item.sku}</strong></td>
        <td>${item.name}</td>
        <td style="font-weight:700;">${item.qty}</td>
        <td><span class="${!isSufficient ? 'alert-txt' : ''}">${onHand}</span></td>
        <td><span class="tag-status ${isSufficient ? 'tag-success' : 'tag-danger'}">${isSufficient ? 'Sufficient' : 'Deficit'}</span></td>
      `;
      tbody.appendChild(tr);
    });

    updatePickingProgress();
    pickingModal.classList.remove("hidden");

    document.querySelectorAll(".chk-pick-item").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        yardState.activePickOrder.items[idx].picked = e.target.checked;
        if (yardState.activePickOrder.status === "Pending") {
          yardState.activePickOrder.status = "Picking";
          badge.textContent = "Picking";
          badge.className = `tag-status ${resolveStatusBadge("Picking")}`;
        }
        updatePickingProgress();
      });
    });
  }

  function updatePickingProgress() {
    const order = yardState.activePickOrder;
    if (!order) return;

    const totalLines = order.items.length;
    const pickedLines = order.items.filter((it) => it.picked).length;
    const percent = Math.round((pickedLines / totalLines) * 100);

    document.getElementById("picking-progress-fill").style.width = `${percent}%`;
    document.getElementById("picking-progress-label").textContent = `Picking Completion: ${percent}%`;
    document.getElementById("picking-progress-count").textContent = `${pickedLines} of ${totalLines} lines picked`;

    const stageBtn = document.getElementById("btn-stage-pick-order");
    const completeBtn = document.getElementById("btn-finalize-pick-order");

    if (order.status === "Completed") {
      stageBtn.disabled = true;
      completeBtn.disabled = true;
    } else if (order.status === "Ready") {
      stageBtn.disabled = true;
      completeBtn.disabled = false;
    } else {
      stageBtn.disabled = pickedLines !== totalLines;
      completeBtn.disabled = pickedLines !== totalLines;
    }
  }

  document.getElementById("btn-exit-picking-modal").addEventListener("click", () => pickingModal.classList.add("hidden"));
  document.getElementById("btn-cancel-pick-session").addEventListener("click", () => pickingModal.classList.add("hidden"));

  document.getElementById("btn-stage-pick-order").addEventListener("click", () => {
    const order = yardState.activePickOrder;
    if (!order) return;
    order.status = "Ready";
    document.getElementById("flow-order-tag").className = `tag-status ${resolveStatusBadge("Ready")}`;
    document.getElementById("flow-order-tag").textContent = "Ready";
    updatePickingProgress();
    renderOrderDeck();
    sendYardToast(`Order ${order.orderId} verified and staged for outbound loading.`, "info");
  });

  document.getElementById("btn-finalize-pick-order").addEventListener("click", () => {
    const order = yardState.activePickOrder;
    if (!order) return;

    triggerVisualLoader(750, () => {
      order.items.forEach((line) => {
        const inv = yardState.inventory.find((i) => i.sku === line.sku);
        if (inv) {
          const prior = inv.quantity;
          inv.quantity = Math.max(0, inv.quantity - line.qty);
          if (inv.quantity === 0) inv.status = "Out of Stock";
          else if (inv.quantity <= 5) inv.status = "Low Stock";

          yardState.movements.unshift({
            id: `MV-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
            type: "Released",
            sku: inv.sku,
            qtyChange: `-${line.qty}`,
            prevStock: prior,
            newStock: inv.quantity,
            user: yardState.activeOperator ? yardState.activeOperator.name : "Fulfillment Lead",
            reference: order.orderId
          });
        }
      });

      order.status = "Completed";
      sendYardToast(`Order ${order.orderId} dispatched: stock released and logged.`, "success");
      pickingModal.classList.add("hidden");
      renderOrderDeck();
      renderInventoryCatalog();
      renderDashboardKPIs();
      renderLedgerLogs();
    });
  });

  /* ==========================================================================
     STOCK TRANSFER & ADJUSTMENT CONTROLLER (MODULE 6 INTERACTION)[cite: 1]
     ========================================================================== */
  const transferModal = document.getElementById("modal-stock-transfer");
  const transferForm = document.getElementById("form-stock-transfer");

  function fillAdjustmentDropdown() {
    const sel = document.getElementById("adj-sku-select");
    sel.innerHTML = "";
    yardState.inventory.forEach((i) => {
      const opt = document.createElement("option");
      opt.value = i.sku;
      opt.textContent = `${i.sku} — ${i.name} (Bay: ${i.location}, Current: ${i.quantity})`;
      sel.appendChild(opt);
    });
  }

  document.getElementById("btn-trigger-transfer-modal").addEventListener("click", () => {
    fillAdjustmentDropdown();
    transferForm.reset();
    transferModal.classList.remove("hidden");
  });
  document.getElementById("btn-close-transfer").addEventListener("click", () => transferModal.classList.add("hidden"));
  document.getElementById("btn-cancel-transfer").addEventListener("click", () => transferModal.classList.add("hidden"));

  transferForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const sku = document.getElementById("adj-sku-select").value;
    const type = document.getElementById("adj-action-type").value;
    const newBay = document.getElementById("adj-new-bay").value.trim().toUpperCase();
    const delta = parseInt(document.getElementById("adj-quantity-delta").value, 10);
    const reason = document.getElementById("adj-reason").value.trim();

    const item = yardState.inventory.find((i) => i.sku === sku);
    if (!item) return;

    const priorStock = item.quantity;

    if (type === "Transferred") {
      if (!newBay) {
        sendYardToast("Please specify the destination bay location.", "error");
        return;
      }
      const oldBay = item.location;
      item.location = newBay;
      yardState.movements.unshift({
        id: `MV-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
        type: "Transferred",
        sku: item.sku,
        qtyChange: "0",
        prevStock: priorStock,
        newStock: priorStock,
        user: yardState.activeOperator ? yardState.activeOperator.name : "Yard Specialist",
        reference: `Relocated ${oldBay} -> ${newBay} (${reason})`
      });
      sendYardToast(`SKU ${item.sku} relocated from ${oldBay} to ${newBay}.`, "success");
    } else {
      item.quantity = Math.max(0, item.quantity + delta);
      if (item.quantity === 0) item.status = "Out of Stock";
      else if (item.quantity <= 5) item.status = "Low Stock";
      else item.status = "In Stock";

      yardState.movements.unshift({
        id: `MV-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
        type: "Adjusted",
        sku: item.sku,
        qtyChange: delta >= 0 ? `+${delta}` : `${delta}`,
        prevStock: priorStock,
        newStock: item.quantity,
        user: yardState.activeOperator ? yardState.activeOperator.name : "Yard Specialist",
        reference: reason
      });
      sendYardToast(`Stock balance adjusted for ${item.sku}: ${priorStock} -> ${item.quantity}.`, "success");
    }

    transferModal.classList.add("hidden");
    renderInventoryCatalog();
    renderDashboardKPIs();
    renderLedgerLogs();
  });

  /* ==========================================================================
     MODULE 6: MOVEMENT LEDGER & CSV EXPORT[cite: 1]
     ========================================================================== */
  function renderLedgerLogs() {
    const searchVal = document.getElementById("vly-ledger-search").value.toLowerCase();
    const typeVal = document.getElementById("vly-filter-ledger-type").value;
    const tbody = document.getElementById("vly-ledger-table-rows");
    tbody.innerHTML = "";

    const matched = yardState.movements.filter((m) => {
      const matchSearch = m.sku.toLowerCase().includes(searchVal) ||
                          m.user.toLowerCase().includes(searchVal) ||
                          m.reference.toLowerCase().includes(searchVal);
      const matchType = typeVal === "ALL" || m.type === typeVal;
      return matchSearch && matchType;
    });

    matched.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.timestamp}</td>
        <td><span class="tag-status ${resolveStatusBadge(m.type)}">${m.type}</span></td>
        <td><code class="mono">${m.sku}</code></td>
        <td style="font-weight:700;">${m.qtyChange}</td>
        <td>${m.prevStock}</td>
        <td><strong>${m.newStock}</strong></td>
        <td>${m.user}</td>
        <td class="mono">${m.reference}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("vly-ledger-search").addEventListener("input", renderLedgerLogs);
  document.getElementById("vly-filter-ledger-type").addEventListener("change", renderLedgerLogs);

  document.getElementById("btn-export-vly-ledger").addEventListener("click", () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Transaction ID,Timestamp,Movement Type,SKU,Delta Qty,Prior Stock,Updated Stock,Operator,Reference Docket\n";
    yardState.movements.forEach((m) => {
      csvContent += `"${m.id}","${m.timestamp}","${m.type}","${m.sku}","${m.qtyChange}","${m.prevStock}","${m.newStock}","${m.user}","${m.reference}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VLY-Movement-Ledger-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    sendYardToast("Yard audit movements compiled to CSV format.", "info");
  });

  /* ==========================================================================
     MODULE 7: REPORTS & BROADCASTS[cite: 1]
     ========================================================================== */
  function renderBroadcastList() {
    const deck = document.getElementById("vly-full-alerts-list");
    deck.innerHTML = "";
    yardState.alerts.forEach((a) => {
      const li = document.createElement("li");
      li.style.padding = "0.85rem";
      li.style.borderBottom = "1px solid var(--vly-border-dim)";
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.innerHTML = `
        <div>
          <span class="tag-status ${resolveStatusBadge(a.type)}">${a.type}</span>
          <span style="margin-left:0.6rem; font-weight:${a.read ? 'normal' : 'bold'};">${a.message}</span>
        </div>
        <small style="color:var(--vly-text-subtle);">${a.time}</small>
      `;
      deck.appendChild(li);
    });

    const unreadCount = yardState.alerts.filter((a) => !a.read).length;
    document.getElementById("vly-active-alert-pill").textContent = unreadCount;
  }

  document.getElementById("btn-clear-all-alerts").addEventListener("click", () => {
    yardState.alerts.forEach((a) => (a.read = true));
    renderBroadcastList();
    renderBeaconDropdown();
    sendYardToast("All yard broadcasts marked as acknowledged.", "info");
  });

  function toggleReportSubpane(paneId) {
    document.querySelectorAll(".tab-pill, .tab-pane-btn").forEach((b) => b.classList.remove("active"));
    if (paneId === "subpane-vly-alerts") {
      document.querySelector(`.tab-pill[data-pane="subpane-vly-alerts"]`).classList.add("active");
      document.getElementById("subpane-vly-alerts").classList.remove("hidden");
      document.getElementById("subpane-vly-reports").classList.add("hidden");
    } else {
      document.getElementById("subpane-vly-alerts").classList.add("hidden");
      document.getElementById("subpane-vly-reports").classList.remove("hidden");
    }
  }

  document.querySelector(`.tab-pill[data-pane="subpane-vly-alerts"]`).addEventListener("click", () => {
    toggleReportSubpane("subpane-vly-alerts");
  });

  function renderReportTable(reportType) {
    toggleReportSubpane("subpane-vly-reports");
    const container = document.getElementById("report-table-container");
    const title = document.getElementById("report-view-title");
    const sub = document.getElementById("report-view-sub");

    document.querySelectorAll(".tab-pane-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.report === reportType);
    });

    if (reportType === "rep-inventory") {
      title.textContent = "Master Inventory Balance Report";
      sub.textContent = `Consolidated tally of all ${yardState.inventory.length} active warehouse product lines.`;
      container.innerHTML = `
        <table class="grid-table compact">
          <thead>
            <tr><th>SKU</th><th>Name</th><th>Category</th><th>Bay</th><th>Stock</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${yardState.inventory.map((i) => `
              <tr>
                <td class="mono">${i.sku}</td><td>${i.name}</td><td>${i.category}</td>
                <td class="mono">${i.location}</td><td style="font-weight:700;">${i.quantity}</td>
                <td><span class="tag-status ${resolveStatusBadge(i.status)}">${i.status}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else if (reportType === "rep-lowstock") {
      const lowItems = yardState.inventory.filter((i) => i.quantity <= 5);
      title.textContent = "Critical Low Stock & Deficit Report";
      sub.textContent = `${lowItems.length} items currently breaching minimum inventory safety buffer.`;
      container.innerHTML = `
        <table class="grid-table compact">
          <thead>
            <tr><th>SKU</th><th>Name</th><th>Storage Bay</th><th>Available</th><th>Threshold Status</th></tr>
          </thead>
          <tbody>
            ${lowItems.map((i) => `
              <tr>
                <td class="mono">${i.sku}</td><td>${i.name}</td><td class="mono">${i.location}</td>
                <td class="alert-txt">${i.quantity}</td>
                <td><span class="tag-status ${resolveStatusBadge(i.status)}">${i.status}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else if (reportType === "rep-movements") {
      title.textContent = "Quarterly Stock Movement Audit Log";
      sub.textContent = `All chronological movements across dock receipts, order releases, and transfers.`;
      container.innerHTML = `
        <table class="grid-table compact">
          <thead>
            <tr><th>Time</th><th>Type</th><th>SKU</th><th>Delta</th><th>Prior</th><th>Balance</th><th>Reference</th></tr>
          </thead>
          <tbody>
            ${yardState.movements.map((m) => `
              <tr>
                <td>${m.timestamp}</td><td><span class="tag-status ${resolveStatusBadge(m.type)}">${m.type}</span></td>
                <td class="mono">${m.sku}</td><td style="font-weight:700;">${m.qtyChange}</td>
                <td>${m.prevStock}</td><td>${m.newStock}</td><td class="mono">${m.reference}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else if (reportType === "rep-orders") {
      title.textContent = "Outbound Order Fulfillment Report";
      sub.textContent = `Current status of all client shipments and dock releases.`;
      container.innerHTML = `
        <table class="grid-table compact">
          <thead>
            <tr><th>Order ID</th><th>Customer Target</th><th>Destination</th><th>Date</th><th>Phase Status</th></tr>
          </thead>
          <tbody>
            ${yardState.orders.map((o) => `
              <tr>
                <td class="mono">${o.orderId}</td><td>${o.customer}</td><td>${o.destination}</td>
                <td>${o.date}</td><td><span class="tag-status ${resolveStatusBadge(o.status)}">${o.status}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }
  }

  document.querySelectorAll(".tab-pane-btn").forEach((btn) => {
    btn.addEventListener("click", () => renderReportTable(btn.dataset.report));
  });

  document.getElementById("btn-compute-yard-audit").addEventListener("click", () => {
    triggerVisualLoader(600, () => {
      renderReportTable("rep-inventory");
      sendYardToast("Consolidated master warehouse report computed.", "success");
    });
  });

  document.getElementById("btn-print-report").addEventListener("click", () => {
    window.print();
  });

  /* ==========================================================================
     GLOBAL INITIALIZATION
     ========================================================================== */
  function renderAllTerminalData() {
    renderDashboardKPIs();
    renderInventoryCatalog();
    fillReceivingDropdown();
    fillAdjustmentDropdown();
    renderOrderDeck();
    renderLedgerLogs();
    renderBroadcastList();
  }
});