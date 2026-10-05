// Stockroom inventory app.
// Each HTML page chooses its view using <body data-page="...">.
// Product fields: qty = quantity, min = reorder level, price = unit cost in PHP.

const currentPage = document.body.dataset.page;
const STORAGE_KEY = 'stockroom-v1';

const sampleInventory = {
    products: [
        { id: 'INV-001', name: 'Wireless keyboard', category: 'Electronics', qty: 48, min: 10, price: 1290 },
        { id: 'INV-002', name: 'USB-C hub', category: 'Electronics', qty: 8, min: 12, price: 1890 },
        { id: 'INV-003', name: 'Desk organizer', category: 'Office', qty: 64, min: 15, price: 450 },
        { id: 'INV-004', name: 'Notebook set', category: 'Office', qty: 120, min: 25, price: 280 },
        { id: 'INV-005', name: 'LED desk lamp', category: 'Furniture', qty: 0, min: 8, price: 1650 },
        { id: 'INV-006', name: 'Ergonomic chair', category: 'Furniture', qty: 18, min: 5, price: 6500 }
    ],
    movements: []
};

const pageDetails = {
    dashboard: { title: 'Overview', description: 'Your inventory, at a glance.' },
    products: { title: 'Products', description: 'Manage your catalog and keep every item in view.' },
    movements: { title: 'Stock movements', description: 'Track what comes in and what goes out.' },
    reports: { title: 'Reports', description: 'A clear view of your stock and inventory value.' }
};

const navigationLinks = [
    { page: 'dashboard', file: 'index.html', label: 'Overview' },
    { page: 'products', file: 'products.html', label: 'Products' },
    { page: 'movements', file: 'movements.html', label: 'Stock movements' },
    { page: 'reports', file: 'reports.html', label: 'Reports' }
];

// 1. Load and save inventory using browser storage.
function isInventoryData(value) {
    return value && Array.isArray(value.products) && Array.isArray(value.movements);
}

function loadInventory() {
    try {
        const savedInventory = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (isInventoryData(savedInventory)) {
            return savedInventory;
        }
    } catch {
        // Missing or unreadable storage should not prevent the demo from opening.
    }
    return structuredClone(sampleInventory);
}

let inventory = loadInventory();
let notificationTimer;

function saveInventory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
        return true;
    } catch {
        showNotification('Browser storage is unavailable. Changes are kept for this page only.');
        return false;
    }
}

// 2. Small helpers used by all pages.
function formatMoney(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0
    }).format(amount);
}

// Escape user-entered text before inserting it into an HTML template.
function escapeHtml(value) {
    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return String(value).replace(/[&<>"']/g, character => htmlEntities[character]);
}

function getStockStatus(product) {
    if (product.qty === 0) return 'Out of stock';
    if (product.qty <= product.min) return 'Low stock';
    return 'In stock';
}

function getStockBadgeClass(product) {
    if (product.qty === 0) return 'out';
    if (product.qty <= product.min) return 'low';
    return '';
}

function showNotification(message) {
    const notification = document.querySelector('.toast');
    notification.textContent = message;
    clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => {
        notification.textContent = '';
    }, 4000);
}

function getCategoryTotals() {
    const categoryNames = [...new Set(inventory.products.map(product => product.category))];
    return categoryNames.map(categoryName => ({
        name: categoryName,
        units: inventory.products
            .filter(product => product.category === categoryName)
            .reduce((total, product) => total + product.qty, 0)
    }));
}

// 3. Shared layout: sidebar, page heading, dialog, and notification area.
function renderLayout() {
    const details = pageDetails[currentPage];
    let primaryButtonText = 'Export inventory';
    if (currentPage === 'products') primaryButtonText = '+ Add product';
    if (currentPage === 'movements') primaryButtonText = '+ Record movement';

    const navigationHtml = navigationLinks.map(link => {
        const isActive = currentPage === link.page;
        return `
            <a href="${link.file}" class="${isActive ? 'active' : ''}"
               ${isActive ? 'aria-current="page"' : ''}>
                ${link.label}
            </a>`;
    }).join('');

    document.querySelector('#app').innerHTML = `
        <aside class="sidebar">
            <a class="brand" href="index.html">stock<span>room.</span></a>
            <div class="nav-label">WORKSPACE</div>
            <nav>${navigationHtml}</nav>
            <footer>Sample workspace<br>Local inventory &middot; PHP</footer>
        </aside>
        <main class="workspace">
            <div class="topbar">
                <span>Workspace / ${details.title}</span>
                <div class="avatar" aria-label="Sample workspace">SR</div>
            </div>
            <div class="heading">
                <div>
                    <div class="eyebrow">INVENTORY MANAGEMENT</div>
                    <h1>${details.title}</h1>
                    <p>${details.description}</p>
                </div>
                <button id="primary">${primaryButtonText}</button>
            </div>
            <div id="content"></div>
            <p class="footnote">
                Demo inventory &middot; Changes are saved in this browser.
                Export a CSV to keep a copy.
            </p>
        </main>
        <dialog id="editor"></dialog>
        <div class="toast" role="status" aria-live="polite"></div>`;
}

// 4. Reusable pieces: summary cards, product tables, and category charts.
function buildSummaryCards() {
    const totalUnits = inventory.products.reduce((total, product) => total + product.qty, 0);
    const inventoryValue = inventory.products.reduce((total, product) => total + product.qty * product.price, 0);
    const lowStockCount = inventory.products.filter(product => product.qty <= product.min).length;

    const summaries = [
        { label: 'Total products', value: inventory.products.length, hint: 'Across your catalog' },
        { label: 'Units in stock', value: totalUnits, hint: 'Available inventory' },
        { label: 'Inventory value', value: formatMoney(inventoryValue), hint: 'Based on unit cost' },
        { label: 'Needs attention', value: lowStockCount, hint: 'At or below reorder level' }
    ];

    return `<div class="stats">${summaries.map(summary => `
        <div class="card stat">
            <div class="label">${summary.label}</div>
            <strong>${summary.value}</strong>
            <div class="hint">${summary.hint}</div>
        </div>`).join('')}</div>`;
}

function buildProductRows(products) {
    if (products.length === 0) {
        return '<tr><td colspan="5" class="empty">No products match your filters.</td></tr>';
    }
    return products.map(product => `
        <tr>
            <td><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.id)}</small></td>
            <td>${escapeHtml(product.category)}</td>
            <td>${product.qty}</td>
            <td>${formatMoney(product.price)}</td>
            <td><span class="badge ${getStockBadgeClass(product)}">${getStockStatus(product)}</span></td>
        </tr>`).join('');
}

function buildProductTable(products) {
    return `
        <div class="table-wrap">
            <table>
                <thead>
                    <tr><th>PRODUCT / SKU</th><th>CATEGORY</th><th>QUANTITY</th><th>UNIT COST</th><th>STATUS</th></tr>
                </thead>
                <tbody id="product-rows">${buildProductRows(products)}</tbody>
            </table>
        </div>`;
}

function buildCategoryCharts() {
    const categories = getCategoryTotals();
    // Use a minimum of 1 to avoid dividing by zero when all stock is empty.
    const largestCategory = Math.max(1, ...categories.map(category => category.units));
    const totalUnits = Math.max(1, categories.reduce((total, category) => total + category.units, 0));

    const barsHtml = categories.map(category => {
        const barHeight = Math.max(1, category.units / largestCategory * 160);
        return `
            <div class="bar-group">
                <span>${category.units}</span>
                <div class="bar" style="height:${barHeight}px"
                     aria-label="${escapeHtml(category.name)}: ${category.units} units"></div>
                <span>${escapeHtml(category.name)}</span>
            </div>`;
    }).join('');

    const mixHtml = categories.map(category => {
        const percentage = category.units / totalUnits * 100;
        return `
            <div class="category">
                <div class="row"><span>${escapeHtml(category.name)}</span><b>${Math.round(percentage)}%</b></div>
                <div class="track"><div class="fill" style="width:${percentage}%"></div></div>
            </div>`;
    }).join('');

    return `
        <div class="grid">
            <section class="card">
                <div class="panel-heading">
                    <div><h2>Stock by category</h2><p>Available units across your catalog</p></div>
                </div>
                <div class="chart">${barsHtml}</div>
                <div class="legend">Current inventory &middot; Live totals</div>
            </section>
            <section class="card">
                <h2>Inventory mix</h2><p>Share of available units</p>
                ${mixHtml}
            </section>
        </div>`;
}

// 5. Page-specific content. Rendering replaces only the main content area.
function renderOverviewPage() {
    const isReport = currentPage === 'reports';
    const lowStockProducts = inventory.products.filter(product => product.qty <= product.min);
    const visibleProducts = isReport ? lowStockProducts : inventory.products.slice(0, 6);
    const noticeHtml = lowStockProducts.length ? `
        <div class="notice">
            ${lowStockProducts.length} products need attention.
            <a href="products.html">Review your inventory &rarr;</a>
        </div>` : '';

    return buildSummaryCards() + noticeHtml + buildCategoryCharts() + `
        <section class="card">
            <div class="panel-heading">
                <div>
                    <h2>${isReport ? 'Reorder report' : 'Product overview'}</h2>
                    <p>${isReport ? 'Items at or below their reorder level' : 'A snapshot of your current stock'}</p>
                </div>
                <a href="products.html">View all products &rarr;</a>
            </div>
            ${buildProductTable(visibleProducts)}
        </section>`;
}

function renderProductsPage() {
    const categoryOptions = getCategoryTotals()
        .map(category => `<option>${escapeHtml(category.name)}</option>`).join('');
    return buildSummaryCards() + `
        <section class="card">
            <div class="toolbar">
                <input id="search" type="search" placeholder="Search products or SKU&hellip;" aria-label="Search products">
                <select id="category" aria-label="Filter category">
                    <option value="">All categories</option>${categoryOptions}
                </select>
                <select id="status" aria-label="Filter status">
                    <option value="">All statuses</option>
                    <option>In stock</option><option>Low stock</option><option>Out of stock</option>
                </select>
            </div>
            ${buildProductTable(inventory.products)}
        </section>`;
}

function filterProducts() {
    const searchTerm = document.querySelector('#search').value.toLowerCase();
    const selectedCategory = document.querySelector('#category').value;
    const selectedStatus = document.querySelector('#status').value;
    const matchingProducts = inventory.products.filter(product => {
        const searchableText = (product.name + ' ' + product.id).toLowerCase();
        const matchesSearch = searchableText.includes(searchTerm);
        const matchesCategory = !selectedCategory || product.category === selectedCategory;
        const matchesStatus = !selectedStatus || getStockStatus(product) === selectedStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });
    document.querySelector('#product-rows').innerHTML = buildProductRows(matchingProducts);
}

function renderMovementsPage() {
    // Reverse a copy so the newest record is first without changing saved order.
    const movementRows = inventory.movements.slice().reverse().map(movement => {
        const isStockIn = movement.type === 'in';
        return `
            <tr>
                <td>${escapeHtml(movement.name)}</td>
                <td><span class="badge ${isStockIn ? '' : 'low'}">${isStockIn ? 'Stock in' : 'Stock out'}</span></td>
                <td>${isStockIn ? '+' : '&minus;'}${movement.qty}</td>
                <td>${escapeHtml(new Date(movement.date).toLocaleString())}</td>
                <td>${escapeHtml(movement.note || '\u2014')}</td>
            </tr>`;
    }).join('');

    return buildSummaryCards() + `
        <section class="card">
            <div class="panel-heading">
                <div><h2>Movement history</h2><p>Every recorded adjustment, in one place</p></div>
            </div>
            <div class="table-wrap">
                <table>
                    <thead><tr><th>PRODUCT</th><th>TYPE</th><th>UNITS</th><th>DATE</th><th>NOTE</th></tr></thead>
                    <tbody>${movementRows || '<tr><td colspan="5" class="empty">No movements yet. Record your first stock adjustment above.</td></tr>'}</tbody>
                </table>
            </div>
        </section>`;
}

function renderCurrentPage() {
    const content = document.querySelector('#content');
    switch (currentPage) {
        case 'products':
            content.innerHTML = renderProductsPage();
            // New form controls need listeners each time this page is rendered.
            ['search', 'category', 'status'].forEach(id => {
                document.getElementById(id).addEventListener('input', filterProducts);
            });
            break;
        case 'movements':
            content.innerHTML = renderMovementsPage();
            break;
        default:
            content.innerHTML = renderOverviewPage();
    }
}

// 6. Editor forms: adding a product or recording a stock movement.
function buildProductFields() {
    return `
        <label>Product name<input name="name" required maxlength="80"></label>
        <label>Category
            <select name="category"><option>Electronics</option><option>Office</option><option>Furniture</option><option>Other</option></select>
        </label>
        <label>Unit cost (PHP)<input name="price" type="number" min="0" max="100000000" step="0.01" required></label>
        <label>Reorder level<input name="min" type="number" min="0" max="1000000" step="1" value="10" required></label>`;
}

function buildMovementFields() {
    const productOptions = inventory.products.map(product => `
        <option value="${escapeHtml(product.id)}">${escapeHtml(product.name)} (${product.qty} available)</option>`).join('');
    return `
        <label>Product<select name="id" required>${productOptions}</select></label>
        <label>Movement type
            <select name="type"><option value="in">Stock in</option><option value="out">Stock out</option></select>
        </label>`;
}

function openEditor() {
    const dialog = document.querySelector('#editor');
    const isAddingProduct = currentPage === 'products';
    dialog.innerHTML = `
        <form id="edit-form">
            <h2>${isAddingProduct ? 'Add product' : 'Record movement'}</h2>
            ${isAddingProduct ? buildProductFields() : buildMovementFields()}
            <label>${isAddingProduct ? 'Starting quantity' : 'Quantity'}
                <input name="qty" type="number" min="${isAddingProduct ? 0 : 1}" max="1000000" step="1" required>
            </label>
            ${isAddingProduct ? '' : '<label>Note<input name="note" maxlength="150" placeholder="Delivery, sale, adjustment&hellip;"></label>'}
            <div class="actions">
                <button type="button" class="secondary" id="cancel">Cancel</button>
                <button type="submit">Save ${isAddingProduct ? 'product' : 'movement'}</button>
            </div>
        </form>`;
    dialog.querySelector('#cancel').onclick = () => dialog.close();
    dialog.querySelector('form').onsubmit = handleEditorSubmit;
    dialog.showModal();
}

function getNextProductId() {
    let nextNumber = 1;
    // Find an unused SKU, including if there are gaps in existing numbers.
    while (inventory.products.some(product => product.id === 'INV-' + String(nextNumber).padStart(3, '0'))) {
        nextNumber++;
    }
    return 'INV-' + String(nextNumber).padStart(3, '0');
}

function addProduct(fields, quantity) {
    const productName = fields.get('name').trim();
    if (!productName) {
        showNotification('Enter a product name.');
        return false;
    }
    inventory.products.push({
        id: getNextProductId(),
        name: productName,
        category: fields.get('category'),
        price: Number(fields.get('price')),
        min: Number(fields.get('min')),
        qty: quantity
    });
    return true;
}

function recordMovement(fields, quantity) {
    const product = inventory.products.find(item => item.id === fields.get('id'));
    if (!product || quantity < 1) {
        showNotification('Select a product and valid quantity.');
        return false;
    }
    const movementType = fields.get('type');
    if (movementType === 'out' && quantity > product.qty) {
        showNotification('Not enough stock for this movement.');
        return false;
    }

    // Update the current stock and store a history record of the adjustment.
    product.qty += movementType === 'in' ? quantity : -quantity;
    inventory.movements.push({
        name: product.name,
        type: movementType,
        qty: quantity,
        date: new Date().toISOString(),
        note: fields.get('note').trim()
    });
    return true;
}

function handleEditorSubmit(event) {
    event.preventDefault();
    const fields = new FormData(event.target);
    const quantity = Number(fields.get('qty'));
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
        showNotification('Enter a valid whole-number quantity.');
        return;
    }

    const isAddingProduct = currentPage === 'products';
    const succeeded = isAddingProduct ? addProduct(fields, quantity) : recordMovement(fields, quantity);
    if (!succeeded) return;

    const savedToBrowser = saveInventory();
    document.querySelector('#editor').close();
    renderCurrentPage();
    if (savedToBrowser) {
        showNotification(isAddingProduct ? 'Product added successfully.' : 'Stock updated successfully.');
    }
}

// 7. CSV export: quote every cell and prevent spreadsheet formula execution.
function formatCsvCell(value) {
    const safeValue = String(value)
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replace(/"/g, '""');
    return '"' + safeValue + '"';
}

function exportInventoryCsv() {
    const rows = [
        ['SKU', 'Product', 'Category', 'Quantity', 'Unit cost', 'Reorder level'],
        ...inventory.products.map(product => [
            product.id, product.name, product.category, product.qty, product.price, product.min
        ])
    ];
    const csv = rows.map(row => row.map(formatCsvCell).join(',')).join('\r\n');
    // The UTF-8 marker helps spreadsheet apps display non-ASCII names correctly.
    const file = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(file);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = 'stockroom-inventory.csv';
    downloadLink.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    showNotification('Inventory exported.');
}

// 8. Startup and synchronization with other open inventory tabs.
renderLayout();
renderCurrentPage();

const primaryButton = document.querySelector('#primary');
primaryButton.onclick = currentPage === 'products' || currentPage === 'movements'
    ? openEditor
    : exportInventoryCsv;

window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return;
    try {
        const updatedInventory = JSON.parse(event.newValue);
        if (isInventoryData(updatedInventory)) {
            inventory = updatedInventory;
            renderCurrentPage();
        }
    } catch {
        // Ignore an unreadable update and keep displaying the current inventory.
    }
});