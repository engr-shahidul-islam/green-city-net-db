// Default System Database State
let db = {
    users: [
        { username: "shahidul@gcn.net", password: "gcn2011514", role: "Admin" },
        { username: "manager@gcn.net", password: "gcn2011514", role: "Manager" }
    ],
    customers: [
        {
            id: "GCN-1001",
            name: "Md. Shahidul Islam",
            phone: "01712345678",
            address: "House 15, Green Road, Dhaka",
            package: "20 Mbps Gamer Ultimate",
            bill: 1200,
            advance: 1200,
            datetime: "2026-01-01T10:00",
            status: "Active",
            disconnectDate: null
        },
        {
            id: "GCN-1002",
            name: "Tanvir Ahmed",
            phone: "01898765432",
            address: "Block B, Green City Housing",
            package: "10 Mbps Turbo Speed",
            bill: 800,
            advance: 0,
            datetime: "2026-02-15T14:30",
            status: "Active",
            disconnectDate: null
        },
        {
            id: "GCN-1003",
            name: "Rafiqul Islam",
            phone: "01911223344",
            address: "Flat 4A, Lane 2, Green City",
            package: "5 Mbps Home Standard",
            bill: 500,
            advance: 0,
            datetime: "2025-11-10T11:00",
            status: "Disconnected",
            disconnectDate: "2026-02-28 18:00"
        }
    ],
    billingHistory: [
        {
            id: "PAY-901",
            custId: "GCN-1001",
            custName: "Md. Shahidul Islam",
            month: "September",
            year: "2026",
            paid: 1200,
            due: 0,
            method: "bKash",
            date: "2026-09-02 11:20",
            collectedBy: "shahidul@gcn.net"
        },
        {
            id: "PAY-902",
            custId: "GCN-1002",
            custName: "Tanvir Ahmed",
            month: "August",
            year: "2026",
            paid: 800,
            due: 0,
            method: "Cash",
            date: "2026-08-05 16:45",
            collectedBy: "manager@gcn.net"
        }
    ],
    logs: [
        { timestamp: "2026-09-01 09:00", user: "System", action: "System Initialization", details: "Green City Net Started" }
    ],
    ghConfig: {
        token: "",
        owner: "",
        repo: "",
        path: "data/db.json",
        branch: "main"
    }
};

let currentUser = null;

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    loadLocalState();
    startLiveClock();
    setupMobileMenu();
    checkSession();
});

function loadLocalState() {
    const saved = localStorage.getItem('GCN_ISP_DB');
    if (saved) {
        try {
            db = JSON.parse(saved);
        } catch(e) {
            console.error("Local storage parse error", e);
        }
    }
}

function saveStateAndSync() {
    localStorage.setItem('GCN_ISP_DB', JSON.stringify(db));
    updateGitHubStatusBadge();
    // Auto sync to GitHub if PAT configured
    if (db.ghConfig && db.ghConfig.token && db.ghConfig.owner && db.ghConfig.repo) {
        autoPushToGitHub();
    }
}

async function autoPushToGitHub() {
    const cfg = db.ghConfig;
    if (!cfg.token || !cfg.owner || !cfg.repo) return;

    const syncDot = document.getElementById('syncDot');
    const syncText = document.getElementById('syncText');
    if(syncDot) syncDot.className = "w-2 h-2 rounded-full bg-blue-400 animate-ping";
    if(syncText) syncText.textContent = "Syncing to GitHub...";

    try {
        // 1. Get SHA if file exists
        const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${cfg.branch || 'main'}`;
        const getRes = await fetch(url, {
            headers: { 'Authorization': `token ${cfg.token}` }
        });

        let sha = "";
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }

        // 2. Put / Commit Data
        const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(db, null, 2))));
        const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${cfg.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Auto update from Green City Net Web App [${new Date().toLocaleString()}]`,
                content: contentEncoded,
                sha: sha || undefined,
                branch: cfg.branch || 'main'
            })
        });

        if (putRes.ok) {
            if(syncDot) syncDot.className = "w-2 h-2 rounded-full bg-emerald-400";
            if(syncText) syncText.textContent = "GitHub Synced";
        } else {
            throw new Error("GitHub PUT failed");
        }
    } catch (err) {
        console.warn("GitHub sync attempt:", err);
        if(syncDot) syncDot.className = "w-2 h-2 rounded-full bg-rose-500";
        if(syncText) syncText.textContent = "Sync Pending / Error";
    }
}

function updateGitHubStatusBadge() {
    const cfg = db.ghConfig || {};
    const syncDot = document.getElementById('syncDot');
    const syncText = document.getElementById('syncText');
    if (!syncDot || !syncText) return;

    if (cfg.token && cfg.owner && cfg.repo) {
        syncDot.className = "w-2 h-2 rounded-full bg-emerald-400";
        syncText.textContent = "GitHub Connected";
    } else {
        syncDot.className = "w-2 h-2 rounded-full bg-amber-400";
        syncText.textContent = "Local Storage Only";
    }
}

async function triggerGitHubSync() {
    const icon = document.getElementById('syncIconBtn');
    if(icon) icon.classList.add('fa-spin');
    await autoPushToGitHub();
    setTimeout(() => { if(icon) icon.classList.remove('fa-spin'); }, 800);
}

function checkSession() {
    if (!currentUser) {
        document.getElementById('loginModal').classList.remove('hidden');
    } else {
        document.getElementById('loginModal').classList.add('hidden');
        updateNavUserDisplay();
        applyRolePermissions();
        renderAllData();
    }
}

function updateNavUserDisplay() {
    if (currentUser) {
        document.getElementById('navUsername').textContent = currentUser.username;
        document.getElementById('navRoleBadge').textContent = currentUser.role;
        document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();

    const found = db.users.find(x => x.username.toLowerCase() === u.toLowerCase() && x.password === p);
    if (found) {
        currentUser = found;
        document.getElementById('loginModal').classList.add('hidden');
        updateNavUserDisplay();
        
        logAction("User Login", `Logged in as ${found.role}`);
        applyRolePermissions();
        renderAllData();
    } else {
        alert("Invalid username or password! Please check credentials.");
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('loginModal').classList.remove('hidden');
});

function applyRolePermissions() {
    const adminElements = document.querySelectorAll('.admin-only');
    if (currentUser && currentUser.role === 'Admin') {
        adminElements.forEach(el => el.classList.remove('hidden'));
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
    }
}

function switchTab(tabId) {
    // Guard manager from admin tabs
    if (currentUser && currentUser.role !== 'Admin' && (tabId === 'admin-panel' || tabId === 'activity-logs' || tabId === 'github-settings')) {
        alert("Access Denied! Manager account can only process billing and view customers.");
        return;
    }

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(el => {
        if (el.getAttribute('nav-target') === tabId) {
            el.classList.add('bg-brand-600', 'text-white');
            el.classList.remove('hover:bg-slate-800');
        } else {
            el.classList.remove('bg-brand-600', 'text-white');
            el.classList.add('hover:bg-slate-800');
        }
    });

    // Set Page Title
    const titles = {
        'dashboard': 'Dashboard & Customer Search',
        'new-customer': 'New Customer Entry',
        'active-customers': 'Active Customer Directory',
        'disconnected-customers': 'Disconnected Customer Records',
        'billing-collection': 'Monthly Billing & Payment History',
        'activity-logs': 'System Activity Audit Logs',
        'admin-panel': 'System User & Credentials Admin',
        'github-settings': 'GitHub JSON API Sync Setup'
    };
    document.getElementById('pageTitle').textContent = titles[tabId] || 'Green City Net';

    // Close mobile menu if open
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('sidebar').classList.remove('flex');
}

function updateDefaultBillAmount() {
    const pkg = document.getElementById('custPackage').value;
    const billInput = document.getElementById('custBill');
    if (pkg.includes('5 Mbps')) billInput.value = 500;
    else if (pkg.includes('10 Mbps')) billInput.value = 800;
    else if (pkg.includes('15 Mbps')) billInput.value = 1000;
    else if (pkg.includes('20 Mbps')) billInput.value = 1200;
    else if (pkg.includes('30 Mbps')) billInput.value = 1800;
}

function handleCustomerSubmit(e) {
    e.preventDefault();
    const newId = `GCN-${1000 + db.customers.length + 1}`;
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const pkg = document.getElementById('custPackage').value;
    const bill = parseFloat(document.getElementById('custBill').value) || 0;
    const advance = parseFloat(document.getElementById('custAdvance').value) || 0;
    const datetime = document.getElementById('custDateTime').value;

    const newCust = {
        id: newId,
        name,
        phone,
        address,
        package: pkg,
        bill,
        advance,
        datetime,
        status: "Active",
        disconnectDate: null
    };

    db.customers.push(newCust);

    // Log advanced payment if any
    if (advance > 0) {
        db.billingHistory.push({
            id: `PAY-${Math.floor(100 + Math.random() * 900)}`,
            custId: newId,
            custName: name,
            month: "Advance",
            year: new Date().getFullYear().toString(),
            paid: advance,
            due: 0,
            method: "Cash",
            date: new Date().toLocaleString(),
            collectedBy: currentUser.username
        });
    }

    logAction("Customer Added", `Registered ${name} (${newId})`);
    saveStateAndSync();
    document.getElementById('newCustomerForm').reset();
    alert(`Customer ${name} (${newId}) registered successfully!`);
    switchTab('active-customers');
    renderAllData();
}

function toggleCustomerStatus(custId, newStatus) {
    const cust = db.customers.find(c => c.id === custId);
    if (!cust) return;

    if (newStatus === 'Disconnected') {
        if (!confirm(`Are you sure you want to DISCONNECT line for ${cust.name}?`)) return;
        cust.status = 'Disconnected';
        cust.disconnectDate = new Date().toLocaleString();
        logAction("Customer Disconnected", `Line suspended for ${cust.name} (${cust.id})`);
    } else {
        if (!confirm(`Reconnect line for ${cust.name}?`)) return;
        cust.status = 'Active';
        cust.disconnectDate = null;
        logAction("Customer Reconnected", `Line reactivated for ${cust.name} (${cust.id})`);
    }

    saveStateAndSync();
    renderAllData();
    if (newStatus === 'Disconnected') {
        switchTab('disconnected-customers');
    } else {
        switchTab('active-customers');
    }
}

function removeCustomer(custId) {
    if (currentUser.role !== 'Admin') {
        alert("Only Admin can delete customer records!");
        return;
    }
    const cust = db.customers.find(c => c.id === custId);
    if (!cust) return;

    if (confirm(`PERMANENT DELETE: Are you sure you want to remove ${cust.name} (${cust.id}) completely?`)) {
        db.customers = db.customers.filter(c => c.id !== custId);
        logAction("Customer Removed", `Deleted ${cust.name} (${cust.id})`);
        saveStateAndSync();
        renderAllData();
    }
}

function openEditModal(custId) {
    const cust = db.customers.find(c => c.id === custId);
    if (!cust) return;

    document.getElementById('editCustId').value = cust.id;
    document.getElementById('editCustName').value = cust.name;
    document.getElementById('editCustPhone').value = cust.phone;
    document.getElementById('editCustAddress').value = cust.address;
    document.getElementById('editCustPackage').value = cust.package;
    document.getElementById('editCustBill').value = cust.bill;

    document.getElementById('editCustomerModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editCustomerModal').classList.add('hidden');
}

function saveCustomerEdit(e) {
    e.preventDefault();
    const id = document.getElementById('editCustId').value;
    const cust = db.customers.find(c => c.id === id);
    if (!cust) return;

    cust.name = document.getElementById('editCustName').value.trim();
    cust.phone = document.getElementById('editCustPhone').value.trim();
    cust.address = document.getElementById('editCustAddress').value.trim();
    cust.package = document.getElementById('editCustPackage').value;
    cust.bill = parseFloat(document.getElementById('editCustBill').value) || 0;

    logAction("Customer Updated", `Modified information for ${cust.name} (${id})`);
    saveStateAndSync();
    closeEditModal();
    renderAllData();
}

function autofillBillAmount() {
    const id = document.getElementById('billCollectCustId').value;
    const cust = db.customers.find(c => c.id === id);
    if (cust) {
        document.getElementById('billAmountPaid').value = cust.bill;
        document.getElementById('billAmountDue').value = 0;
    }
}

function handleBillCollection(e) {
    e.preventDefault();
    const custId = document.getElementById('billCollectCustId').value;
    const cust = db.customers.find(c => c.id === custId);
    if (!cust) return;

    const month = document.getElementById('billMonth').value;
    const year = document.getElementById('billYear').value;
    const paid = parseFloat(document.getElementById('billAmountPaid').value) || 0;
    const due = parseFloat(document.getElementById('billAmountDue').value) || 0;
    const method = document.getElementById('billPaymentMethod').value;
    const date = document.getElementById('billCollectDate').value || new Date().toLocaleString();

    const record = {
        id: `PAY-${Math.floor(100 + Math.random() * 900)}`,
        custId,
        custName: cust.name,
        month,
        year,
        paid,
        due,
        method,
        date: new Date(date).toLocaleString(),
        collectedBy: currentUser.username
    };

    db.billingHistory.unshift(record);
    logAction("Bill Collected", `Collected ৳${paid} for ${month} ${year} from ${cust.name}`);
    saveStateAndSync();
    document.getElementById('billingCollectForm').reset();
    alert(`Payment recorded successfully for ${cust.name}!`);
    renderAllData();
}

function handleHomeSearch() {
    const query = document.getElementById('homeSearchInput').value.trim().toLowerCase();
    const area = document.getElementById('homeSearchResultArea');
    const list = document.getElementById('searchResultsList');

    if (!query) {
        area.classList.add('hidden');
        return;
    }

    const matches = db.customers.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.id.toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query)
    );

    document.getElementById('searchCount').textContent = matches.length;

    if (matches.length === 0) {
        list.innerHTML = `<div class="col-span-full p-8 text-center text-slate-400 bg-white rounded-xl border">No matching customer records found for "${query}"</div>`;
    } else {
        list.innerHTML = matches.map(c => {
            const payments = db.billingHistory.filter(p => p.custId === c.id);
            const totalPaid = payments.reduce((acc, p) => acc + (p.paid || 0), 0);
            const totalDue = payments.reduce((acc, p) => acc + (p.due || 0), 0);

            return `
                <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 relative overflow-hidden">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border">${c.id}</span>
                            <h4 class="font-bold text-slate-800 text-base mt-1">${c.name}</h4>
                            <p class="text-xs text-slate-500"><i class="fa-solid fa-phone text-brand-600 mr-1"></i> ${c.phone}</p>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                            ${c.status}
                        </span>
                    </div>

                    <div class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl space-y-1">
                        <p><strong class="text-slate-700">Address:</strong> ${c.address}</p>
                        <p><strong class="text-slate-700">Package:</strong> ${c.package}</p>
                        <p><strong class="text-slate-700">Monthly Bill:</strong> ৳${c.bill}</p>
                        <p><strong class="text-slate-700">Joined:</strong> ${c.datetime ? new Date(c.datetime).toLocaleDateString() : 'N/A'}</p>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-center pt-1">
                        <div class="bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                            <span class="block text-[10px] text-emerald-600 font-bold uppercase">Total Paid</span>
                            <span class="text-sm font-bold text-emerald-700">৳${totalPaid + (c.advance || 0)}</span>
                        </div>
                        <div class="bg-rose-50 border border-rose-100 rounded-lg p-2">
                            <span class="block text-[10px] text-rose-600 font-bold uppercase">Current Due</span>
                            <span class="text-sm font-bold text-rose-700">৳${totalDue}</span>
                        </div>
                    </div>

                    <div class="pt-2 border-t flex justify-between items-center text-xs">
                        <span class="text-slate-400 text-[11px]">${payments.length} Payments Recorded</span>
                        <button onclick="quickPayFromSearch('${c.id}')" class="text-brand-600 hover:text-brand-700 font-bold flex items-center">
                            <i class="fa-solid fa-file-invoice-dollar mr-1"></i> Collect Bill
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    area.classList.remove('hidden');
}

function clearHomeSearch() {
    document.getElementById('homeSearchInput').value = '';
    document.getElementById('homeSearchResultArea').classList.add('hidden');
}

function quickPayFromSearch(custId) {
    switchTab('billing-collection');
    document.getElementById('billCollectCustId').value = custId;
    autofillBillAmount();
}

function openAddUserModal(index = -1) {
    document.getElementById('userEditIndex').value = index;
    if (index >= 0) {
        const u = db.users[index];
        document.getElementById('userModalTitle').textContent = "Modify User Credentials";
        document.getElementById('userEmail').value = u.username;
        document.getElementById('userPassword').value = u.password;
        document.getElementById('userRole').value = u.role;
    } else {
        document.getElementById('userModalTitle').textContent = "Add New System User";
        document.getElementById('addUserForm').reset();
    }
    document.getElementById('addUserModal').classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('addUserModal').classList.add('hidden');
}

function handleSaveUser(e) {
    e.preventDefault();
    const idx = parseInt(document.getElementById('userEditIndex').value);
    const username = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value.trim();
    const role = document.getElementById('userRole').value;

    if (idx >= 0) {
        db.users[idx] = { username, password, role };
        logAction("User Modified", `Updated credentials for ${username}`);
    } else {
        if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            alert("User email already exists!");
            return;
        }
        db.users.push({ username, password, role });
        logAction("User Created", `Added user ${username} (${role})`);
    }

    saveStateAndSync();
    closeUserModal();
    renderSystemUsers();
}

function deleteUserAccount(index) {
    const u = db.users[index];
    if (!u) return;
    if (u.username === currentUser.username) {
        alert("You cannot delete your own logged-in user account!");
        return;
    }

    if (confirm(`Remove user ${u.username}?`)) {
        db.users.splice(index, 1);
        logAction("User Deleted", `Removed account ${u.username}`);
        saveStateAndSync();
        renderSystemUsers();
    }
}

function saveGitHubConfig(e) {
    e.preventDefault();
    db.ghConfig = {
        token: document.getElementById('ghToken').value.trim(),
        owner: document.getElementById('ghOwner').value.trim(),
        repo: document.getElementById('ghRepo').value.trim(),
        path: document.getElementById('ghPath').value.trim() || 'data/db.json',
        branch: document.getElementById('ghBranch').value.trim() || 'main'
    };
    saveStateAndSync();
    alert("GitHub API credentials updated successfully!");
}

function testGitHubConnection() {
    triggerGitHubSync();
}

function renderAllData() {
    renderDashboardStats();
    renderRecentCustomers();
    renderActiveCustomers();
    renderDisconnectedCustomers();
    renderBillingCollectOptions();
    renderBillingHistory();
    renderActivityLogs();
    renderSystemUsers();
    populateGitHubForm();
    updateGitHubStatusBadge();
}

function renderDashboardStats() {
    const total = db.customers.length;
    const active = db.customers.filter(c => c.status === 'Active').length;
    const disconnected = db.customers.filter(c => c.status === 'Disconnected').length;

    const thisYear = new Date().getFullYear().toString();
    const totalCollected = db.billingHistory
        .filter(b => b.year === thisYear)
        .reduce((acc, b) => acc + (b.paid || 0), 0);

    const totalDuePending = db.billingHistory.reduce((acc, b) => acc + (b.due || 0), 0);

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statActive').textContent = active;
    document.getElementById('statDisconnected').textContent = disconnected;
    document.getElementById('statCollection').textContent = `৳ ${totalCollected.toLocaleString()}`;
    document.getElementById('statDueSummary').textContent = `৳${totalDuePending} Due pending`;
}

function renderRecentCustomers() {
    const table = document.getElementById('recentCustomersTable');
    const recent = [...db.customers].reverse().slice(0, 5);

    if (recent.length === 0) {
        table.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-slate-400 text-xs">No customers found.</td></tr>`;
        return;
    }

    table.innerHTML = recent.map(c => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4 font-bold text-slate-800">${c.id}</td>
            <td class="py-3 px-4">
                <span class="font-semibold text-slate-800 block">${c.name}</span>
                <span class="text-xs text-slate-400">${c.phone}</span>
            </td>
            <td class="py-3 px-4 text-xs text-slate-500">${c.address}</td>
            <td class="py-3 px-4 text-xs font-medium text-slate-700">${c.package}</td>
            <td class="py-3 px-4 font-bold text-brand-700">৳${c.bill}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${c.status}</span>
            </td>
            <td class="py-3 px-4 text-center space-x-1">
                <button onclick="openEditModal('${c.id}')" title="Edit Customer" class="text-slate-500 hover:text-brand-600 p-1"><i class="fa-solid fa-pen-to-square"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderActiveCustomers() {
    const table = document.getElementById('activeCustomersTable');
    const query = (document.getElementById('activeSearchInput')?.value || '').toLowerCase();

    const activeList = db.customers.filter(c => c.status === 'Active' && (
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.id.toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query)
    ));

    if (activeList.length === 0) {
        table.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400 text-xs">No active customers found matching filter.</td></tr>`;
        return;
    }

    table.innerHTML = activeList.map(c => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4 font-bold text-slate-800 text-xs">${c.id}</td>
            <td class="py-3 px-4">
                <span class="font-bold text-slate-800 text-xs block">${c.name}</span>
                <span class="text-[11px] text-slate-400"><i class="fa-solid fa-phone mr-1"></i>${c.phone}</span>
            </td>
            <td class="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">${c.address}</td>
            <td class="py-3 px-4 text-xs font-semibold text-slate-700">${c.package}</td>
            <td class="py-3 px-4 font-bold text-brand-700 text-xs">৳${c.bill}</td>
            <td class="py-3 px-4 text-xs text-slate-400">${c.datetime ? new Date(c.datetime).toLocaleDateString() : 'N/A'}</td>
            <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center space-x-2">
                    <button onclick="quickPayFromSearch('${c.id}')" title="Collect Bill" class="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition">
                        <i class="fa-solid fa-hand-holding-dollar"></i> Pay
                    </button>
                    <button onclick="openEditModal('${c.id}')" title="Edit Customer" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="toggleCustomerStatus('${c.id}', 'Disconnected')" title="Disconnect Line" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs transition">
                        <i class="fa-solid fa-plug-circle-xmark"></i>
                    </button>
                    ${currentUser && currentUser.role === 'Admin' ? `
                        <button onclick="removeCustomer('${c.id}')" title="Delete Customer" class="p-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-400 rounded-lg text-xs transition">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderDisconnectedCustomers() {
    const table = document.getElementById('disconnectedCustomersTable');
    const query = (document.getElementById('disconnectedSearchInput')?.value || '').toLowerCase();

    const discList = db.customers.filter(c => c.status === 'Disconnected' && (
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.id.toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query)
    ));

    if (discList.length === 0) {
        table.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400 text-xs">No disconnected customers found.</td></tr>`;
        return;
    }

    table.innerHTML = discList.map(c => `
        <tr class="hover:bg-slate-50 transition bg-rose-50/20">
            <td class="py-3 px-4 font-bold text-slate-800 text-xs">${c.id}</td>
            <td class="py-3 px-4">
                <span class="font-bold text-slate-800 text-xs block">${c.name}</span>
                <span class="text-[11px] text-slate-400">${c.phone}</span>
            </td>
            <td class="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">${c.address}</td>
            <td class="py-3 px-4 text-xs font-semibold text-slate-700">${c.package}</td>
            <td class="py-3 px-4 font-bold text-slate-700 text-xs">৳${c.bill}</td>
            <td class="py-3 px-4 text-xs text-rose-600 font-medium">${c.disconnectDate || 'N/A'}</td>
            <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center space-x-2">
                    <button onclick="toggleCustomerStatus('${c.id}', 'Active')" title="Reconnect Line" class="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition flex items-center">
                        <i class="fa-solid fa-plug-circle-check mr-1"></i> Connect
                    </button>
                    <button onclick="openEditModal('${c.id}')" title="Edit Customer" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    ${currentUser && currentUser.role === 'Admin' ? `
                        <button onclick="removeCustomer('${c.id}')" title="Delete Record" class="p-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-400 rounded-lg text-xs transition">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderBillingCollectOptions() {
    const select = document.getElementById('billCollectCustId');
    if (!select) return;

    const activeList = db.customers.filter(c => c.status === 'Active');
    select.innerHTML = '<option value="">-- Choose Active Customer --</option>' + 
        activeList.map(c => `<option value="${c.id}">${c.name} (${c.id}) - ৳${c.bill}</option>`).join('');
}

function renderBillingHistory() {
    const table = document.getElementById('billingHistoryTable');
    const query = (document.getElementById('billingHistorySearch')?.value || '').toLowerCase();

    const history = db.billingHistory.filter(b => 
        b.custName.toLowerCase().includes(query) ||
        b.custId.toLowerCase().includes(query) ||
        b.month.toLowerCase().includes(query) ||
        b.collectedBy.toLowerCase().includes(query)
    );

    if (history.length === 0) {
        table.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-slate-400 text-xs">No payment history found.</td></tr>`;
        return;
    }

    table.innerHTML = history.map(b => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-2.5 px-3 text-[11px] text-slate-500">${b.date}</td>
            <td class="py-2.5 px-3">
                <span class="font-bold text-slate-800 block">${b.custName}</span>
                <span class="text-[10px] text-slate-400">${b.custId}</span>
            </td>
            <td class="py-2.5 px-3 font-semibold text-slate-700">${b.month} ${b.year}</td>
            <td class="py-2.5 px-3 font-bold text-emerald-600">৳${b.paid}</td>
            <td class="py-2.5 px-3 font-bold ${b.due > 0 ? 'text-rose-600' : 'text-slate-400'}">৳${b.due}</td>
            <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">${b.method}</span></td>
            <td class="py-2.5 px-3 text-[11px] text-slate-500">${b.collectedBy}</td>
        </tr>
    `).join('');
}

function renderActivityLogs() {
    const table = document.getElementById('activityLogsTable');
    if (!table) return;

    table.innerHTML = db.logs.map(l => `
        <tr class="hover:bg-slate-50">
            <td class="py-2.5 px-3 text-[11px] text-slate-400 whitespace-nowrap">${l.timestamp}</td>
            <td class="py-2.5 px-3 font-semibold text-slate-700">${l.user}</td>
            <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">${l.action}</span></td>
            <td class="py-2.5 px-3 text-slate-600 text-xs">${l.details}</td>
        </tr>
    `).join('');
}

function clearActivityLogs() {
    if (confirm("Clear all activity logs?")) {
        db.logs = [];
        saveStateAndSync();
        renderActivityLogs();
    }
}

function renderSystemUsers() {
    const table = document.getElementById('systemUsersTable');
    if (!table) return;

    table.innerHTML = db.users.map((u, idx) => `
        <tr class="hover:bg-slate-50">
            <td class="py-3 px-4 font-bold text-slate-800">${u.username}</td>
            <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                    ${u.role}
                </span>
            </td>
            <td class="py-3 px-4 text-xs font-mono text-slate-500">•••••••• (${u.password})</td>
            <td class="py-3 px-4 text-center space-x-2">
                <button onclick="openAddUserModal(${idx})" class="text-indigo-600 hover:text-indigo-800 font-bold text-xs"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                <button onclick="deleteUserAccount(${idx})" class="text-rose-600 hover:text-rose-800 font-bold text-xs"><i class="fa-solid fa-trash-can"></i> Remove</button>
            </td>
        </tr>
    `).join('');
}

function populateGitHubForm() {
    const cfg = db.ghConfig || {};
    if(document.getElementById('ghToken')) document.getElementById('ghToken').value = cfg.token || '';
    if(document.getElementById('ghOwner')) document.getElementById('ghOwner').value = cfg.owner || '';
    if(document.getElementById('ghRepo')) document.getElementById('ghRepo').value = cfg.repo || '';
    if(document.getElementById('ghPath')) document.getElementById('ghPath').value = cfg.path || 'data/db.json';
    if(document.getElementById('ghBranch')) document.getElementById('ghBranch').value = cfg.branch || 'main';
}

function logAction(action, details) {
    db.logs.unshift({
        timestamp: new Date().toLocaleString(),
        user: currentUser ? currentUser.username : 'System',
        action,
        details
    });
}

// Clock & UI Helpers
function startLiveClock() {
    const clock = document.getElementById('liveClock');
    setInterval(() => {
        if (clock) clock.textContent = new Date().toLocaleString();
    }, 1000);
    
    // Set default datetime inputs
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const iso = now.toISOString().slice(0, 16);
    if(document.getElementById('custDateTime')) document.getElementById('custDateTime').value = iso;
    if(document.getElementById('billCollectDate')) document.getElementById('billCollectDate').value = iso;
}

function setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    btn.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        sidebar.classList.toggle('flex');
    });
}
