exports.handler = async function (event, context) {
    const TMDB_TOKEN = process.env.TMDB_TOKEN

    if (!TMDB_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Помилка сервера: відсутній токен TMDB" })
        }
    }

    const { query } = event.queryStringParameters

    let url = 'https://api.themoviedb.org/3/movie/popular?language=uk-UA&page=1'
    if (query && query.trim() !== '') {
        url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=uk-UA`
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${TMDB_TOKEN}`
            }
        })

        const data = await response.json()

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "https://kalidor-club.netlify.app"
            },
            body: JSON.stringify(data)
        }
    } catch (error) {
        console.error("Помилка запиту до TMDB:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Внутрішня помилка сервера при зверненні до зовнішнього API." })
        }
    }
}
