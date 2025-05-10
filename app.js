// Инициализация Telegram Mini App
const tg = window.Telegram.WebApp;
tg.expand();

// Загрузка товаров из JSON-файла
let products = [];
let favorites = [];

// Загрузка избранных товаров
function loadFavorites() {
    // Проверяем, доступен ли CloudStorage
    if (tg.CloudStorage && false) { // временно отключаем CloudStorage для отладки
        return new Promise((resolve) => {
            tg.CloudStorage.getItem('favorites', (error, value) => {
                if (error || !value) {
                    resolve([]);
                } else {
                    resolve(JSON.parse(value));
                }
            });
        });
    } else {
        // Альтернативное решение для браузера
        const userData = tg.initDataUnsafe?.user;
        const userId = userData?.id || "anonymous";
        
        const savedFavorites = localStorage.getItem(`favorites_${userId}`);
        return savedFavorites ? JSON.parse(savedFavorites) : [];
    }
}

// Сохранение избранных товаров
function saveFavorites() {
    const userData = tg.initDataUnsafe?.user;
    const userId = userData?.id || "anonymous";
    
    localStorage.setItem(`favorites_${userId}`, JSON.stringify(favorites));
}function saveFavorites() {
    if (tg.CloudStorage) {
        tg.CloudStorage.setItem('favorites', JSON.stringify(favorites));
    }
}

// Загрузка товаров
async function loadProducts() {
    try {
        const response = await fetch('products.json');
        products = await response.json();
        
        // Получаем избранные товары
        if (typeof loadFavorites().then === 'function') {
            // Если функция возвращает Promise
            favorites = await loadFavorites();
        } else {
            // Если функция возвращает значение напрямую
            favorites = loadFavorites();
        }
        
        renderProducts(products);
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        
        // Загрузка демо-товаров, если файл недоступен
        products = [
            // ... ваши демо-товары ...
        ];
        favorites = Array.isArray(favorites) ? favorites : [];
        renderProducts(products);
    }
}

// Отображение товаров
function renderProducts(productsToRender) {
    const productsContainer = document.getElementById('products');
    productsContainer.innerHTML = '';
    
    productsToRender.forEach(product => {
        const isFavorite = favorites.includes(product.id);
        
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.classList.add('animate__animated', 'animate__fadeIn');
        
        productElement.innerHTML = `
            <img class="product-image" src="${product.image}" alt="${product.title}" onerror="this.src='images/placeholder.jpg'">
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
    
    // Добавляем обработчики событий для кнопок избранного
    document.querySelectorAll('.favorite-button').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            toggleFavorite(productId, this);
        });
    });
}

// Функция для запуска анимации с аниме-девочкой
function playFavoriteAnimation() {
    const animationContainer = document.getElementById('favorite-animation');
    const animationImage = animationContainer.querySelector('.favorite-animation-image');
    
    // Сбрасываем анимацию, если она уже запущена
    animationContainer.classList.remove('active');
    void animationContainer.offsetWidth; // Перезапуск анимации
    
    // Запускаем анимацию
    animationContainer.classList.add('active');
    
    // Удаляем класс после завершения анимации
    setTimeout(() => {
        animationContainer.classList.remove('active');
    }, 1500); // Длительность анимации
}

// Переключение избранного
function toggleFavorite(productId, button) {
    const index = favorites.indexOf(productId);
    
    if (index === -1) {
        // Добавляем в избранное
        favorites.push(productId);
        button.classList.add('active');
        button.textContent = '♥';
        
        // Воспроизводим анимацию с аниме-девочкой
        playFavoriteAnimation();
        
        // Вибрация (работает в Telegram)
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    } else {
        // Удаляем из избранного
        favorites.splice(index, 1);
        button.classList.remove('active');
        button.textContent = '♡';
    }
    
    saveFavorites();
}

// Фильтрация товаров по категории
function filterProducts(category) {
    if (category === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(product => product.category === category);
        renderProducts(filtered);
    }
}

// Поиск товаров
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

// Показ окна избранного
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
                <img class="product-image" src="${product.image}" alt="${product.title}" onerror="this.src='images/placeholder.jpg'">
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
        
        // Добавляем обработчики для кнопок избранного
        favoritesList.querySelectorAll('.favorite-button').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                toggleFavorite(productId, this);
                
                // Удаляем карточку товара из списка избранного
                setTimeout(() => {
                    this.closest('.product-card').remove();
                    
                    // Обновляем сообщение, если список пуст
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

// Обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    // Загрузка товаров
    loadProducts();
    
    // Обработчики для категорий
    document.querySelectorAll('.category').forEach(button => {
        button.addEventListener('click', function() {
            // Удаляем активный класс у всех кнопок
            document.querySelectorAll('.category').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Добавляем активный класс нажатой кнопке
            this.classList.add('active');
            
            // Фильтруем товары по выбранной категории
            const category = this.getAttribute('data-category');
            filterProducts(category);
        });
    });
    
    // Обработчик для поиска
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', function() {
        searchProducts(this.value);
    });
    
    // Обработчик для кнопки избранного
    document.getElementById('favorites-button').addEventListener('click', showFavorites);
    
    // Закрытие модального окна
    document.querySelector('.close-modal').addEventListener('click', function() {
        const modal = document.getElementById('favorites-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
    
    // Закрытие модального окна при клике вне его содержимого
    document.getElementById('favorites-modal').addEventListener('click', function(event) {
        if (event.target === this) {
            this.classList.remove('active');
            setTimeout(() => {
                this.style.display = 'none';
            }, 300);
        }
    });
});
