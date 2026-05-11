import { addMovieSuggestion, getAllMovies, generateMovies, TMDB_GENRES, getScreenings, generateSkeletonCards } from '/js/server.js'

// Theme change
const changeThemeBtn = document.querySelectorAll('.theme-change')
const htmlElement = document.documentElement

changeThemeBtn.forEach(element => {
    element.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme')

        if (currentTheme === 'dark') {
            themeSet('light')
        } else {
            themeSet('dark')
        }
    })
})

// Carousel


export function carouselScroll() {
    const carousels = document.querySelectorAll('.calendar-container, .all-movies-container')

    if (!carousels || carousels.length === 0) return

    carousels.forEach(carousel => {
        const track = carousel.querySelector('.movies-calendar-container, .movies-container')
        const prevBtn = carousel.querySelector('.prev-btn')
        const nextBtn = carousel.querySelector('.next-btn')

        if (!prevBtn || !nextBtn || !track) return

        const checkArrows = () => {
            if (track.scrollWidth <= track.clientWidth) {
                prevBtn.classList.add('hidden')
                nextBtn.classList.add('hidden')
                return
            }

            if (track.scrollLeft === 0) {
                prevBtn.classList.add('hidden')
                nextBtn.classList.remove('hidden')
            } else if (Math.ceil(track.scrollLeft + track.clientWidth) >= track.scrollWidth) {
                prevBtn.classList.remove('hidden')
                nextBtn.classList.add('hidden')
            } else {
                prevBtn.classList.remove('hidden')
                nextBtn.classList.remove('hidden')
            }
        }

        checkArrows()

        track.addEventListener('scroll', checkArrows)

        window.addEventListener('resize', checkArrows)

        nextBtn.addEventListener('click', () => {
            const card = track.querySelector('.movie-card')
            if (!card) return
            const gap = 40
            const scrollAmount = card.offsetWidth + gap

            track.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        })

        prevBtn.addEventListener('click', () => {
            const card = track.querySelector('.movie-card')
            if (!card) return
            const gap = 40
            const scrollAmount = card.offsetWidth + gap

            track.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
        })
    })
}

// Calendar

const mainCalendarList = document.querySelector('#movie-calendar .movies-calendar-container')

async function renderMainCalendar() {
    if (!mainCalendarList) return

    mainCalendarList.innerHTML = generateSkeletonCards(5, 'calendar')

    const result = await getScreenings()

    if (!result.success || result.data.length === 0) {
        mainCalendarList.innerHTML = '<p class="main-text">Поки немає запланованих показів</p>'
        return
    }

    let html = ''
    const now = Date.now()
    
    const activeMovies = result.data.filter(movie => {
        if (!movie.parsedDate) return true
        return movie.parsedDate > now
    })

    if (activeMovies.length === 0) {
        mainCalendarList.innerHTML = '<p class="main-text">Поки немає запланованих показів</p>'
        return
    }

    activeMovies.forEach(movie => {
        const posterSrc = movie.poster
            ? `https://image.tmdb.org/t/p/w500${movie.poster}`
            : 'https://placehold.co/154x231/374151/FFFFFF?text=?'

        const rating = movie.rating || 'NR'
        const genreText = movie.genreText || ''
        const year = movie.year || 'Рік невідомий'
        const registrationLinkHtml = movie.registrationLink 
            ? `<a href="${movie.registrationLink}" class="movie-title registration-link" target="_blank" rel="noopener noreferrer">Реєстрація</a>` 
            : ''

        html += `
        <div class="movie-card">
                <span class="movie-date">${movie.date}</span>
                <div class="movie-details">
                    <div class="movie-poster">
                        <img src="${posterSrc}" class="poster-img" alt="${movie.title}" style="display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                        
                        <div class="poster-overlay">
                            <div class="poster-overlay-main">Рейтинг: <span class="poster-overlay-text">${rating}/10</span></div>
                            <div class="poster-overlay-text">${genreText}${year}</div>
                        </div>
                    </div>
                    <span class="movie-title">${movie.title}</span>
                    ${registrationLinkHtml}
                </div>
            </div>
        `
    })

    mainCalendarList.innerHTML = html
}

await renderMainCalendar()
carouselScroll()

// All movies

const mainSiteMoviesContainer = document.querySelector('.movies-container')

async function loadMoviesForUsers() {
    if (!mainSiteMoviesContainer) return

    mainSiteMoviesContainer.innerHTML = generateSkeletonCards(5, 'default')

    const result = await getAllMovies()

    if (result.success && result.data.length > 0) {

        mainSiteMoviesContainer.innerHTML = generateMovies(result.data, false)

        carouselScroll()
    }
}

loadMoviesForUsers()

// Search

const searchInput = document.getElementById('film-add-input')
const searchResultsCont = document.querySelector('.search-results')
const posterContainer = document.querySelector('.form-poster')
const suggestBtn = document.getElementById('suggest-but')
const suggestMsg = document.querySelector('.suggest-message')
let popularMovies = []

let searchTimer
let notificationTimer
let selectedMovieData = null

if (searchInput) {
    searchInput.addEventListener('focus', async () => {
        if (searchInput.value.trim() === '') {
            const popular = await fetchPopularMovies()
            renderResults(popular)
        } else {
            searchResultsCont.classList.remove('hidden')
        }
    })
}
if (searchResultsCont) {
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResultsCont.contains(e.target)) {
            searchResultsCont.classList.add('hidden')
        }
    })
}

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim()

        clearTimeout(searchTimer)
        if (query.length < 1) {
            popularMovies().then(popular => {
                renderResults(popular)
            })
            return
        }

        searchTimer = setTimeout(async () => {
            try {
                const response = await fetch(`/.netlify/functions/search-movies?query=${encodeURIComponent(query)}`)
                const data = await response.json()

                if (data.error) {
                    console.error('Помилка сервера:', data.error)
                    return
                }

                const cleanMovies = data.results ? data.results.filter(movie => movie.original_language !== 'ru') : []

                renderResults(cleanMovies)
            } catch (error) {
                console.error('Помилка пошуку в TMDB:', error)
            }
        }, 500)
    })
}

async function fetchPopularMovies() {
    if (popularMovies.length > 0) return popularMovies

    try {
        const response = await fetch('/.netlify/functions/search-movies')
        const data = await response.json()

        if (data.error) {
            console.error('Помилка сервера:', data.error)
            return []
        }

        popularMovies = data.results ? data.results.filter(movie => movie.original_language !== 'ru') : []
        return popularMovies
    } catch (error) {
        console.error('Помилка завантаження популярних фільмів', error)
        return []
    }
}

function renderResults(movies) {
    searchResultsCont.innerHTML = ''

    if (!movies || movies.length === 0) {
        searchResultsCont.innerHTML = `
        <div class="search-results-item" style="justify-content: center;">
            <span class="search-results-title" style="color: var(--text-muted);">На жаль, нічого не знайдено</span>
        </div>`
        searchResultsCont.classList.remove('hidden')
        return
    }

    const topMovies = movies.slice(0, 5)

    topMovies.forEach(movie => {
        const item = document.createElement('div')
        item.className = 'search-results-item'

        const posterSrc = movie.poster_path
            ? `https://image.tmdb.org/t/p/w154${movie.poster_path}`
            : 'https://placehold.co/154x231/374151/FFFFFF?text=?'

        const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : 'Рік невідомий'

        let genresText = ''
        if (movie.genre_ids && movie.genre_ids.length > 0) {
            const genreNames = movie.genre_ids
                .slice(0, 2)
                .map(id => TMDB_GENRES[id] || '')
                .filter(name => name !== '')

            if (genreNames.length > 0) {
                genresText = genreNames.join(', ') + ' • '
            }
        }

        item.innerHTML = `
        <img src="${posterSrc}" alt="poster">
        <div class="search-results-info">
            <span class="search-results-title">${movie.title}</span>
            <span class="search-results-meta">${genresText}${releaseYear}</span>
        </div>`

        item.addEventListener('click', () => {
            selectMovie(movie)
        })

        searchResultsCont.appendChild(item)
    })

    searchResultsCont.classList.remove('hidden')
}

function selectMovie(movie) {
    selectedMovieData = movie
    if (suggestMsg) suggestMsg.classList.remove('show')

    searchResultsCont.classList.add('hidden')
    searchInput.value = ''

    const titleElement = document.querySelector('.form-left-column .movie-card > .movie-title')

    if (titleElement) {
        titleElement.textContent = movie.title
    }

    const question = document.querySelector('.question')

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'NR'
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'Рік невідомий'

    let genreText = ''
    if (movie.genre_ids && movie.genre_ids.length > 0) {
        const genreNames = movie.genre_ids
            .slice(0, 2)
            .map(id => TMDB_GENRES[id] || '')
            .filter(name => name !== '')
        if (genreNames.length > 0) {
            genreText = genreNames.join(', ') + ' • '
        }
    }

    if (movie.poster_path) {
        const imageUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        posterContainer.innerHTML = `
            <img src="${imageUrl}" alt="${movie.title}" 
                 style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;">
            <div class="poster-overlay">
                <div class="poster-overlay-main">Рейтинг: <span class="poster-overlay-text">${rating}/10</span></div>
                <div class="poster-overlay-text">${genreText}${year}</div>
            </div>
        `
        posterContainer.style.border = 'none'
    } else {
        posterContainer.innerHTML = '<span class="movie-title question">?</span>'
    }

    if (question) question.style.display = 'none'
}

function showNotification(message, type) {
    clearTimeout(notificationTimer)

    suggestMsg.textContent = message
    suggestMsg.classList.remove('error', 'success', 'show')

    suggestMsg.classList.add(type)

    setTimeout(() => {
        suggestMsg.classList.add('show')
    }, 10)

    notificationTimer = setTimeout(() => {
        suggestMsg.classList.remove('show')
    }, 3000)
}

if (suggestBtn) {
    suggestBtn.addEventListener('click', async () => {
        if (!selectedMovieData) {
            showNotification('Виберіть фільм з випадаючого списку.', 'error')
            return
        }

        try {
            suggestBtn.style.pointerEvents = 'none'
            suggestBtn.textContent = 'Відправка'
            suggestMsg.classList.remove('show')

            await addMovieSuggestion(selectedMovieData)

            showNotification('Дякуємо! Фільм успішно запропоновано.', 'success')
            resetForm()
        } catch (error) {
            showNotification('Не вдалося відправити. Спробуйте пізніше.', 'error')
        } finally {
            suggestBtn.style.pointerEvents = 'auto'
            suggestBtn.textContent = 'Запропонувати!'
        }
    })
}

function resetForm() {
    selectedMovieData = null
    searchInput.value = ''

    posterContainer.innerHTML = '<span class="movie-title question">?</span>'
    posterContainer.style.border = 'none'

    const titleElement = document.querySelector('.form-left-column .movie-card > .movie-title')
    if (titleElement) titleElement.textContent = ''
}


// Stars

import { saveRating } from "/js/server.js"

const starInputs = document.querySelectorAll('.stars input')

starInputs.forEach(input => {
    const groupName = input.name
    const savedValue = localStorage.getItem('rating_' + groupName)

    if (savedValue === input.value) {
        input.checked = true
    }
})

starInputs.forEach(input => {
    input.addEventListener('change', async function () {
        const groupName = this.name
        const selectedValue = this.value

        localStorage.setItem('rating_' + groupName, selectedValue)

        const isSuccess = await saveRating(groupName, selectedValue)
    })
})