# Understanding the inventory code

Start with `index.html`. Each HTML file loads `inventory.css` and `inventory.js`.
The body's `data-page` value tells JavaScript which view to display:

- `index.html`: dashboard
- `products.html`: product catalog
- `movements.html`: stock movement history
- `reports.html`: reorder report

## inventory.js

Read the numbered sections from top to bottom:

1. **Storage** loads saved products and movements from localStorage, or uses sample data.
2. **Helpers** format prices, escape text, determine stock status, and calculate category totals.
3. **Layout** creates the shared sidebar, heading, dialog, and notification area.
4. **Reusable pieces** build summary cards, tables, and charts as HTML strings.
5. **Pages** choose the main content and apply product filters.
6. **Forms** validate entries, add products, and record stock changes.
7. **Export** creates a CSV download.
8. **Startup** draws the page, connects the main button, and listens for changes from other tabs.

A product has these fields:

- `id`: its SKU, such as INV-001
- `name`: product name
- `category`: product group
- `qty`: current quantity
- `min`: reorder level (stock at or below this number needs attention)
- `price`: cost per unit in Philippine pesos

The `qty` and `min` names are kept so existing saved data still works.

When a form is saved, the code updates `inventory`, saves it to browser storage,
and redraws the main content. A stock-out movement cannot exceed available stock.

`build...` functions return HTML strings. `render...Page` functions prepare page
content; `renderCurrentPage` inserts that content into the document. Template
literals (backtick strings) use `${expression}` to insert values into HTML.

## inventory.css

Styles are grouped into navigation, workspace, summary cards, charts, tables,
dialogs, and animations. Media queries near the bottom adjust the layout for
smaller screens and respect reduced-motion preferences.

## Common edits

- Change starter products: edit `sampleInventory` in inventory.js. Existing browser
  data takes priority over sample data.
- Change page titles: edit `pageDetails`.
- Change navigation links: edit `navigationLinks`.
- Change colors or spacing: edit the relevant rule in inventory.css.

This is a browser-based demo. Data is saved locally; there is no server database.