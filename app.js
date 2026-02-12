// Sports Schedule App - Michigan & Olympics
// University of Michigan Team IDs: 130 (ESPN)

const CONFIG = {
    espnBaseUrl: 'https://site.api.espn.com/apis/site/v2/sports',
    oddsApiBaseUrl: 'https://api.the-odds-api.com/v4/sports',
    michiganTeamId: '130',
    mountainTimezone: 'America/Denver',
    refreshInterval: 15 * 60 * 1000, // 15 minutes

    // Michigan Sports Config
    michiganSports: {
        football: {
            espnPath: 'football/college-football',
            oddsKey: 'americanfootball_ncaaf',
            icon: '🏈',
            label: 'Football'
        },
        basketball: {
            espnPath: 'basketball/mens-college-basketball',
            oddsKey: 'basketball_ncaab',
            icon: '🏀',
            label: 'Basketball'
        },
        hockey: {
            espnPath: 'hockey/mens-college-hockey',
            oddsKey: null,
            icon: '🏒',
            label: 'Hockey'
        }
    },

    // Olympics Sports Config (2026 Winter Olympics - Milan-Cortina)
    olympicsSports: {
        'alpine-skiing': { icon: '⛷️', label: 'Alpine Skiing' },
        'biathlon': { icon: '🎿', label: 'Biathlon' },
        'bobsled': { icon: '🛷', label: 'Bobsled' },
        'cross-country': { icon: '🎿', label: 'Cross-Country' },
        'curling': { icon: '🥌', label: 'Curling' },
        'figure-skating': { icon: '⛸️', label: 'Figure Skating' },
        'freestyle-skiing': { icon: '⛷️', label: 'Freestyle Skiing' },
        'ice-hockey': { icon: '🏒', label: 'Ice Hockey' },
        'luge': { icon: '🛷', label: 'Luge' },
        'nordic-combined': { icon: '🎿', label: 'Nordic Combined' },
        'short-track': { icon: '⛸️', label: 'Short Track' },
        'skeleton': { icon: '🛷', label: 'Skeleton' },
        'ski-jumping': { icon: '🎿', label: 'Ski Jumping' },
        'snowboard': { icon: '🏂', label: 'Snowboard' },
        'speed-skating': { icon: '⛸️', label: 'Speed Skating' }
    },

    // Olympics 2026 dates (Milan-Cortina)
    olympics2026: {
        startDate: '2026-02-06',
        endDate: '2026-02-22',
        name: '2026 Winter Olympics',
        location: 'Milan-Cortina, Italy'
    }
};

// Current active sports config (switches between michigan and olympics)
let activeSports = CONFIG.michiganSports;

// State
let state = {
    mode: localStorage.getItem('appMode') || 'michigan', // 'michigan' or 'olympics'
    currentView: 'today',
    currentSport: 'all',
    weekOffset: 0,
    games: [],
    odds: {},
    oddsApiKey: localStorage.getItem('oddsApiKey') || '',
    lastUpdated: null
};

// DOM Elements
const elements = {
    gamesContainer: document.getElementById('games-container'),
    currentDate: document.getElementById('current-date'),
    refreshBtn: document.getElementById('refresh-btn'),
    lastUpdatedTime: document.getElementById('last-updated-time'),
    oddsToggle: document.getElementById('odds-toggle'),
    oddsPanel: document.getElementById('odds-panel'),
    oddsApiKeyInput: document.getElementById('odds-api-key'),
    saveApiKeyBtn: document.getElementById('save-api-key'),
    apiKeyStatus: document.getElementById('api-key-status'),
    weekNav: document.getElementById('week-nav'),
    prevWeekBtn: document.getElementById('prev-week'),
    nextWeekBtn: document.getElementById('next-week'),
    todayBtn: document.getElementById('today-btn'),
    sportFilters: document.getElementById('sport-filters'),
    headerLogo: document.getElementById('header-logo'),
    headerTitle: document.getElementById('header-title'),
    headerSubtitle: document.getElementById('header-subtitle'),
    footerText: document.getElementById('footer-text')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeModeToggle();
    initializeTabs();
    initializeFilters();
    initializeWeekNav();
    initializeOddsConfig();
    initializeRefresh();
    applyMode(); // Apply saved mode
    updateDateHeader();
    loadData();

    // Auto-refresh
    setInterval(loadData, CONFIG.refreshInterval);
});

// Mode Toggle
function initializeModeToggle() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        let lastTouchTime = 0;

        const handleModeChange = () => {
            const newMode = btn.dataset.mode;
            if (newMode !== state.mode) {
                state.mode = newMode;
                localStorage.setItem('appMode', newMode);
                applyMode();
                state.games = []; // Clear games
                state.currentSport = 'all';
                loadData();
            }
        };

        // Handle touch for iOS Safari
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            lastTouchTime = Date.now();
            handleModeChange();
        });

        // Handle click for non-touch devices (with debounce to prevent double-firing)
        btn.addEventListener('click', () => {
            // Ignore click if it came right after a touch event
            if (Date.now() - lastTouchTime > 500) {
                handleModeChange();
            }
        });
    });
}

function applyMode() {
    // Update mode toggle buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === state.mode);
    });

    // Update body class for theme
    document.body.classList.toggle('olympics-mode', state.mode === 'olympics');

    // Update header
    if (state.mode === 'olympics') {
        activeSports = CONFIG.olympicsSports;
        elements.headerLogo.textContent = '🏅';
        elements.headerTitle.textContent = CONFIG.olympics2026.name;
        elements.headerSubtitle.textContent = CONFIG.olympics2026.location;
        elements.footerText.textContent = 'Data from ESPN. Times shown in Mountain Time (MT).';
        // Hide odds config for Olympics
        document.querySelector('.odds-config').style.display = 'none';
    } else {
        activeSports = CONFIG.michiganSports;
        elements.headerLogo.textContent = 'M';
        elements.headerTitle.textContent = 'Michigan Wolverines';
        elements.headerSubtitle.textContent = 'Sports Schedule';
        elements.footerText.textContent = 'Data from ESPN. Odds from The Odds API. Times shown in Mountain Time (MT).';
        // Show odds config for Michigan
        document.querySelector('.odds-config').style.display = 'block';
    }

    // Update sport filters
    renderSportFilters();
    updateDateHeader();
}

function initializeTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentView = tab.dataset.view;
            state.weekOffset = 0; // Reset to current week when switching views
            updateWeekNavVisibility();
            updateDateHeader();
            renderGames();
        });
    });
}

function initializeWeekNav() {
    elements.prevWeekBtn.addEventListener('click', () => {
        state.weekOffset--;
        updateDateHeader();
        renderGames();
    });

    elements.nextWeekBtn.addEventListener('click', () => {
        state.weekOffset++;
        updateDateHeader();
        renderGames();
    });

    elements.todayBtn.addEventListener('click', () => {
        state.weekOffset = 0;
        updateDateHeader();
        renderGames();
    });
}

function updateWeekNavVisibility() {
    if (state.currentView === 'week') {
        elements.weekNav.classList.remove('hidden');
    } else {
        elements.weekNav.classList.add('hidden');
    }
}

function initializeFilters() {
    // Filters are now rendered dynamically by renderSportFilters()
}

function renderSportFilters() {
    const sports = state.mode === 'olympics' ? CONFIG.olympicsSports : CONFIG.michiganSports;

    let html = `<button class="filter-btn active" data-sport="all">All Sports</button>`;

    Object.entries(sports).forEach(([key, sport]) => {
        html += `
            <button class="filter-btn" data-sport="${key}">
                <span class="sport-icon">${sport.icon}</span> ${sport.label}
            </button>
        `;
    });

    elements.sportFilters.innerHTML = html;

    // Re-attach event listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentSport = btn.dataset.sport;
            renderGames();
        });
    });
}

function initializeOddsConfig() {
    elements.oddsToggle.addEventListener('click', () => {
        elements.oddsPanel.classList.toggle('hidden');
    });

    if (state.oddsApiKey) {
        elements.oddsApiKeyInput.value = '••••••••••••••••';
        elements.apiKeyStatus.textContent = 'API key saved';
        elements.apiKeyStatus.className = 'api-key-status success';
    }

    elements.saveApiKeyBtn.addEventListener('click', saveApiKey);

    // Test API button
    const testBtn = document.getElementById('test-odds-api');
    if (testBtn) {
        testBtn.addEventListener('click', testOddsApi);
    }
}

async function testOddsApi() {
    const debugOutput = document.getElementById('api-debug-output');
    debugOutput.style.display = 'block';
    debugOutput.textContent = 'Testing API...';

    if (!state.oddsApiKey) {
        debugOutput.textContent = 'ERROR: No API key saved. Please enter and save your API key first.';
        return;
    }

    try {
        const url = `${CONFIG.oddsApiBaseUrl}/basketball_ncaab/odds/?apiKey=${state.oddsApiKey}&regions=us&markets=spreads,totals&oddsFormat=american`;
        debugOutput.textContent = `Fetching: ${url.replace(state.oddsApiKey, 'API_KEY_HIDDEN')}\n\n`;

        const response = await fetch(url);
        const responseText = await response.text();

        if (!response.ok) {
            debugOutput.textContent += `ERROR ${response.status}: ${responseText}`;
            return;
        }

        const data = JSON.parse(responseText);
        debugOutput.textContent += `Total games returned: ${data.length}\n\n`;

        // Find Michigan games
        const michiganGames = data.filter(g => {
            const home = g.home_team?.toLowerCase() || '';
            const away = g.away_team?.toLowerCase() || '';
            return home.includes('michigan') || away.includes('michigan') ||
                   home.includes('wolverine') || away.includes('wolverine');
        });

        debugOutput.textContent += `Michigan games found: ${michiganGames.length}\n\n`;

        if (michiganGames.length > 0) {
            debugOutput.textContent += `MICHIGAN GAMES:\n`;
            michiganGames.forEach(g => {
                debugOutput.textContent += `- ${g.home_team} vs ${g.away_team}\n`;
                debugOutput.textContent += `  Date: ${g.commence_time}\n`;
                debugOutput.textContent += `  Bookmakers: ${g.bookmakers?.length || 0}\n\n`;
            });
        } else {
            debugOutput.textContent += `No Michigan games in API response.\n\n`;
            debugOutput.textContent += `First 5 games in response:\n`;
            data.slice(0, 5).forEach(g => {
                debugOutput.textContent += `- ${g.home_team} vs ${g.away_team} (${g.commence_time})\n`;
            });
        }

        // Show remaining API calls
        const remaining = response.headers.get('x-requests-remaining');
        const used = response.headers.get('x-requests-used');
        if (remaining || used) {
            debugOutput.textContent += `\nAPI Usage: ${used || '?'} used, ${remaining || '?'} remaining`;
        }

    } catch (error) {
        debugOutput.textContent += `\nFetch Error: ${error.message}`;
    }
}

function initializeRefresh() {
    elements.refreshBtn.addEventListener('click', () => {
        loadData();
    });
}

async function saveApiKey() {
    const key = elements.oddsApiKeyInput.value.trim();
    if (!key || key === '••••••••••••••••') {
        elements.apiKeyStatus.textContent = 'Please enter a valid API key';
        elements.apiKeyStatus.className = 'api-key-status error';
        return;
    }

    state.oddsApiKey = key;
    localStorage.setItem('oddsApiKey', key);
    elements.oddsApiKeyInput.value = '••••••••••••••••';
    elements.apiKeyStatus.textContent = 'API key saved! Fetching odds...';
    elements.apiKeyStatus.className = 'api-key-status success';

    try {
        await fetchOdds();
        const oddsCount = Object.keys(state.odds).length;
        if (oddsCount > 0) {
            elements.apiKeyStatus.textContent = `API key saved! Found odds for ${Math.floor(oddsCount / 2)} game(s).`;
        } else {
            elements.apiKeyStatus.textContent = 'API key saved! No Michigan odds available right now.';
        }
        elements.apiKeyStatus.className = 'api-key-status success';
    } catch (error) {
        elements.apiKeyStatus.textContent = 'API key saved but failed to fetch odds. Check console for errors.';
        elements.apiKeyStatus.className = 'api-key-status error';
    }
    renderGames();
}

function updateDateHeader() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: CONFIG.mountainTimezone
    };

    if (state.currentView === 'today') {
        elements.currentDate.textContent = `Today - ${now.toLocaleDateString('en-US', options)}`;
    } else if (state.currentView === 'season') {
        if (state.mode === 'olympics') {
            elements.currentDate.textContent = 'All Olympics Events (Feb 6-22)';
        } else {
            elements.currentDate.textContent = 'Remaining Season';
        }
    } else {
        // Week view with offset
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() + (state.weekOffset * 7));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);

        const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: CONFIG.mountainTimezone });
        const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: CONFIG.mountainTimezone });

        let weekLabel = '';
        if (state.weekOffset === 0) {
            weekLabel = 'This Week';
        } else if (state.weekOffset === 1) {
            weekLabel = 'Next Week';
        } else if (state.weekOffset === -1) {
            weekLabel = 'Last Week';
        } else if (state.weekOffset > 0) {
            weekLabel = `${state.weekOffset} Weeks Ahead`;
        } else {
            weekLabel = `${Math.abs(state.weekOffset)} Weeks Ago`;
        }

        elements.currentDate.textContent = `${weekLabel} (${startStr} - ${endStr})`;
    }

    // Update week nav visibility
    updateWeekNavVisibility();
}

async function loadData() {
    showLoading();
    elements.refreshBtn.classList.add('spinning');

    try {
        await fetchSchedules();
        if (state.oddsApiKey) {
            await fetchOdds();
        }
        state.lastUpdated = new Date();
        updateLastUpdated();
        renderGames();
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load schedule. Please try again.');
    } finally {
        elements.refreshBtn.classList.remove('spinning');
    }
}

async function fetchSchedules() {
    if (state.mode === 'olympics') {
        await fetchOlympicsSchedule();
    } else {
        await fetchMichiganSchedules();
    }
}

async function fetchMichiganSchedules() {
    const promises = Object.entries(CONFIG.michiganSports).map(async ([sport, config]) => {
        try {
            const url = `${CONFIG.espnBaseUrl}/${config.espnPath}/teams/${CONFIG.michiganTeamId}/schedule`;
            const response = await fetch(url);

            if (!response.ok) {
                console.warn(`Failed to fetch ${sport} schedule`);
                return [];
            }

            const data = await response.json();
            return parseESPNSchedule(data, sport);
        } catch (error) {
            console.warn(`Error fetching ${sport} schedule:`, error);
            return [];
        }
    });

    const results = await Promise.all(promises);
    state.games = results.flat().sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function fetchOlympicsSchedule() {
    // ESPN Olympics API endpoint
    // Try to fetch from ESPN's Olympics scoreboard/schedule
    const games = [];

    try {
        // ESPN Olympics endpoint for Winter Olympics
        const url = `https://site.api.espn.com/apis/site/v2/sports/olympics/scoreboard`;
        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            const events = data.events || [];

            events.forEach(event => {
                const sportName = event.sport?.slug || event.league?.slug || 'olympics';
                const sportConfig = CONFIG.olympicsSports[sportName] || { icon: '🏅', label: sportName };

                const game = {
                    id: event.id,
                    sport: sportName,
                    date: event.date,
                    name: event.name || event.shortName,
                    shortName: event.shortName,
                    opponent: {
                        name: event.name || 'Olympic Event',
                        abbreviation: '',
                        logo: null
                    },
                    isHome: true,
                    venue: event.competitions?.[0]?.venue?.fullName || CONFIG.olympics2026.location,
                    broadcast: event.competitions?.[0]?.broadcasts?.[0]?.media?.shortName ||
                              event.competitions?.[0]?.geoBroadcasts?.[0]?.media?.shortName || null,
                    status: event.status?.type?.name || 'scheduled',
                    completed: event.status?.type?.completed || false,
                    score: null,
                    isOlympics: true
                };

                games.push(game);
            });
        }
    } catch (error) {
        console.warn('Error fetching Olympics schedule:', error);
    }

    // If no events found, create placeholder events for 2026 Winter Olympics
    if (games.length === 0) {
        games.push(...generateOlympicsSchedule());
    }

    state.games = games.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function generateOlympicsSchedule() {
    // 2026 Winter Olympics Schedule - Milan-Cortina, Italy
    // Olympics run Feb 6-22, 2026
    // Times are in EST (ESPN times), will be converted to Mountain Time for display
    const events = [];

    // Comprehensive schedule based on actual 2026 Winter Olympics
    const schedule = [
        // Feb 6 - Opening Ceremony Day
        { date: '2026-02-06', time: '13:30', sport: 'curling', name: 'Curling - Mixed Doubles Round Robin', broadcast: 'USA' },
        { date: '2026-02-06', time: '14:00', sport: 'figure-skating', name: 'Figure Skating - Team Event (Short)', broadcast: 'NBC' },
        { date: '2026-02-06', time: '19:00', sport: 'ice-hockey', name: 'Ice Hockey - Women\'s Preliminary', broadcast: 'USA' },

        // Feb 7
        { date: '2026-02-07', time: '05:00', sport: 'biathlon', name: 'Biathlon - Mixed Relay Final', broadcast: 'USA' },
        { date: '2026-02-07', time: '06:00', sport: 'cross-country', name: 'Cross-Country - Skiathlon Women', broadcast: 'USA' },
        { date: '2026-02-07', time: '10:00', sport: 'ski-jumping', name: 'Ski Jumping - Normal Hill Final', broadcast: 'NBC' },
        { date: '2026-02-07', time: '12:00', sport: 'speed-skating', name: 'Speed Skating - 5000m Men', broadcast: 'NBC' },
        { date: '2026-02-07', time: '14:00', sport: 'short-track', name: 'Short Track - Mixed Relay Final', broadcast: 'NBC' },
        { date: '2026-02-07', time: '19:00', sport: 'ice-hockey', name: 'Ice Hockey - Women\'s (USA vs CAN)', broadcast: 'NBC' },

        // Feb 8
        { date: '2026-02-08', time: '05:15', sport: 'alpine-skiing', name: 'Alpine Skiing - Downhill Men', broadcast: 'NBC' },
        { date: '2026-02-08', time: '06:00', sport: 'biathlon', name: 'Biathlon - Sprint Women', broadcast: 'USA' },
        { date: '2026-02-08', time: '10:00', sport: 'luge', name: 'Luge - Men\'s Singles Run 1 & 2', broadcast: 'USA' },
        { date: '2026-02-08', time: '12:30', sport: 'snowboard', name: 'Snowboard - Slopestyle Women Final', broadcast: 'NBC' },
        { date: '2026-02-08', time: '14:00', sport: 'figure-skating', name: 'Figure Skating - Team Event Final', broadcast: 'NBC' },
        { date: '2026-02-08', time: '19:30', sport: 'curling', name: 'Curling - Mixed Doubles Semifinal', broadcast: 'USA' },

        // Feb 9
        { date: '2026-02-09', time: '05:00', sport: 'alpine-skiing', name: 'Alpine Skiing - Super-G Women', broadcast: 'NBC' },
        { date: '2026-02-09', time: '06:00', sport: 'biathlon', name: 'Biathlon - Sprint Men', broadcast: 'USA' },
        { date: '2026-02-09', time: '09:30', sport: 'cross-country', name: 'Cross-Country - Skiathlon Men', broadcast: 'USA' },
        { date: '2026-02-09', time: '11:00', sport: 'luge', name: 'Luge - Men\'s Singles Final', broadcast: 'NBC' },
        { date: '2026-02-09', time: '12:30', sport: 'snowboard', name: 'Snowboard - Slopestyle Men Final', broadcast: 'NBC' },
        { date: '2026-02-09', time: '14:00', sport: 'short-track', name: 'Short Track - 1000m Women Final', broadcast: 'NBC' },
        { date: '2026-02-09', time: '15:00', sport: 'curling', name: 'Curling - Mixed Doubles Gold Medal', broadcast: 'NBC' },
        { date: '2026-02-09', time: '19:00', sport: 'ice-hockey', name: 'Ice Hockey - Men\'s Preliminary', broadcast: 'USA' },

        // Feb 10
        { date: '2026-02-10', time: '05:00', sport: 'alpine-skiing', name: 'Alpine Skiing - Downhill Women', broadcast: 'NBC' },
        { date: '2026-02-10', time: '06:30', sport: 'biathlon', name: 'Biathlon - Pursuit Women', broadcast: 'USA' },
        { date: '2026-02-10', time: '10:00', sport: 'luge', name: 'Luge - Women\'s Singles Run 1 & 2', broadcast: 'USA' },
        { date: '2026-02-10', time: '12:00', sport: 'freestyle-skiing', name: 'Freestyle Skiing - Moguls Women Final', broadcast: 'NBC' },
        { date: '2026-02-10', time: '14:00', sport: 'speed-skating', name: 'Speed Skating - 1500m Women', broadcast: 'NBC' },
        { date: '2026-02-10', time: '18:00', sport: 'figure-skating', name: 'Figure Skating - Men\'s Short Program', broadcast: 'NBC' },

        // Feb 11 - Today!
        { date: '2026-02-11', time: '05:30', sport: 'alpine-skiing', name: 'Alpine Skiing - Super-G Men', broadcast: 'NBC' },
        { date: '2026-02-11', time: '06:45', sport: 'nordic-combined', name: 'Nordic Combined - Gundersen NH Final', broadcast: 'USA' },
        { date: '2026-02-11', time: '07:15', sport: 'biathlon', name: 'Biathlon - Individual Women 15km', broadcast: 'USA' },
        { date: '2026-02-11', time: '07:15', sport: 'freestyle-skiing', name: 'Freestyle Skiing - Moguls Men Final', broadcast: 'Peacock' },
        { date: '2026-02-11', time: '11:40', sport: 'ice-hockey', name: 'Ice Hockey - Men\'s (FIN vs SVK)', broadcast: 'USA' },
        { date: '2026-02-11', time: '12:00', sport: 'luge', name: 'Luge - Women\'s Singles Final', broadcast: 'NBC' },
        { date: '2026-02-11', time: '12:00', sport: 'luge', name: 'Luge - Doubles Final', broadcast: 'NBC' },
        { date: '2026-02-11', time: '13:30', sport: 'speed-skating', name: 'Speed Skating - 1000m Men', broadcast: 'NBC' },
        { date: '2026-02-11', time: '14:30', sport: 'figure-skating', name: 'Figure Skating - Ice Dance Final', broadcast: 'NBC' },
        { date: '2026-02-11', time: '18:10', sport: 'ice-hockey', name: 'Ice Hockey - Men\'s (ITA vs SWE)', broadcast: 'USA' },

        // Feb 12
        { date: '2026-02-12', time: '05:00', sport: 'alpine-skiing', name: 'Alpine Skiing - Giant Slalom Women', broadcast: 'NBC' },
        { date: '2026-02-12', time: '06:00', sport: 'biathlon', name: 'Biathlon - Individual Men 20km', broadcast: 'USA' },
        { date: '2026-02-12', time: '10:00', sport: 'bobsled', name: 'Bobsled - Women\'s Monobob Run 1 & 2', broadcast: 'USA' },
        { date: '2026-02-12', time: '12:00', sport: 'snowboard', name: 'Snowboard - Halfpipe Women Final', broadcast: 'NBC' },
        { date: '2026-02-12', time: '14:00', sport: 'short-track', name: 'Short Track - 1500m Men Final', broadcast: 'NBC' },
        { date: '2026-02-12', time: '18:00', sport: 'figure-skating', name: 'Figure Skating - Men\'s Free Skate', broadcast: 'NBC' },
        { date: '2026-02-12', time: '19:00', sport: 'ice-hockey', name: 'Ice Hockey - Women\'s Quarterfinal', broadcast: 'USA' },

        // Feb 13
        { date: '2026-02-13', time: '05:00', sport: 'alpine-skiing', name: 'Alpine Skiing - Giant Slalom Men', broadcast: 'NBC' },
        { date: '2026-02-13', time: '06:00', sport: 'cross-country', name: 'Cross-Country - 10km Women', broadcast: 'USA' },
        { date: '2026-02-13', time: '10:00', sport: 'bobsled', name: 'Bobsled - Women\'s Monobob Final', broadcast: 'NBC' },
        { date: '2026-02-13', time: '12:00', sport: 'snowboard', name: 'Snowboard - Halfpipe Men Final', broadcast: 'NBC' },
        { date: '2026-02-13', time: '14:00', sport: 'speed-skating', name: 'Speed Skating - 5000m Women', broadcast: 'NBC' },
        { date: '2026-02-13', time: '19:00', sport: 'curling', name: 'Curling - Women\'s Round Robin', broadcast: 'USA' },

        // Feb 14
        { date: '2026-02-14', time: '05:00', sport: 'alpine-skiing', name: 'Alpine Skiing - Slalom Women', broadcast: 'NBC' },
        { date: '2026-02-14', time: '06:00', sport: 'biathlon', name: 'Biathlon - Relay Women', broadcast: 'USA' },
        { date: '2026-02-14', time: '10:00', sport: 'skeleton', name: 'Skeleton - Women\'s Run 1 & 2', broadcast: 'USA' },
        { date: '2026-02-14', time: '12:00', sport: 'freestyle-skiing', name: 'Freestyle Skiing - Aerials Mixed Team', broadcast: 'NBC' },
        { date: '2026-02-14', time: '14:00', sport: 'short-track', name: 'Short Track - 500m Women Final', broadcast: 'NBC' },
        { date: '2026-02-14', time: '18:00', sport: 'figure-skating', name: 'Figure Skating - Pairs Short Program', broadcast: 'NBC' },

        // Feb 15
        { date: '2026-02-15', time: '05:00', sport: 'alpine-skiing', name: 'Alpine Skiing - Slalom Men', broadcast: 'NBC' },
        { date: '2026-02-15', time: '06:00', sport: 'biathlon', name: 'Biathlon - Relay Men', broadcast: 'USA' },
        { date: '2026-02-15', time: '10:00', sport: 'skeleton', name: 'Skeleton - Women\'s Final', broadcast: 'NBC' },
        { date: '2026-02-15', time: '12:00', sport: 'snowboard', name: 'Snowboard - Cross Women Final', broadcast: 'NBC' },
        { date: '2026-02-15', time: '14:00', sport: 'speed-skating', name: 'Speed Skating - 1000m Women', broadcast: 'NBC' },
        { date: '2026-02-15', time: '19:00', sport: 'ice-hockey', name: 'Ice Hockey - Women\'s Semifinal', broadcast: 'NBC' },

        // Feb 16
        { date: '2026-02-16', time: '06:00', sport: 'cross-country', name: 'Cross-Country - 4x10km Relay Men', broadcast: 'USA' },
        { date: '2026-02-16', time: '10:00', sport: 'skeleton', name: 'Skeleton - Men\'s Run 1 & 2', broadcast: 'USA' },
        { date: '2026-02-16', time: '12:00', sport: 'snowboard', name: 'Snowboard - Cross Men Final', broadcast: 'NBC' },
        { date: '2026-02-16', time: '14:00', sport: 'short-track', name: 'Short Track - 500m Men Final', broadcast: 'NBC' },
        { date: '2026-02-16', time: '18:00', sport: 'figure-skating', name: 'Figure Skating - Pairs Free Skate', broadcast: 'NBC' },

        // Feb 17
        { date: '2026-02-17', time: '05:00', sport: 'alpine-skiing', name: 'Alpine Skiing - Combined Women', broadcast: 'NBC' },
        { date: '2026-02-17', time: '06:00', sport: 'biathlon', name: 'Biathlon - Mass Start Women', broadcast: 'USA' },
        { date: '2026-02-17', time: '10:00', sport: 'skeleton', name: 'Skeleton - Men\'s Final', broadcast: 'NBC' },
        { date: '2026-02-17', time: '12:00', sport: 'freestyle-skiing', name: 'Freestyle Skiing - Halfpipe Women Final', broadcast: 'NBC' },
        { date: '2026-02-17', time: '14:00', sport: 'speed-skating', name: 'Speed Skating - 1500m Men', broadcast: 'NBC' },
        { date: '2026-02-17', time: '18:00', sport: 'figure-skating', name: 'Figure Skating - Women\'s Short', broadcast: 'NBC' },

        // Feb 18
        { date: '2026-02-18', time: '05:00', sport: 'alpine-skiing', name: 'Alpine Skiing - Combined Men', broadcast: 'NBC' },
        { date: '2026-02-18', time: '06:00', sport: 'biathlon', name: 'Biathlon - Mass Start Men', broadcast: 'USA' },
        { date: '2026-02-18', time: '10:00', sport: 'bobsled', name: 'Bobsled - Two-Man Run 1 & 2', broadcast: 'USA' },
        { date: '2026-02-18', time: '12:00', sport: 'freestyle-skiing', name: 'Freestyle Skiing - Halfpipe Men Final', broadcast: 'NBC' },
        { date: '2026-02-18', time: '14:00', sport: 'curling', name: 'Curling - Women\'s Semifinal', broadcast: 'NBC' },
        { date: '2026-02-18', time: '19:00', sport: 'ice-hockey', name: 'Ice Hockey - Women\'s Gold Medal Game', broadcast: 'NBC' },

        // Feb 19
        { date: '2026-02-19', time: '06:00', sport: 'cross-country', name: 'Cross-Country - 4x5km Relay Women', broadcast: 'USA' },
        { date: '2026-02-19', time: '10:00', sport: 'bobsled', name: 'Bobsled - Two-Man Final', broadcast: 'NBC' },
        { date: '2026-02-19', time: '12:00', sport: 'short-track', name: 'Short Track - Relay Women Final', broadcast: 'NBC' },
        { date: '2026-02-19', time: '14:00', sport: 'speed-skating', name: 'Speed Skating - 500m Women', broadcast: 'NBC' },
        { date: '2026-02-19', time: '18:00', sport: 'figure-skating', name: 'Figure Skating - Women\'s Free Skate', broadcast: 'NBC' },
        { date: '2026-02-19', time: '19:00', sport: 'curling', name: 'Curling - Women\'s Gold Medal', broadcast: 'NBC' },

        // Feb 20
        { date: '2026-02-20', time: '05:00', sport: 'alpine-skiing', name: 'Alpine Skiing - Team Event', broadcast: 'NBC' },
        { date: '2026-02-20', time: '06:00', sport: 'cross-country', name: 'Cross-Country - 50km Mass Start Men', broadcast: 'USA' },
        { date: '2026-02-20', time: '10:00', sport: 'bobsled', name: 'Bobsled - Four-Man Run 1 & 2', broadcast: 'USA' },
        { date: '2026-02-20', time: '12:00', sport: 'short-track', name: 'Short Track - Relay Men Final', broadcast: 'NBC' },
        { date: '2026-02-20', time: '14:00', sport: 'speed-skating', name: 'Speed Skating - 500m Men', broadcast: 'NBC' },
        { date: '2026-02-20', time: '19:00', sport: 'ice-hockey', name: 'Ice Hockey - Men\'s Semifinal 1', broadcast: 'NBC' },

        // Feb 21
        { date: '2026-02-21', time: '06:00', sport: 'cross-country', name: 'Cross-Country - 30km Mass Start Women', broadcast: 'USA' },
        { date: '2026-02-21', time: '10:00', sport: 'bobsled', name: 'Bobsled - Four-Man Final', broadcast: 'NBC' },
        { date: '2026-02-21', time: '12:00', sport: 'speed-skating', name: 'Speed Skating - Mass Start Women', broadcast: 'NBC' },
        { date: '2026-02-21', time: '14:00', sport: 'curling', name: 'Curling - Men\'s Gold Medal', broadcast: 'NBC' },
        { date: '2026-02-21', time: '19:00', sport: 'ice-hockey', name: 'Ice Hockey - Men\'s Semifinal 2', broadcast: 'NBC' },

        // Feb 22 - Closing Day
        { date: '2026-02-22', time: '06:00', sport: 'speed-skating', name: 'Speed Skating - Mass Start Men', broadcast: 'NBC' },
        { date: '2026-02-22', time: '12:00', sport: 'ice-hockey', name: 'Ice Hockey - Men\'s Bronze Medal', broadcast: 'USA' },
        { date: '2026-02-22', time: '14:00', sport: 'ice-hockey', name: 'Ice Hockey - Men\'s Gold Medal Game', broadcast: 'NBC' },
        { date: '2026-02-22', time: '18:00', sport: 'figure-skating', name: 'Figure Skating - Gala Exhibition', broadcast: 'NBC' }
    ];

    schedule.forEach((evt, index) => {
        const [year, month, day] = evt.date.split('-').map(Number);
        const [hours, minutes] = evt.time.split(':').map(Number);

        // Create date in EST (ESPN times), JavaScript will handle conversion
        const eventDate = new Date(Date.UTC(year, month - 1, day, hours + 5, minutes)); // EST is UTC-5

        const sportConfig = CONFIG.olympicsSports[evt.sport] || { icon: '🏅', label: evt.sport };

        events.push({
            id: `olympics-2026-${index}`,
            sport: evt.sport,
            date: eventDate.toISOString(),
            name: evt.name,
            shortName: evt.name,
            opponent: {
                name: evt.name,
                abbreviation: '',
                logo: null
            },
            isHome: true,
            venue: CONFIG.olympics2026.location,
            broadcast: evt.broadcast,
            status: 'scheduled',
            completed: eventDate < new Date(),
            score: null,
            isOlympics: true
        });
    });

    return events;
}

function parseESPNSchedule(data, sport) {
    const games = [];
    const events = data.events || [];

    events.forEach(event => {
        const competition = event.competitions?.[0];
        if (!competition) return;

        const michiganTeam = competition.competitors?.find(c => c.id === CONFIG.michiganTeamId);
        const opponent = competition.competitors?.find(c => c.id !== CONFIG.michiganTeamId);

        if (!michiganTeam || !opponent) return;

        const broadcast = competition.broadcasts?.[0]?.media?.shortName ||
                         competition.geoBroadcasts?.[0]?.media?.shortName ||
                         null;

        const game = {
            id: event.id,
            sport: sport,
            date: event.date,
            name: event.name,
            shortName: event.shortName,
            opponent: {
                name: opponent.team?.displayName || opponent.team?.name || 'TBD',
                abbreviation: opponent.team?.abbreviation || '',
                logo: opponent.team?.logo || null
            },
            isHome: michiganTeam.homeAway === 'home',
            venue: competition.venue?.fullName || null,
            broadcast: broadcast,
            status: event.status?.type?.name || 'scheduled',
            completed: event.status?.type?.completed || false,
            score: null
        };

        // Add score if game is completed or in progress
        if (game.completed || game.status === 'in') {
            game.score = {
                michigan: michiganTeam.score?.displayValue || '0',
                opponent: opponent.score?.displayValue || '0',
                winner: michiganTeam.winner
            };
        }

        games.push(game);
    });

    return games;
}

async function fetchOdds() {
    if (!state.oddsApiKey) {
        console.log('No Odds API key configured');
        return;
    }

    console.log('Fetching odds with API key...');

    const sportKeys = Object.values(CONFIG.michiganSports)
        .filter(s => s.oddsKey)
        .map(s => s.oddsKey);

    for (const sportKey of sportKeys) {
        try {
            const url = `${CONFIG.oddsApiBaseUrl}/${sportKey}/odds/?apiKey=${state.oddsApiKey}&regions=us&markets=spreads,totals&oddsFormat=american`;
            console.log(`Fetching odds for ${sportKey}...`);
            const response = await fetch(url);

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`Failed to fetch odds for ${sportKey}:`, response.status, errorText);
                continue;
            }

            const data = await response.json();
            console.log(`Received ${data.length} games for ${sportKey}`);

            // Log all games to see what's available
            console.log(`All ${sportKey} games from Odds API:`);
            data.forEach(g => {
                const home = g.home_team?.toLowerCase() || '';
                const away = g.away_team?.toLowerCase() || '';
                const hasMichigan = home.includes('michigan') || away.includes('michigan') ||
                                   home.includes('wolverine') || away.includes('wolverine');
                if (hasMichigan) {
                    console.log(`  *** MICHIGAN GAME: ${g.home_team} vs ${g.away_team} on ${g.commence_time}`);
                }
            });
            console.log(`Total games returned: ${data.length}`);

            parseOdds(data, sportKey);
        } catch (error) {
            console.warn(`Error fetching odds for ${sportKey}:`, error);
        }
    }

    console.log('All odds stored:', Object.keys(state.odds));
}

function parseOdds(data, sportKey) {
    console.log(`Parsing ${data.length} games from Odds API for ${sportKey}`);

    data.forEach(game => {
        const homeTeam = game.home_team?.toLowerCase() || '';
        const awayTeam = game.away_team?.toLowerCase() || '';

        // Check for University of Michigan specifically (not Michigan State)
        // The Odds API uses "Michigan Wolverines" for UMich
        // We need to match "michigan" but NOT "michigan state"
        const isMichiganHome = homeTeam.includes('michigan') && !homeTeam.includes('michigan state');
        const isMichiganAway = awayTeam.includes('michigan') && !awayTeam.includes('michigan state');

        // Alternative check: look for "wolverines" specifically
        const isWolverinesHome = homeTeam.includes('wolverines');
        const isWolverinesAway = awayTeam.includes('wolverines');

        const foundMichiganHome = isMichiganHome || isWolverinesHome;
        const foundMichiganAway = isMichiganAway || isWolverinesAway;

        if (!foundMichiganHome && !foundMichiganAway) return;

        console.log(`Found Michigan game: ${game.home_team} vs ${game.away_team}, commence_time: ${game.commence_time}`);

        const bookmaker = game.bookmakers?.[0];
        if (!bookmaker) {
            console.log('No bookmaker data available');
            return;
        }

        const spreads = bookmaker.markets?.find(m => m.key === 'spreads');
        const totals = bookmaker.markets?.find(m => m.key === 'totals');

        // Find Michigan's spread - match "Michigan" but not "Michigan State"
        const michiganSpread = spreads?.outcomes?.find(o => {
            const name = o.name?.toLowerCase() || '';
            return name.includes('michigan') && !name.includes('michigan state') && !name.includes('state');
        });
        const totalOver = totals?.outcomes?.find(o => o.name === 'Over');

        const oddsData = {
            spread: michiganSpread?.point !== undefined ? `${michiganSpread.point > 0 ? '+' : ''}${michiganSpread.point}` : null,
            spreadOdds: michiganSpread?.price || null,
            total: totalOver?.point || null,
            bookmaker: bookmaker.title
        };

        // Determine the opponent
        const opponent = foundMichiganHome ? game.away_team : game.home_team;

        // Store with multiple key formats to improve matching
        // Use UTC date string for consistency (YYYY-MM-DD format)
        const gameDate = new Date(game.commence_time);
        const utcDateStr = gameDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        const localDateStr = gameDate.toDateString(); // Also keep local for fallback

        // Store the raw opponent name (lowercase) with both date formats
        const key1 = `${opponent?.toLowerCase()}_${utcDateStr}`;
        const key2 = `${opponent?.toLowerCase()}_${localDateStr}`;
        state.odds[key1] = oddsData;
        state.odds[key2] = oddsData;

        // Also store just the date for this sport (fallback matching)
        const dateOnlyKey = `michigan_${sportKey}_${utcDateStr}`;
        const dateOnlyKey2 = `michigan_${sportKey}_${localDateStr}`;
        state.odds[dateOnlyKey] = { ...oddsData, opponent: opponent };
        state.odds[dateOnlyKey2] = { ...oddsData, opponent: opponent };

        console.log(`Stored odds with keys: ${key1}, ${key2}`, oddsData);
        console.log(`Odds data:`, oddsData);
    });
}

function getOddsForGame(game) {
    const gameDate = new Date(game.date);
    const utcDateStr = gameDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    const localDateStr = gameDate.toDateString();
    const opponentName = game.opponent.name.toLowerCase();

    console.log(`Looking for odds: opponent="${opponentName}", utcDate="${utcDateStr}", localDate="${localDateStr}"`);
    console.log(`Available odds keys:`, Object.keys(state.odds));

    // Try exact match with UTC date first
    const exactKeyUtc = `${opponentName}_${utcDateStr}`;
    if (state.odds[exactKeyUtc]) {
        console.log(`Found exact UTC match: ${exactKeyUtc}`);
        return state.odds[exactKeyUtc];
    }

    // Try exact match with local date
    const exactKeyLocal = `${opponentName}_${localDateStr}`;
    if (state.odds[exactKeyLocal]) {
        console.log(`Found exact local match: ${exactKeyLocal}`);
        return state.odds[exactKeyLocal];
    }

    // Try matching by partial name (team names differ between ESPN and Odds API)
    // ESPN: "Penn State Nittany Lions", Odds API: "Penn State"
    for (const [key, odds] of Object.entries(state.odds)) {
        // Check if the key contains either date format
        const hasUtcDate = key.includes(utcDateStr);
        const hasLocalDate = key.includes(localDateStr);
        if (!hasUtcDate && !hasLocalDate) continue;
        if (key.startsWith('michigan_')) continue; // Skip fallback keys for now

        // Extract the opponent part from the key (remove both possible date suffixes)
        let keyOpponent = key;
        if (hasUtcDate) {
            keyOpponent = key.replace(`_${utcDateStr}`, '');
        } else if (hasLocalDate) {
            keyOpponent = key.replace(`_${localDateStr}`, '');
        }

        // Check various matching patterns
        const opponentWords = opponentName.split(' ').filter(w => w.length > 2);
        const keyWords = keyOpponent.split(' ').filter(w => w.length > 2);

        // Check if key opponent is contained in ESPN opponent name
        if (opponentName.includes(keyOpponent)) {
            console.log(`Found partial match (key in name): ${key}`);
            return odds;
        }

        // Check if ESPN opponent name is contained in key opponent
        if (keyOpponent.includes(opponentName.split(' ')[0])) {
            console.log(`Found partial match (first word): ${key}`);
            return odds;
        }

        // Check if first significant word matches
        if (opponentWords[0] && keyWords[0] && opponentWords[0] === keyWords[0]) {
            console.log(`Found word match: ${key}`);
            return odds;
        }

        // Check if any significant words match
        const matchingWords = opponentWords.filter(w => keyWords.includes(w));
        if (matchingWords.length > 0) {
            console.log(`Found word overlap match: ${key} (matching: ${matchingWords.join(', ')})`);
            return odds;
        }
    }

    // Fallback: match by date and sport only
    const sportKey = CONFIG.michiganSports[game.sport]?.oddsKey;
    if (sportKey) {
        const fallbackKeyUtc = `michigan_${sportKey}_${utcDateStr}`;
        if (state.odds[fallbackKeyUtc]) {
            console.log(`Using UTC fallback key: ${fallbackKeyUtc}`);
            return state.odds[fallbackKeyUtc];
        }
        const fallbackKeyLocal = `michigan_${sportKey}_${localDateStr}`;
        if (state.odds[fallbackKeyLocal]) {
            console.log(`Using local fallback key: ${fallbackKeyLocal}`);
            return state.odds[fallbackKeyLocal];
        }
    }

    console.log(`No odds found for ${opponentName} on ${utcDateStr} or ${localDateStr}`);
    return null;
}

function renderGames() {
    const filteredGames = filterGames();

    if (filteredGames.length === 0) {
        showNoGames();
        return;
    }

    if (state.currentView === 'today') {
        renderTodayView(filteredGames);
    } else if (state.currentView === 'season') {
        renderSeasonView(filteredGames);
    } else {
        renderWeekView(filteredGames);
    }
}

function filterGames() {
    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.mountainTimezone }));
    today.setHours(0, 0, 0, 0);

    let startDate = new Date(today);
    let endDate = new Date(today);

    if (state.currentView === 'today') {
        endDate.setDate(endDate.getDate() + 1);
    } else if (state.currentView === 'week') {
        // Apply week offset
        startDate.setDate(startDate.getDate() + (state.weekOffset * 7));
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
    } else if (state.currentView === 'season') {
        // Show only future games for season view (today or later)
        return state.games.filter(game => {
            if (state.currentSport !== 'all' && game.sport !== state.currentSport) {
                return false;
            }
            // Only include games from today or in the future
            const gameDate = new Date(game.date);
            return gameDate >= today;
        });
    }

    return state.games.filter(game => {
        // Filter by sport
        if (state.currentSport !== 'all' && game.sport !== state.currentSport) {
            return false;
        }

        // Filter by date
        const gameDate = new Date(game.date);
        const gameDateLocal = new Date(gameDate.toLocaleString('en-US', { timeZone: CONFIG.mountainTimezone }));
        gameDateLocal.setHours(0, 0, 0, 0);

        return gameDateLocal >= startDate && gameDateLocal < endDate;
    });
}

function renderTodayView(games) {
    const html = `
        <div class="games-list">
            ${games.map(game => renderGameCard(game)).join('')}
        </div>
    `;
    elements.gamesContainer.innerHTML = html;
}

function renderWeekView(games) {
    // Group games by day
    const gamesByDay = {};
    games.forEach(game => {
        const dateKey = new Date(game.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            timeZone: CONFIG.mountainTimezone
        });
        if (!gamesByDay[dateKey]) {
            gamesByDay[dateKey] = [];
        }
        gamesByDay[dateKey].push(game);
    });

    const upcomingGames = games.filter(g => !g.completed);
    const addAllButton = upcomingGames.length > 0 ? `
        <div class="add-all-calendar">
            <button onclick="downloadAllGamesToCalendar()" class="add-all-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                    <line x1="12" y1="14" x2="12" y2="18"></line>
                    <line x1="10" y1="16" x2="14" y2="16"></line>
                </svg>
                Add All ${upcomingGames.length} Games to Calendar
            </button>
        </div>
    ` : '';

    const html = addAllButton + Object.entries(gamesByDay).map(([day, dayGames]) => `
        <div class="day-section">
            <div class="day-header">${day}</div>
            <div class="games-list">
                ${dayGames.map(game => renderGameCard(game)).join('')}
            </div>
        </div>
    `).join('');

    elements.gamesContainer.innerHTML = html;
}

function renderSeasonView(games) {
    // Group games by month
    const gamesByMonth = {};
    games.forEach(game => {
        const monthKey = new Date(game.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            timeZone: CONFIG.mountainTimezone
        });
        if (!gamesByMonth[monthKey]) {
            gamesByMonth[monthKey] = [];
        }
        gamesByMonth[monthKey].push(game);
    });

    const upcomingGames = games.filter(g => !g.completed);
    const addAllButton = upcomingGames.length > 0 ? `
        <div class="add-all-calendar">
            <button onclick="downloadAllGamesToCalendar()" class="add-all-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                    <line x1="12" y1="14" x2="12" y2="18"></line>
                    <line x1="10" y1="16" x2="14" y2="16"></line>
                </svg>
                Add All ${upcomingGames.length} Upcoming Games to Calendar
            </button>
        </div>
    ` : '';

    const html = addAllButton + Object.entries(gamesByMonth).map(([month, monthGames]) => `
        <div class="month-section">
            <div class="month-header">${month}</div>
            <div class="games-list">
                ${monthGames.map(game => renderGameCard(game)).join('')}
            </div>
        </div>
    `).join('');

    elements.gamesContainer.innerHTML = html;
}

function getDraftKingsUrl(game) {
    // DraftKings sport category mapping
    const dkSportMap = {
        football: 'football/ncaaf',
        basketball: 'basketball/ncaab',
        hockey: 'hockey/ncaah'
    };
    const dkSport = dkSportMap[game.sport] || 'football/ncaaf';
    return `https://sportsbook.draftkings.com/leagues/${dkSport}`;
}

function getFanDuelUrl(game) {
    // FanDuel sport category mapping
    const fdSportMap = {
        football: 'college-football',
        basketball: 'college-basketball',
        hockey: 'college-hockey'
    };
    const fdSport = fdSportMap[game.sport] || 'college-football';
    return `https://sportsbook.fanduel.com/navigation/${fdSport}`;
}

function formatDateForCalendar(date) {
    // Format: YYYYMMDDTHHMMSSZ
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function getGoogleCalendarUrl(game) {
    const startDate = new Date(game.date);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // Assume 3 hour event

    const isOlympics = game.isOlympics || state.mode === 'olympics';
    const sportConfig = isOlympics
        ? (CONFIG.olympicsSports[game.sport] || { label: game.sport })
        : (CONFIG.michiganSports[game.sport] || { label: game.sport });

    let title, details;
    if (isOlympics) {
        title = encodeURIComponent(`Olympics: ${game.name || sportConfig.label}`);
        details = encodeURIComponent(`2026 Winter Olympics\n${sportConfig.label}\n${game.broadcast ? 'Watch on: ' + game.broadcast : ''}`);
    } else {
        title = encodeURIComponent(`Michigan ${sportConfig.label}: ${game.isHome ? 'vs' : '@'} ${game.opponent.name}`);
        details = encodeURIComponent(`Michigan Wolverines ${sportConfig.label}\n${game.isHome ? 'Home' : 'Away'} game\n${game.broadcast ? 'Watch on: ' + game.broadcast : ''}`);
    }
    const location = encodeURIComponent(game.venue || '');

    const start = formatDateForCalendar(startDate);
    const end = formatDateForCalendar(endDate);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

function getOutlookCalendarUrl(game) {
    const startDate = new Date(game.date);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // Assume 3 hour event

    const isOlympics = game.isOlympics || state.mode === 'olympics';
    const sportConfig = isOlympics
        ? (CONFIG.olympicsSports[game.sport] || { label: game.sport })
        : (CONFIG.michiganSports[game.sport] || { label: game.sport });

    let title, details;
    if (isOlympics) {
        title = encodeURIComponent(`Olympics: ${game.name || sportConfig.label}`);
        details = encodeURIComponent(`2026 Winter Olympics\n${sportConfig.label}\n${game.broadcast ? 'Watch on: ' + game.broadcast : ''}`);
    } else {
        title = encodeURIComponent(`Michigan ${sportConfig.label}: ${game.isHome ? 'vs' : '@'} ${game.opponent.name}`);
        details = encodeURIComponent(`Michigan Wolverines ${sportConfig.label}\n${game.isHome ? 'Home' : 'Away'} game\n${game.broadcast ? 'Watch on: ' + game.broadcast : ''}`);
    }
    const location = encodeURIComponent(game.venue || '');

    const start = startDate.toISOString();
    const end = endDate.toISOString();

    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${start}&enddt=${end}&body=${details}&location=${location}`;
}

function generateICSFile(games) {
    const events = games.map(game => {
        const startDate = new Date(game.date);
        const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

        const isOlympics = game.isOlympics || state.mode === 'olympics';
        const sportConfig = isOlympics
            ? (CONFIG.olympicsSports[game.sport] || { label: game.sport })
            : (CONFIG.michiganSports[game.sport] || { label: game.sport });

        let title, description;
        if (isOlympics) {
            title = `Olympics: ${game.name || sportConfig.label}`;
            description = `2026 Winter Olympics\\n${sportConfig.label}\\n${game.broadcast ? 'Watch on: ' + game.broadcast : ''}`;
        } else {
            title = `Michigan ${sportConfig.label}: ${game.isHome ? 'vs' : '@'} ${game.opponent.name}`;
            description = `Michigan Wolverines ${sportConfig.label}\\n${game.isHome ? 'Home' : 'Away'} game\\n${game.broadcast ? 'Watch on: ' + game.broadcast : ''}`;
        }

        return `BEGIN:VEVENT
DTSTART:${formatDateForCalendar(startDate)}
DTEND:${formatDateForCalendar(endDate)}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${game.venue || ''}
END:VEVENT`;
    }).join('\n');

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Michigan Sports Schedule//EN
${events}
END:VCALENDAR`;
}

function downloadAllGamesToCalendar() {
    const filteredGames = filterGames().filter(g => !g.completed);
    if (filteredGames.length === 0) {
        alert('No upcoming games to add to calendar.');
        return;
    }

    const icsContent = generateICSFile(filteredGames);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'michigan-wolverines-games.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getStreamingUrl(broadcast) {
    if (!broadcast) return null;

    const channel = broadcast.toUpperCase();

    // Streaming services - direct links
    const streamingLinks = {
        'ESPN+': 'https://plus.espn.com/',
        'ESPNPLUS': 'https://plus.espn.com/',
        'PEACOCK': 'https://www.peacocktv.com/sports',
        'PARAMOUNT+': 'https://www.paramountplus.com/sports/',
        'PARAMOUNT PLUS': 'https://www.paramountplus.com/sports/',
        'BTN+': 'https://www.bigtenplus.com/',
        'BTN PLUS': 'https://www.bigtenplus.com/',
        'B1G+': 'https://www.bigtenplus.com/',
        'AMAZON': 'https://www.amazon.com/primevideo',
        'PRIME': 'https://www.amazon.com/primevideo',
        'PRIME VIDEO': 'https://www.amazon.com/primevideo',
        'APPLE TV': 'https://tv.apple.com/sports',
        'APPLE TV+': 'https://tv.apple.com/sports',
    };

    // Check for streaming services first
    for (const [service, url] of Object.entries(streamingLinks)) {
        if (channel.includes(service)) {
            return { url, isStreaming: true };
        }
    }

    // Broadcast TV channels - use YouTube TV
    const broadcastChannels = [
        'ESPN', 'ESPN2', 'ESPNU', 'ESPNEWS',
        'FOX', 'FS1', 'FS2',
        'CBS', 'CBSSN',
        'NBC', 'NBCSN', 'USA',
        'BTN', 'BIG TEN NETWORK',
        'ABC',
        'TNT', 'TBS', 'TRUTV',
        'ACCN', 'ACC NETWORK',
        'SECN', 'SEC NETWORK'
    ];

    for (const ch of broadcastChannels) {
        if (channel.includes(ch)) {
            // YouTube TV live guide
            return { url: 'https://tv.youtube.com/view/live-guide', isStreaming: false };
        }
    }

    return null;
}

function renderGameCard(game) {
    // Get sport config from the appropriate source
    const sportConfig = state.mode === 'olympics'
        ? (CONFIG.olympicsSports[game.sport] || { icon: '🏅', label: game.sport })
        : (CONFIG.michiganSports[game.sport] || { icon: '🏅', label: game.sport });

    const gameTime = formatTime(game.date);
    const gameDate = formatDate(game.date);
    const odds = state.mode === 'michigan' ? getOddsForGame(game) : null;
    const draftKingsUrl = getDraftKingsUrl(game);
    const fanDuelUrl = getFanDuelUrl(game);
    const googleCalUrl = getGoogleCalendarUrl(game);
    const outlookCalUrl = getOutlookCalendarUrl(game);
    const streamingInfo = getStreamingUrl(game.broadcast);

    const completedClass = game.completed ? 'completed' : '';
    const isOlympics = game.isOlympics || state.mode === 'olympics';

    let scoreHtml = '';
    if (game.score) {
        const resultClass = game.score.winner ? 'win' : 'loss';
        const resultText = game.score.winner ? 'W' : 'L';
        scoreHtml = `
            <div class="final-score ${resultClass}">
                ${resultText} ${game.score.michigan}-${game.score.opponent}
            </div>
        `;
    }

    let bettingHtml = '';
    // Only show betting for Michigan mode
    if (!game.completed && !isOlympics) {
        const gameDateObj = new Date(game.date);
        const now = new Date();
        const daysUntilGame = Math.ceil((gameDateObj - now) / (1000 * 60 * 60 * 24));
        let oddsMessage = 'Add API key for betting lines';
        if (state.oddsApiKey) {
            if (daysUntilGame > 3) {
                oddsMessage = 'Odds available closer to game day';
            } else {
                oddsMessage = 'Odds not available';
            }
        }

        bettingHtml = `
            <div class="betting-line">
                ${odds ? `
                    ${odds.spread ? `<span class="odds-item"><span class="label">Spread:</span><span class="value">${odds.spread}</span></span>` : ''}
                    ${odds.total ? `<span class="odds-item"><span class="label">O/U:</span><span class="value">${odds.total}</span></span>` : ''}
                ` : `
                    <span class="odds-unavailable">${oddsMessage}</span>
                `}
                <div class="betting-buttons">
                    <a href="${draftKingsUrl}" target="_blank" class="draftkings-btn" title="Bet on DraftKings">
                        <span class="dk-logo">DK</span>
                    </a>
                    <a href="${fanDuelUrl}" target="_blank" class="fanduel-btn" title="Bet on FanDuel">
                        <span class="fd-logo">FD</span>
                    </a>
                </div>
            </div>
        `;
    }

    let calendarHtml = '';
    if (!game.completed) {
        calendarHtml = `
            <div class="calendar-links">
                <a href="${googleCalUrl}" target="_blank" class="calendar-btn google-cal" title="Add to Google Calendar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Google
                </a>
                <a href="${outlookCalUrl}" target="_blank" class="calendar-btn outlook-cal" title="Add to Outlook Calendar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Outlook
                </a>
            </div>
        `;
    }

    // Different display for Olympics vs Michigan
    const matchupHtml = isOlympics ? `
        <div class="matchup">
            <span class="opponent">${game.name || game.opponent.name}</span>
        </div>
    ` : `
        <div class="matchup">
            <span class="home-away ${game.isHome ? 'home' : 'away'}">${game.isHome ? 'Home' : 'Away'}</span>
            <span class="opponent">${game.isHome ? 'vs' : '@'} ${game.opponent.name}</span>
        </div>
    `;

    return `
        <div class="game-card ${completedClass}">
            <div class="sport-badge">
                <span class="icon">${sportConfig.icon}</span>
                <span class="label">${sportConfig.label}</span>
            </div>
            <div class="game-info">
                ${matchupHtml}
                <div class="game-details">
                    ${game.broadcast ? `
                        <span class="detail">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                                <polyline points="17 2 12 7 7 2"></polyline>
                            </svg>
                            ${streamingInfo ? `
                                <a href="${streamingInfo.url}" target="_blank" class="tv-channel tv-link" title="${streamingInfo.isStreaming ? 'Watch on ' + game.broadcast : 'Watch on YouTube TV'}">
                                    ${game.broadcast} <span class="watch-icon">▶</span>
                                </a>
                            ` : `
                                <span class="tv-channel">${game.broadcast}</span>
                            `}
                        </span>
                    ` : ''}
                    ${game.venue ? `
                        <span class="detail">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            ${game.venue}
                        </span>
                    ` : ''}
                </div>
                ${bettingHtml}
                ${calendarHtml}
            </div>
            <div class="game-right">
                ${game.completed ? scoreHtml : `
                    <div class="game-time">${gameTime}</div>
                    <div class="game-date">${gameDate}</div>
                `}
            </div>
        </div>
    `;
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: CONFIG.mountainTimezone
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: CONFIG.mountainTimezone
    });
}

function showLoading() {
    elements.gamesContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading schedule...</p>
        </div>
    `;
}

function showNoGames() {
    const sports = state.mode === 'olympics' ? CONFIG.olympicsSports : CONFIG.michiganSports;
    const sportLabel = state.currentSport === 'all' ? '' : sports[state.currentSport]?.label || '';
    const timeframe = state.currentView === 'today' ? 'today' : 'this week';

    const message = state.mode === 'olympics'
        ? 'Check back closer to the Olympics for event schedules.'
        : 'Check back later for upcoming Michigan Wolverines games.';

    const icon = state.mode === 'olympics' ? '🏅' : '📅';
    const eventType = state.mode === 'olympics' ? 'Events' : 'Games';

    elements.gamesContainer.innerHTML = `
        <div class="no-games">
            <div class="no-games-icon">${icon}</div>
            <h3>No ${sportLabel} ${eventType} ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}</h3>
            <p>${message}</p>
        </div>
    `;
}

function showError(message) {
    elements.gamesContainer.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
        </div>
    `;
}

function updateLastUpdated() {
    if (state.lastUpdated) {
        elements.lastUpdatedTime.textContent = state.lastUpdated.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: CONFIG.mountainTimezone
        }) + ' MT';
    }
}
