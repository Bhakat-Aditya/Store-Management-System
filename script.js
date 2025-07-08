import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { getDatabase, ref, push, update, remove, onValue } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";

// Your Firebase Config (replace with yours)
const firebaseConfig = {
    apiKey: "AIzaSyDS7bT4oLjH7IS9en9n6E6UrUJeJ3OAPHA",
    authDomain: "store-management-anshu.firebaseapp.com",
    databaseURL: "https://store-management-anshu-default-rtdb.firebaseio.com",
    projectId: "store-management-anshu",
    storageBucket: "store-management-anshu.appspot.com",
    messagingSenderId: "858551373452",
    appId: "1:858551373452:web:62cfa0056901a1bd3af5a9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const inventoryList = document.getElementById('inventoryList');
const addProductForm = document.getElementById('addProductForm');

// Inventory data
let inventory = [];

// Initialize the app
function initApp() {
    // Reference to the inventory in Firebase
    const inventoryRef = ref(database, 'inventory');

    // Load inventory from Firebase
    onValue(inventoryRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Convert object to array
            inventory = Object.keys(data).map(key => {
                return { id: key, ...data[key] };
            });
            displayInventory();
        } else {
            inventory = [];
            displayInventory();
        }
    });

    // Setup search functionality
    setupSearch();

    // Setup form submission
    setupAddProductForm();
}

// Setup search functionality
function setupSearch() {
    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();

        if (searchTerm.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        const results = inventory.filter(item =>
            item.name.toLowerCase().includes(searchTerm)
        );

        displaySearchResults(results);
    });

    // Close search results when clicking outside
    document.addEventListener('click', function (e) {
        if (e.target !== searchInput) {
            searchResults.style.display = 'none';
        }
    });
}

// Display search results
function displaySearchResults(results) {
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No products found</div>';
        searchResults.style.display = 'block';
        return;
    }

    searchResults.innerHTML = '';
    results.forEach(item => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.innerHTML = `
            <strong>${item.name}</strong> - $${item.price.toFixed(2)}
        `;
        resultItem.addEventListener('click', () => {
            searchInput.value = item.name;
            searchResults.style.display = 'none';
            scrollToProduct(item.id);
        });
        searchResults.appendChild(resultItem);
    });

    searchResults.style.display = 'block';
}

// Scroll to a specific product in inventory
function scrollToProduct(productId) {
    const productElement = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (productElement) {
        productElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        productElement.style.boxShadow = '0 0 0 2px #3498db';
        setTimeout(() => {
            productElement.style.boxShadow = '';
        }, 2000);
    }
}

// Display inventory
function displayInventory() {
    if (inventory.length === 0) {
        inventoryList.innerHTML = '<div class="loading">No products in inventory. Add some using the form below.</div>';
        return;
    }

    inventoryList.innerHTML = '';

    // Sort inventory alphabetically
    const sortedInventory = [...inventory].sort((a, b) => a.name.localeCompare(b.name));

    sortedInventory.forEach((item) => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-id', item.id);
        productCard.innerHTML = `
            <div class="product-name">${item.name}</div>
            <div class="product-price">$${item.price.toFixed(2)}</div>
            <form class="update-form" data-id="${item.id}">
                <input type="number" step="0.01" min="0" value="${item.price}" required>
                <button type="submit">Update Price</button>
            </form>
            <button class="delete-btn" data-id="${item.id}">Delete Product</button>
        `;
        inventoryList.appendChild(productCard);
    });

    // Add event listeners to update forms
    document.querySelectorAll('.update-form').forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const id = this.getAttribute('data-id');
            const newPrice = parseFloat(this.querySelector('input').value);

            if (!isNaN(newPrice) && newPrice >= 0) {
                // Update in Firebase
                update(ref(database, `inventory/${id}`), {
                    price: newPrice
                });
                showNotification('Price updated successfully!');
            } else {
                showNotification('Please enter a valid price!', true);
            }
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            const productName = inventory.find(item => item.id === id)?.name || 'this product';

            if (confirm(`Are you sure you want to delete "${productName}"?`)) {
                // Remove from Firebase
                remove(ref(database, `inventory/${id}`))
                    .then(() => {
                        showNotification('Product deleted successfully!');
                    })
                    .catch((error) => {
                        showNotification('Error deleting product!', true);
                        console.error('Error deleting product:', error);
                    });
            }
        });
    });
}

// Setup add product form
function setupAddProductForm() {
    addProductForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);

        if (!name || isNaN(price) || price <= 0) {
            showNotification('Please enter valid product name and positive price!', true);
            return;
        }

        try {
            // Check if product exists (case insensitive)
            const existingItem = inventory.find(item =>
                item.name.toLowerCase() === name.toLowerCase()
            );

            if (existingItem) {
                // Update existing product
                await update(ref(database, `inventory/${existingItem.id}`), { price });
                showNotification(`Updated price for ${name} to $${price.toFixed(2)}`);
            } else {
                // Add new product
                await push(ref(database, 'inventory'), { name, price });
                showNotification(`Added new product: ${name}`);
            }

            // Reset form
            addProductForm.reset();
        } catch (error) {
            console.error("Error saving product:", error);
            showNotification('Failed to save product. Check console for details.', true);
        }
    });
}

// Show notification
function showNotification(message, isError = false) {
    console.log(isError ? "❌ " + message : "✅ " + message);
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);