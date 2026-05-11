import { getAverageRatings, logoutAdmin, loginAdmin, isLogin, getSuggestions, approveMovie, deleteSuggestion, getAllMovies, deleteMovie, generateMovies, getScreenings, addCalendar, deleteCalendar, generateSkeletonCards } from '/js/server.js'
import { carouselScroll } from '/js/app.js'

// Login/Logout

const loginFormContainer = document.querySelector('.login-form')
const adminPanelContainer = document.querySelector('.admin-panel-cont')
const adminCopyright = document.querySelector('.admin-copyright')
const emailInput = document.getElementById('admin-email')
const passwordInput = document.getElementById('admin-password')
const loginBtn = document.getElementById('admin-login-but')
const logoutBut = document.getElementById('admin-exit-but')
const loginMessage = document.getElementById('admin-login-message')
const carousels = document.querySelectorAll('.calendar-container, .all-movies-container')

isLogin(async (user) => {
    if (user) {
        loginFormContainer.classList.add('hidden')
        adminPanelContainer.classList.remove('hidden')
        adminCopyright.classList.remove('hidden')
        logoutBut.classList.remove('hidden')
        loadStats()
        await renderAdminCalendar()
        await renderAllMovies()
        await renderSuggestions()
        carouselScroll()
    } else {
        loginFormContainer.classList.remove('hidden')
        adminPanelContainer.classList.add('hidden')
        adminCopyright.classList.add('hidden')
        logoutBut.classList.add('hidden')
    }
})

function showLoginNotification(message) {
    loginMessage.textContent = message
    loginMessage.style.color = '#ef4444'
    loginMessage.classList.add('show')

    setTimeout(() => {
        loginMessage.classList.remove('show')
    }, 3000)
}

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()

    if (!email || !password) {
        showLoginNotification('Введіть пошту та пароль')
        return
    }

    loginBtn.textContent = 'Перевірка...'
    loginBtn.style.pointerEvents = 'none'

    const result = await loginAdmin(email, password)

    if (result.success) {
        loginMessage.classList.remove('show')
        emailInput.value = ''
        passwordInput.value = ''
    } else {
        showLoginNotification('Неправильна пошта або пароль')
    }

    loginBtn.textContent = 'Увійти'
    loginBtn.style.pointerEvents = 'auto'
})

logoutBut.addEventListener('click', async () => {
    await logoutAdmin()
})

// Calendar

const adminCalendar = document.querySelector('#admin-calendar .movies-calendar-container')

async function renderAdminCalendar() {
    adminCalendar.innerHTML = `
        <div class="movie-card card-add">
            <div class="movie-poster plus-cont">
                <span class="movie-title plus">+</span>
            </div>
        </div>
    ` + generateSkeletonCards(4, 'admin-calendar')

    const result = await getScreenings()

    let html = ''

    if (result.success && result.data.length > 0) {
        const now = Date.now()

        for (const movie of result.data) {
            if (movie.parsedDate && movie.parsedDate < now) {
                await deleteCalendar(movie.id)
                continue
            }

            const posterSrc = movie.poster
                ? `https://image.tmdb.org/t/p/w500${movie.poster}`
                : 'https://placehold.co/154x231/374151/FFFFFF?text=?'

            const rating = movie.rating || 'NR'
            const genreText = movie.genreText || ''
            const year = movie.year || 'Рік невідомий'

            html += `
                <div class="movie-card">
                    <span class="movie-date">${movie.date}</span>
                    <div class="movie-details">
                        <div class="movie-poster">
                            <img src="${posterSrc}" class="poster-img admin-poster">

                            <div class="poster-overlay">
                                <div class="poster-overlay-main">Рейтинг: <span class="poster-overlay-text">${rating}/10</span></div>
                                <div class="poster-overlay-text">${genreText}${year}</div>
                            </div>
                        </div>
                        <span class="movie-title">${movie.title}</span>
                        <p class="add-film-but admin-delete-but" data-id="${movie.id}">Видалити</p>
                    </div>
                </div>
            `
        }
    }

    html += `
        <div class="movie-card card-add">
            <div class="movie-poster plus-cont">
                <span class="movie-title plus">+</span>
            </div>
        </div>
    `

    adminCalendar.innerHTML = html

    adminCalendar.querySelectorAll('.admin-delete-but').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id
            e.target.textContent = '...'
            e.target.style.pointerEvents = 'none'
            await deleteCalendar(id)
            await renderAdminCalendar()
            carouselScroll()
        })
    })

    document.querySelector('.plus-cont').addEventListener('click', showAddCalendar)
}

async function showAddCalendar() {
    if (document.querySelector('.mini-form-container')) return

    const addCardContainer = document.querySelector('.card-add').querySelector('.movie-poster')

    const allMoviesData = await getAllMovies()
    let optionsHtml = '<div class="custom-select-option" data-value="">Оберіть фільм...</div>'

    if (allMoviesData.success) {
        allMoviesData.data.forEach(m => {
            optionsHtml += `<div class="custom-select-option" data-value="${m.id}">${m.title}</div>`
        })
    }

    addCardContainer.innerHTML = `
        <div class="mini-form-container">
            <div class="custom-select-wrapper">
                <div class="custom-select-trigger mini-form-select">Оберіть фільм...</div>
                <div class="custom-select-options">
                    ${optionsHtml}
                </div>
            </div>
            <input type="hidden" id="new-scr-movie" value="">
            
            <input type="text" id="new-scr-date" class="mini-form-input" placeholder="Середа 20.05">
            <input type="url" id="new-scr-link" class="mini-form-input" placeholder="Посилання на реєстрацію">
            
            <span id="mini-form-error" class="mini-form-error"></span>

            <div class="mini-form-btns">
                <p id="save-scr-btn" class="mini-btn">Підтвердити</p>
                <p id="cancel-scr-btn" class="mini-btn">Скасувати</p>
            </div>
        </div>
    `

    const selectWrapper = document.querySelector('.custom-select-wrapper')
    const selectTrigger = selectWrapper.querySelector('.custom-select-trigger')
    const selectOptions = selectWrapper.querySelector('.custom-select-options')
    const hiddenInput = document.getElementById('new-scr-movie')

    selectTrigger.addEventListener('click', (e) => {
        e.stopPropagation()
        selectOptions.classList.toggle('open')
        selectWrapper.classList.toggle('active')
    })

    selectOptions.querySelectorAll('.custom-select-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation()
            selectTrigger.textContent = e.target.textContent
            hiddenInput.value = e.target.dataset.value
            selectOptions.classList.remove('open')
            selectWrapper.classList.remove('active')
        })
    })

    document.addEventListener('click', (e) => {
        if (!selectWrapper.contains(e.target)) {
            selectOptions.classList.remove('open')
            selectWrapper.classList.remove('active')
        }
    })

    document.getElementById('cancel-scr-btn').addEventListener('click', async (e) => {
        e.stopPropagation()
        await renderAdminCalendar()
    })

    document.getElementById('save-scr-btn').addEventListener('click', async (e) => {
        e.stopPropagation()
        const movieId = document.getElementById('new-scr-movie').value
        const dateVal = document.getElementById('new-scr-date').value.trim()
        const linkVal = document.getElementById('new-scr-link').value.trim()
        const errorMsg = document.getElementById('mini-form-error')

        if (!movieId || !dateVal) {
            errorMsg.textContent = 'Заповніть усі поля'
            errorMsg.classList.add('show')
            setTimeout(() => errorMsg.classList.remove('show'), 3000)
            return
        }

        errorMsg.classList.remove('show')

        const selectedMovie = allMoviesData.data.find(m => m.id === movieId)
        e.target.textContent = '...'
        e.target.style.pointerEvents = 'none'

        await addCalendar(selectedMovie, dateVal, linkVal)
        await renderAdminCalendar()

        if (typeof renderAllMovies === 'function') {
            await renderAllMovies()
        }

        carouselScroll()
    })

}

// All movies

const allMoviesList = document.querySelector('#admin-all-movies .movies-container')

async function renderAllMovies() {
    allMoviesList.innerHTML = generateSkeletonCards(5, 'admin')

    const result = await getAllMovies()

    if (!result.success) {
        allMoviesList.innerHTML = '<p class="admin-main-text">Помилка завантаження</p>'
        return
    }

    if (result.data.length === 0) {
        allMoviesList.innerHTML = '<p class="admin-main-text">Список фільмів порожній</p>'
        return
    }

    allMoviesList.innerHTML = generateMovies(result.data, true)

    allMoviesList.querySelectorAll('.admin-delete-but').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id

            e.target.textContent = '...'
            e.target.style.pointerEvents = 'none'

            await deleteMovie(id)
            await renderAllMovies()
            carouselScroll()
        })
    })
}

// Suggestions

const suggestionList = document.getElementById('suggestion-list')

function addEventListenerToButtons() {
    suggestionList.querySelectorAll('.admin-plus-but').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id
            e.target.textContent = '...'
            e.target.style.pointerEvents = 'none'

            const res = await approveMovie(id)
            if (res.success) {
                await renderSuggestions()
                await renderAllMovies()
                carouselScroll()
            }
        })
    })

    suggestionList.querySelectorAll('.admin-delete-but').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id
            e.target.textContent = '...'
            e.target.style.pointerEvents = 'none'

            await deleteSuggestion(id)
            await renderSuggestions()
            carouselScroll()
        })
    })
}

async function renderSuggestions() {
    suggestionList.innerHTML = generateSkeletonCards(5, 'admin-suggestion')

    const result = await getSuggestions()

    if (!result.success) {
        suggestionList.innerHTML = '<p class="admin-main-text">Помилка завантаження</p>'
        return
    }

    if (result.data.length === 0) {
        suggestionList.innerHTML = '<p class="admin-main-text">Поки немає нових пропозицій</p>'
        return
    }

    let html = ''

    result.data.forEach(movie => {
        const posterSrc = movie.poster
            ? `https://image.tmdb.org/t/p/w500${movie.poster}`
            : 'https://placehold.co/154x231/374151/FFFFFF?text=?'

        const rating = movie.rating || 'NR'
        const genreText = movie.genreText || ''
        const year = movie.year || ''

        html += `
            <div class="movie-card">
                <div class="movie-details">
                    <div class="movie-poster">
                        <img src="${posterSrc}" class="poster-img admin-poster" alt="${movie.title}">

                        <div class="poster-overlay">
                            <div class="poster-overlay-main">Рейтинг: <span class="poster-overlay-text">${rating}/10</span></div>
                            <div class="poster-overlay-text">${genreText}${year}</div>
                        </div>
                    </div>
                    <span class="movie-title">${movie.title}</span>
                    
                    <p class="add-film-but admin-plus-but" data-id="${movie.id}">Додати</p>
                    <p class="add-film-but admin-delete-but" data-id="${movie.id}">Видалити</p>
                </div>
            </div>
        `
    })

    suggestionList.innerHTML = html

    addEventListenerToButtons()
}

// Render stars statistics

const questionMap = {
    "atmosphere": "Оцінка атмосфери на показах",
    "quality": "Оцінка якості підбору фільмів",
    "usability": "Оцінка зручністі цього сайту"
}

const ratingsContainer = document.getElementById('ratings-container')

function generateStars(rating) {
    const roundedRating = Math.round(rating)
    let starsHtml = '<div class="rating-stars">'

    for (let i = 1; i <= 5; i++) {
        if (i <= roundedRating) {
            starsHtml += `<span class="star-yellow">★</span>`
        } else {
            starsHtml += `<span class="star-grey">★</span>`
        }
    }

    starsHtml += '</div>'
    return starsHtml
}

async function loadStats() {
    const result = await getAverageRatings()

    if (result.success) {
        const stats = result.data

        if (Object.keys(stats).length === 0) {
            ratingsContainer.innerHTML = '<p class="admin-main-text">Оцінок ще немає</p>'
            return
        }

        let html = ''
        for (const [rawQuestion, data] of Object.entries(stats)) {
            const displayQuestion = questionMap[rawQuestion] || rawQuestion
            const avg = data.score
            const votes = data.votes

            html += `
                <div class="rating-row">
                    <span class="movie-title">${displayQuestion}</span>
                    <div class="rating-score">
                        <span class="movie-title">${avg}</span>
                        ${generateStars(avg)}
                    </div>
                    <span class="movie-title">${votes} Голосів</span>
                </div>
            `
        }
        ratingsContainer.innerHTML = html
    } else {
        ratingsContainer.innerHTML = '<p class="admin-main-text">Не вдалося завантажити статистику</p>'
    }
}

loadStats()