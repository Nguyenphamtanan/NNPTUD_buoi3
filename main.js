document.addEventListener('DOMContentLoaded', () => {
    LoadProducts();    // Load products for the management table
    LoadComments();    // Load comments when the page is loaded

    // Product controls events
    const searchInput = document.getElementById('product-search');
    const pageSizeSelect = document.getElementById('page-size');
    const sortPriceBtn = document.getElementById('sort-price');
    const sortTitleBtn = document.getElementById('sort-title');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (searchInput) searchInput.addEventListener('input', (e) => onSearchChange(e.target.value));
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', (e) => onPageSizeChange(parseInt(e.target.value)));
    if (sortPriceBtn) sortPriceBtn.addEventListener('click', () => toggleSort('price'));
    if (sortTitleBtn) sortTitleBtn.addEventListener('click', () => toggleSort('title'));
    if (prevBtn) prevBtn.addEventListener('click', () => changePage(currentPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => { changePage(currentPage + 1); });
});

let products = [];
let filteredProducts = [];
let currentPage = 1;
let pageSize = 10;
let sortState = { field: null, asc: true };

// Fetch all products from the Escuelajs API
async function LoadProducts() {
    try {
        const response = await fetch('https://api.escuelajs.co/api/v1/products');
        if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
        products = await response.json();
        filteredProducts = products.slice();
        currentPage = 1;
        renderProducts();
    } catch (error) {
        console.error('Error while fetching products from API:', error);
    }
}

function renderProducts() {
    const body = document.getElementById('post-body');
    if (!body) return;

    // Sort filtered products if necessary
    let list = [...filteredProducts];
    if (sortState.field) {
        list.sort((a, b) => {
            const valueA = `${a[sortState.field]}`.toLowerCase();
            const valueB = `${b[sortState.field]}`.toLowerCase();
            if (sortState.asc) return valueA > valueB ? 1 : -1;
            else return valueA < valueB ? 1 : -1;
        });
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedProducts = list.slice(startIndex, startIndex + pageSize);
    const totalPageCount = Math.ceil(list.length / pageSize);

    // Clear current table content
    body.innerHTML = '';

    // Render products in the table
    for (const product of paginatedProducts) {
        const imageSrc = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : getPlaceholderImage();
        const categoryName = product.category?.name ? product.category.name : 'N/A';

        body.innerHTML += `
            <tr>
                <td>${product.id}</td>
                <td><img class="product-img" src="${imageSrc}" alt="${escapeHtml(product.title)}"></td>
                <td>${escapeHtml(product.title)}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${escapeHtml(categoryName)}</td>
                <td>
                    <button onclick="openEditProduct('${product.id}')">Edit</button>
                    <button onclick="LoadProductComments('${product.id}')">Comments</button>
                </td>
            </tr>`;
    }

    // Update pagination details
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) paginationInfo.textContent = `Page ${currentPage} of ${totalPageCount}`;
}

// Handle search input
function onSearchChange(query) {
    filteredProducts = products.filter(p => p.title.toLowerCase().includes(query.trim().toLowerCase()));
    currentPage = 1;
    renderProducts();
}

// Change the page size and re-render the product table
function onPageSizeChange(size) {
    pageSize = size;
    currentPage = 1;
    renderProducts();
}

// Change to a new page
function changePage(newPage) {
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    if (newPage < 1 || newPage > totalPages) return;
    currentPage = newPage;
    renderProducts();
}

// Toggle sorting (price or title)
function toggleSort(field) {
    if (sortState.field === field) {
        sortState.asc = !sortState.asc;
    } else {
        sortState.field = field;
        sortState.asc = true;
    }
    renderProducts();
}

// Load comments from API
async function LoadComments() {
    try {
        const res = await fetch('http://localhost:3000/comments');
        const comments = await res.json();
        const commentBody = document.getElementById('comment-body');
        commentBody.innerHTML = '';

        for (const comment of comments) {
            const isDeletedStyle = comment.isDeleted ? 'text-decoration: line-through;' : '';
            const deleteButton = comment.isDeleted
                ? ''
                : `<button onclick="DeleteComment('${comment.id}')">Delete</button>`;
            commentBody.innerHTML += `
                <tr>
                    <td style="${isDeletedStyle}">${comment.id}</td>
                    <td style="${isDeletedStyle}">${comment.text}</td>
                    <td style="${isDeletedStyle}">${comment.postId}</td>
                    <td>${deleteButton}</td>
                </tr>`;
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

// Add a new comment
async function AddComment() {
    const commentText = document.getElementById('comment_text').value;
    const postId = document.getElementById('comment_postId').value;

    if (!commentText || !postId) {
        alert('Please fill in all required fields!');
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/comments');
        const comments = await res.json();
        const maxId = Math.max(0, ...comments.map(c => parseInt(c.id, 10))) || 0;

        const response = await fetch('http://localhost:3000/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: maxId + 1,
                text: commentText,
                postId: postId,
            }),
        });

        if (response.ok) {
            document.getElementById('comment_text').value = '';
            LoadComments();
        } else {
            console.error('Failed to add comment.');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

// Delete a comment
async function DeleteComment(id) {
    try {
        const response = await fetch(`http://localhost:3000/comments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDeleted: true }),
        });

        if (response.ok) {
            console.log('Comment deleted successfully.');
            LoadComments();
        } else {
            console.error('Failed to delete comment.');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
    }
}

function getPlaceholderImage() {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="100%" height="100%" fill="#ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666" font-size="12">No Image</text></svg>';
}

// Utility function to escape HTML content
function escapeHtml(str) {
    return str
        ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
        : '';
}