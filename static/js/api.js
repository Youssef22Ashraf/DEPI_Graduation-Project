// JavaScript for API integration

class BookstoreAPI {
    static async getBooks() {
        try {
            const response = await fetch('/api/books');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching books:', error);
            return { books: [] };
        }
    }
    
    static async getAuthors() {
        try {
            const response = await fetch('/api/authors');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching authors:', error);
            return { authors: [] };
        }
    }
    
    static async createBook(bookData) {
        try {
            const response = await fetch('/api/books', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookData)
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating book:', error);
            throw error;
        }
    }
    
    static async createAuthor(authorData) {
        try {
            const response = await fetch('/api/authors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(authorData)
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating author:', error);
            throw error;
        }
    }
}

// Example usage:
// BookstoreAPI.getBooks().then(data => console.log(data));