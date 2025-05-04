// JavaScript for book details functionality

document.addEventListener('DOMContentLoaded', function() {
    // Preview cover image when URL is entered
    const coverUrlInput = document.getElementById('cover_url');
    const coverPreview = document.getElementById('cover-preview');
    
    if (coverUrlInput && coverPreview) {
        coverUrlInput.addEventListener('blur', function() {
            const url = this.value.trim();
            if (url) {
                coverPreview.src = url;
                coverPreview.style.display = 'block';
            } else {
                coverPreview.style.display = 'none';
            }
        });
    }
    
    // Price formatter
    const priceInput = document.getElementById('price');
    if (priceInput) {
        priceInput.addEventListener('blur', function() {
            const value = parseFloat(this.value);
            if (!isNaN(value)) {
                this.value = value.toFixed(2);
            }
        });
    }
    
    // ISBN validator
    const isbnInput = document.getElementById('isbn');
    if (isbnInput) {
        isbnInput.addEventListener('blur', function() {
            const isbn = this.value.replace(/[-\s]/g, '');
            if (isbn.length === 10 || isbn.length === 13) {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            } else {
                this.classList.remove('is-valid');
                this.classList.add('is-invalid');
            }
        });
    }
});