const htmlElement = document.documentElement

function themeSet(themeName) {
    htmlElement.classList.add('disable-transitions')
    
    htmlElement.setAttribute('data-theme', themeName)
    localStorage.setItem('savedTheme', themeName)
    
    void htmlElement.offsetHeight;
    
    setTimeout(() => {
        htmlElement.classList.remove('disable-transitions')
    }, 10)
}

function themeInit() {
    const savedTheme = localStorage.getItem('savedTheme')

    const system = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme) {
        themeSet(savedTheme)
    } else if (system) {
        themeSet('dark')
    } else {
        themeSet('light')
    }
}

themeInit()