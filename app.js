const tg = window.Telegram.WebApp;
tg.expand();

tg.setHeaderColor('#5d7972');
tg.setBackgroundColor('#f5f5f5');

let products = [];
let favorites = [];
let reviews = [];
let userReview = null;
let selectedRating = 0;

function loadFavorites() {
    return new Promise((resolve) => {
        if (tg.CloudStorage) {
            tg.CloudStorage.getItem('favorites', (error, value) => {
                if (error || !value) {
                    resolve([]);
                } else {
                    resolve(JSON.parse(value));
                }
            });
        } else {
            resolve([]);
        }
    });
}

function saveFavorites() {
    if (tg.CloudStorage) {
        tg.CloudStorage.setItem('favorites', JSON.stringify(favorites));
    }
}

async function loadProducts() {
    try {
        if (typeof db === 'undefined') {
            throw new Error('Firebase не инициализирован');
        }

        const snapshot = await db.collection('products').get();
        products = [];
        
        snapshot.forEach(doc => {
            products.push({
                id: parseInt(doc.id),
                ...doc.data()
            });
        });
        
        favorites = await loadFavorites();
        
        renderProducts(products);
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        
        products = [
            {
                id: 1,
                title: "Тестовый товар",
                price: 1000,
                image: "images/placeholder.png",
                category: "pods",
                stock: 10
            }
        ];
        renderProducts(products);
    }
}

async function loadReviews() {
    try {
        const snapshot = await db.collection('reviews').orderBy('date', 'desc').get();
        reviews = [];
        
        snapshot.forEach(doc => {
            reviews.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        const userId = tg.initDataUnsafe?.user?.id;
        if (userId) {
            userReview = reviews.find(review => review.userId === userId.toString());
        }
        
        renderReviews();
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
    }
}

function renderProducts(productsToRender) {
    const productsContainer = document.getElementById('products');
    productsContainer.innerHTML = '';
    
    productsToRender.forEach(product => {
        const isFavorite = favorites.includes(product.id);
        
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.classList.add('animate__animated', 'animate__fadeIn');
        
        productElement.innerHTML = `
            <img class="product-image" src="${product.image}" alt="${product.title}" onerror="this.src='images/placeholder.png'">
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-price">${product.price} ₽</p>
                <div class="product-action">
                    <span class="stock-info">${product.stock > 0 ? 'В наличии' : 'Нет в наличии'}</span>
                    <button class="favorite-button ${isFavorite ? 'active' : ''}" data-id="${product.id}">
                        ${isFavorite ? '♥' : '♡'}
                    </button>
                </div>
            </div>
        `;
        
        productsContainer.appendChild(productElement);
    });
    
    document.querySelectorAll('.favorite-button').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            toggleFavorite(productId, this);
        });
    });
}

function renderReviews() {
    const reviewsList = document.getElementById('reviews-list');
    const addReviewButton = document.getElementById('add-review-button');
    
    reviewsList.innerHTML = '';
    
    if (reviews.length === 0) {
        reviewsList.innerHTML = `
            <div class="empty-reviews">
                <i class="fas fa-comments"></i>
                <p>Отзывов пока нет. Будьте первым, кто оставит отзыв!</p>
            </div>
        `;
    } else {
        reviews.forEach(review => {
            const isUserReview = review.userId === tg.initDataUnsafe?.user?.id?.toString();
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-card';
            
            const date = new Date(review.date.seconds * 1000);
            const formattedDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
            
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= review.rating) {
                    stars += '★';
                } else {
                    stars += '☆';
                }
            }
            
            reviewElement.innerHTML = `
                <div class="review-header">
                    <div class="review-user-info">
                        <h4 class="review-username">
                            ${review.userName}
                            ${isUserReview ? '<span class="your-review-badge">Ваш отзыв</span>' : ''}
                        </h4>
                        <div class="review-date">${formattedDate}</div>
                    </div>
                    <div class="review-rating">${stars}</div>
                </div>
                <div class="review-text">
                    ${review.text}
                </div>
            `;
            
            reviewsList.appendChild(reviewElement);
        });
    }
    
    if (userReview) {
        addReviewButton.textContent = 'Изменить отзыв';
    } else {
        addReviewButton.textContent = 'Оставить отзыв';
    }
}

function playFavoriteAnimation() {
    const animationContainer = document.getElementById('favorite-animation');
    const animationImage = animationContainer.querySelector('.favorite-animation-image');
    
    animationContainer.classList.remove('active');
    void animationContainer.offsetWidth;
    
    animationContainer.classList.add('active');
    
    setTimeout(() => {
        animationContainer.classList.remove('active');
    }, 1500);
}

function toggleFavorite(productId, button) {
    const index = favorites.indexOf(productId);
    
    if (index === -1) {
        favorites.push(productId);
        button.classList.add('active');
        button.textContent = '♥';
        
        playFavoriteAnimation();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    } else {
        favorites.splice(index, 1);
        button.classList.remove('active');
        button.textContent = '♡';
    }
    
    saveFavorites();
}

function filterProducts(category) {
    if (category === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(product => product.category === category);
        renderProducts(filtered);
    }
}

function searchProducts(query) {
    if (!query.trim()) {
        renderProducts(products);
        return;
    }
    
    const searchQuery = query.toLowerCase();
    const filtered = products.filter(product => 
        product.title.toLowerCase().includes(searchQuery)
    );
    
    renderProducts(filtered);
}

function showFavorites() {
    const modal = document.getElementById('favorites-modal');
    const modalContent = modal.querySelector('.modal-content');
    const favoritesList = document.getElementById('favorites-list');
    
    favoritesList.innerHTML = '';
    
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<div class="favorites-list-empty">У вас пока нет избранных товаров</div>';
    } else {
        const favoriteProducts = products.filter(product => favorites.includes(product.id));
        
        favoriteProducts.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-card';
            
            productElement.innerHTML = `
                <img class="product-image" src="${product.image}" alt="${product.title}" onerror="this.src='images/placeholder.png'">
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-price">${product.price} ₽</p>
                    <div class="product-action">
                        <span class="stock-info">${product.stock > 0 ? 'В наличии' : 'Нет в наличии'}</span>
                        <button class="favorite-button active" data-id="${product.id}">♥</button>
                    </div>
                </div>
            `;
            
            favoritesList.appendChild(productElement);
        });
        
        favoritesList.querySelectorAll('.favorite-button').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                toggleFavorite(productId, this);
                
                setTimeout(() => {
                    this.closest('.product-card').remove();
                    
                    if (favorites.length === 0) {
                        favoritesList.innerHTML = '<div class="favorites-list-empty">У вас пока нет избранных товаров</div>';
                    }
                }, 300);
            });
        });
    }
    
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function showReviewForm() {
    const modal = document.getElementById('review-modal');
    const reviewText = document.getElementById('review-text');
    const stars = document.querySelectorAll('.star');
    
    selectedRating = 0;
    stars.forEach(star => star.classList.remove('active'));
    
    if (userReview) {
        reviewText.value = userReview.text;
        selectedRating = userReview.rating;
        
        stars.forEach(star => {
            if (parseInt(star.getAttribute('data-rating')) <= selectedRating) {
                star.classList.add('active');
            }
        });
    } else {
        reviewText.value = '';
    }
    
    document.getElementById('char-count').textContent = reviewText.value.length;
    
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

async function submitReview() {
    // Проверяем доступность данных пользователя
    if (!tg.initDataUnsafe || !tg.initDataUnsafe.user) {
        showNotification('Ошибка авторизации в Telegram', 'error');
        console.error('Данные пользователя недоступны:', tg.initDataUnsafe);
        return;
    }
    
    const user = tg.initDataUnsafe.user;
    const userId = user.id.toString();
    // Защита от undefined в имени пользователя
    const userName = user.first_name || 'Пользователь';
    const reviewText = document.getElementById('review-text').value.trim();
    
    if (selectedRating === 0) {
        showNotification('Пожалуйста, выберите оценку', 'error');
        return;
    }
    
    if (reviewText.length < 5) {
        showNotification('Пожалуйста, напишите отзыв (минимум 5 символов)', 'error');
        return;
    }
    
    try {
        // Создаем объект с данными отзыва
        const reviewData = {
            userId: userId,
            userName: userName,
            rating: selectedRating,
            text: reviewText,
            date: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Отправляем отзыв:', reviewData);
        
        // Проверяем существование документа перед обновлением
        if (userReview) {
            await db.collection('reviews').doc(userId).update(reviewData);
            showNotification('Ваш отзыв обновлен', 'success');
        } else {
            await db.collection('reviews').doc(userId).set(reviewData);
            showNotification('Спасибо за ваш отзыв!', 'success');
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
        }
        
        const modal = document.getElementById('review-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        
        await loadReviews();
        
    } catch (error) {
        console.error('Ошибка при отправке отзыва:', error);
        showNotification('Ошибка при отправке отзыва: ' + (error.message || 'Неизвестная ошибка'), 'error');
    }
}

function showNotification(message, type = '') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('visible');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('visible');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    loadReviews();
    
    document.querySelectorAll('.category').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.category').forEach(btn => {
                btn.classList.remove('active');
            });
            
            this.classList.add('active');
            
            const category = this.getAttribute('data-category');
            filterProducts(category);
        });
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
            });
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            this.classList.add('active');
            
            const tabName = this.getAttribute('data-tab');
            document.getElementById(`${tabName}-content`).classList.add('active');
        });
    });
    
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', function() {
        searchProducts(this.value);
    });
    
    document.getElementById('favorites-button').addEventListener('click', showFavorites);
    document.getElementById('add-review-button').addEventListener('click', showReviewForm);
    
    document.querySelector('#favorites-modal .close-modal').addEventListener('click', function() {
        const modal = document.getElementById('favorites-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
    
    document.querySelector('#review-modal .close-modal').addEventListener('click', function() {
        const modal = document.getElementById('review-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
    
    document.getElementById('favorites-modal').addEventListener('click', function(event) {
        if (event.target === this) {
            this.classList.remove('active');
            setTimeout(() => {
                this.style.display = 'none';
            }, 300);
        }
    });
    
    document.getElementById('review-modal').addEventListener('click', function(event) {
        if (event.target === this) {
            this.classList.remove('active');
            setTimeout(() => {
                this.style.display = 'none';
            }, 300);
        }
    });
    
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            selectedRating = rating;
            
            document.querySelectorAll('.star').forEach(s => {
                s.classList.remove('active');
            });
            
            document.querySelectorAll('.star').forEach(s => {
                if (parseInt(s.getAttribute('data-rating')) <= rating) {
                    s.classList.add('active');
                }
            });
        });
    });
    
    document.getElementById('review-text').addEventListener('input', function() {
        document.getElementById('char-count').textContent = this.value.length;
    });
    
    document.getElementById('submit-review').addEventListener('click', submitReview);
});
