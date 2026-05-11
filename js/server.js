import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js"
import { getFirestore, collection, getDocs, addDoc, getDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js"
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js"

const firebaseConfig = {
  apiKey: "AIzaSyClrW6wEMousAhBallwxKlr5tPI3UrKWAs",
  authDomain: "kalidor-club.firebaseapp.com",
  projectId: "kalidor-club",
  storageBucket: "kalidor-club.firebasestorage.app",
  messagingSenderId: "319596649102",
  appId: "1:319596649102:web:8f19e996261f410f4007df",
  measurementId: "G-TQ4YKKY2L7"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

// TMDB

export const TMDB_GENRES = {
  28: 'Бойовик', 12: 'Пригоди', 16: 'Мультфільм', 35: 'Комедія',
  80: 'Кримінал', 99: 'Документальний', 18: 'Драма', 10751: 'Сімейний',
  14: 'Фентезі', 36: 'Історичний', 27: 'Жахи', 10402: 'Музика',
  9648: 'Детектив', 10749: 'Мелодрама', 878: 'Фантастика',
  10770: 'ТБ фільм', 53: 'Трилер', 10752: 'Військовий', 37: 'Вестерн'
}

export async function saveRating(categoryName, scoreValue) {
  try {
    const docRef = await addDoc(collection(db, "ratings"), {
      category: categoryName,
      score: scoreValue,
      timestamp: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error("Помилка збереження у Firebase:", error)
    return false
  }
}

export async function addMovieSuggestion(movieData) {
  try {
    const movie = movieData
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

    const docRef = await addDoc(collection(db, "suggestions"), {
      title: movieData.title,
      poster: movieData.poster_path,
      year: movieData.release_date ? movieData.release_date.split('-')[0] : 'Рік невідомий',
      original_language: movieData.original_language,
      rating: rating,
      genreText: genreText,
      timestamp: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error("Помилка при записі в базу Firebase:", error)
    throw error
  }
}

export const loginAdmin = async (email, password) => {
  try {
    const userSign = await signInWithEmailAndPassword(auth, email, password)
    return { success: true, user: userSign.user }
  } catch (error) {
    console.error("Помилка входу:", error)
    return { success: false, error: "Неправильний email або пароль" }
  }
}

export const logoutAdmin = async () => {
  await signOut(auth)
}

export const isLogin = (callback) => {
  onAuthStateChanged(auth, callback)
}

export const getScreenings = async () => {
  try {
    const queryData = await getDocs(collection(db, "calendar"))
    const calendar = []
    queryData.forEach((doc) => {
      calendar.push({ ...doc.data(), id: doc.id })
    })
    return { success: true, data: calendar }
  } catch (error) {
    console.error("Помилка завантаження показів:", error)
    return { success: false, error }
  }
}

export function parseDateString(dateStr) {
  const match = dateStr.match(/(\d{1,2})[\.\/-](\d{1,2})/)
  if (!match) return null

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1

  if (isNaN(day) || isNaN(month) || month < 0 || month > 11 || day < 1 || day > 31) {
    return null
  }

  const now = new Date()
  let year = now.getFullYear()

  if (month < now.getMonth() - 1) {
    year += 1
  }

  const parsedDate = new Date(year, month, day, 23, 59, 59)
  return parsedDate.getTime()
}

export const addCalendar = async (movieData, dateStr, linkStr) => {
  try {
    const parsedDate = parseDateString(dateStr)

    await addDoc(collection(db, "calendar"), {
      ...movieData,
      date: dateStr,
      registrationLink: linkStr || null,
      parsedDate: parsedDate,
      addedAt: serverTimestamp()
    })

    if (movieData.id) {
      await deleteDoc(doc(db, "movies", movieData.id))
    }
    return { success: true }
  } catch (error) {
    console.error("Помилка додавання показу:", error)
    return { success: false, error }
  }
}

export const deleteCalendar = async (calendarId) => {
  try {
    await deleteDoc(doc(db, "calendar", calendarId))
    return { success: true }
  } catch (error) {
    console.error("Помилка видалення показу:", error)
    return { success: false, error }
  }
}

export const getAllMovies = async () => {
  try {
    const queryData = await getDocs(collection(db, "movies"))
    const movies = []
    queryData.forEach((doc) => {
      movies.push({ id: doc.id, ...doc.data() })
    })
    return { success: true, data: movies }
  } catch (error) {
    console.error("Помилка завантаження фільмів:", error)
    return { success: false, error }
  }
}

export const deleteMovie = async (movieId) => {
  try {
    await deleteDoc(doc(db, "movies", movieId))
    return { success: true }
  } catch (error) {
    console.error("Помилка видалення фільму:", error)
    return { success: false, error }
  }
}

export const generateSkeletonCards = (count = 5, type = 'default') => {
  let html = ''
  for (let i = 0; i < count; i++) {
    let topHtml = ''
    if (type === 'calendar' || type === 'admin-calendar') {
      topHtml = '<span class="movie-date"><div class="skeleton skeleton-text" style="width: 70%; margin-bottom: 5px;"></div></span>'
    }

    let bottomHtml = ''
    if (type === 'admin' || type === 'admin-calendar') {
      bottomHtml = '<div class="skeleton skeleton-btn" style="margin-top: 5px;"></div>'
    } else if (type === 'admin-suggestion') {
      bottomHtml = '<div class="skeleton skeleton-btn" style="margin-top: 5px;"></div><div class="skeleton skeleton-btn" style="margin-top: 5px;"></div>'
    }

    html += `
      <div class="movie-card">
          ${topHtml}
          ${(type === 'calendar' || type === 'admin-calendar') ? '<div class="movie-details">' : ''}
              <div class="movie-poster skeleton"></div>
              <span class="movie-title" style="display:block; margin-top: 5px;">
                  <div class="skeleton skeleton-text" style="width: 80%;"></div>
              </span>
              ${bottomHtml}
          ${(type === 'calendar' || type === 'admin-calendar') ? '</div>' : ''}
      </div>
    `
  }
  return html
}

export const generateMovies = (movies, isAdmin = false) => {
  let html = ''

  movies.forEach(movie => {
    const posterSrc = movie.poster
      ? `https://image.tmdb.org/t/p/w500${movie.poster}`
      : 'https://placehold.co/154x231/374151/FFFFFF?text=?'

    const deleteButton = isAdmin
      ? `<p class="add-film-but admin-delete-but" data-id="${movie.id}">Видалити</p>`
      : ''

    const rating = movie.rating || 'NR'
    const genreText = movie.genreText || ''
    const year = movie.year || 'Рік невідомий'

    html += `
          <div class="movie-card">
              <div class="movie-poster">
                  <img src="${posterSrc}" class="poster-img admin-poster poster" alt="${movie.title}">

                  <div class="poster-overlay">
                      <div class="poster-overlay-main">Рейтинг: <span class="poster-overlay-text">${rating}/10</span></div>
                      <div class="poster-overlay-text">${genreText}${year}</div>
                  </div>
              </div>
              <span class="movie-title">${movie.title}</span>
              ${deleteButton}
          </div>
        `
  })

  return html
}

export const getSuggestions = async () => {
  try {
    const queryData = await getDocs(collection(db, "suggestions"))
    const suggestions = []
    queryData.forEach((doc) => {
      suggestions.push({ id: doc.id, ...doc.data() })
    })
    return { success: true, data: suggestions }
  } catch (error) {
    console.error("Помилка завантаження пропозицій:", error)
    return { success: false, error }
  }
}

export const approveMovie = async (suggestionId) => {
  try {
    const suggestionRef = doc(db, "suggestions", suggestionId)
    const suggestionData = await getDoc(suggestionRef)

    if (suggestionData.exists()) {
      const movieData = suggestionData.data()

      await addDoc(collection(db, "movies"), {
        ...movieData,
        addedAt: serverTimestamp()
      })

      await deleteDoc(suggestionRef)
      return { success: true }
    }
  } catch (error) {
    console.error("Помилка при схваленні:", error)
    return { success: false, error }
  }
}

export const deleteSuggestion = async (suggestionId) => {
  try {
    await deleteDoc(doc(db, "suggestions", suggestionId))
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

export const getAverageRatings = async () => {
  try {
    const queryData = await getDocs(collection(db, "ratings"))

    const totals = {}
    const counts = {}

    queryData.forEach((doc) => {
      const data = doc.data()

      const category = data.category
      const score = Number(data.score)

      if (category && !isNaN(score)) {
        if (!totals[category]) {
          totals[category] = 0
          counts[category] = 0
        }
        totals[category] += score
        counts[category] += 1
      }
    })

    const results = {}

    for (const key in totals) {
      const finalAverage = (totals[key] / counts[key]).toFixed(1)

      results[key] = {
        score: finalAverage,
        votes: counts[key]
      }
    }

    return { success: true, data: results }
  } catch (error) {
    console.error("Помилка отримання статистики:", error)
    return { success: false, error }
  }
}