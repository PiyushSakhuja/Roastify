// --- CONFIGURATION ---
// Spotify Client ID is public by design (safe to expose in frontend code).
const CLIENT_ID = '6c8912cc85ba4a4d8b15b1f12bdc0de9';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'user-top-read user-read-private';

// Backend URL: override by setting `window.ROASTIFY_BACKEND_URL` before this
// script loads (e.g. in a small inline <script> tag), or edit the fallback
// below for your deployment. Keeping this out of hardcoded prod URLs makes
// local development and staging environments easier to test.
const BACKEND_URL = window.ROASTIFY_BACKEND_URL || 'http://localhost:8888';

// --- DOM Elements ---
const initialStateEl = document.getElementById('initial-state');
const loginBtn = document.getElementById('login-btn');
const resultsAreaEl = document.getElementById('results-area');
const loadingEl = document.getElementById('loading');
const loadingMessageEl = document.getElementById('loading-message');
const roastOutputEl = document.getElementById('roast-output');
const roastTextEl = document.getElementById('roast-text');
const sourceDataEl = document.getElementById('source-data').querySelector('ul');
const errorOutputEl = document.getElementById('error-output');
const errorMessageEl = document.getElementById('error-message');
const appStatusEl = document.getElementById('app-status');
const retryBtn = document.getElementById('retry-btn');
const providerSelectEl = document.getElementById('provider-select');
const providerUsedEl = document.getElementById('provider-used');

let lastSpotifyData = null;

// --- Utility Functions ---

function generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}

/**
 * Robust fetch utility with exponential backoff for retries.
 * Only retries on 429 (rate limited) and 5xx (server error) responses —
 * client errors (4xx other than 429) are not retried since retrying
 * a malformed request won't help.
 */
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const retryable = response.status === 429 || response.status >= 500;
                if (retryable && i < retries - 1) {
                    await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
                    continue;
                }
                const errorBody = await response.text();
                throw new Error(`API call failed with status: ${response.status}. Response: ${errorBody}`);
            }
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
        }
    }
}

/**
 * Fetches which AI agents are configured on the backend and populates
 * the provider picker. Falls back to "Auto" only if the request fails
 * or the backend doesn't expose the endpoint.
 */
async function loadProviders() {
    if (!providerSelectEl) return;

    try {
        const response = await fetch(`${BACKEND_URL}/api/providers`);
        if (!response.ok) throw new Error(`status ${response.status}`);
        const data = await response.json();
        const configured = (data.providers || []).filter((p) => p.configured);

        providerSelectEl.innerHTML = '';

        const autoOption = document.createElement('option');
        autoOption.value = '';
        autoOption.textContent = 'Auto (first available)';
        providerSelectEl.appendChild(autoOption);

        configured.forEach((p) => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.label;
            providerSelectEl.appendChild(option);
        });

        if (configured.length === 0) {
            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = 'No AI agents configured on server';
            noneOption.disabled = true;
            providerSelectEl.appendChild(noneOption);
        }
    } catch (error) {
        console.warn('Could not load provider list, defaulting to Auto:', error.message);
    }
}

// --- CORE SPOTIFY & AI LOGIC ---

function displayError(message) {
    loadingEl.classList.add('hidden');
    roastOutputEl.classList.add('hidden');
    errorOutputEl.classList.remove('hidden');
    errorMessageEl.textContent = message;
    appStatusEl.textContent = 'Authorization Failed';
}

function displayResults(roastText, data, providerUsed) {
    loadingEl.classList.add('hidden');
    errorOutputEl.classList.add('hidden');
    roastOutputEl.classList.remove('hidden');
    roastTextEl.textContent = roastText;
    appStatusEl.textContent = 'Roast Delivered.';
    lastSpotifyData = data;

    if (providerUsedEl) {
        providerUsedEl.textContent = providerUsed ? `Roasted by: ${providerUsed}` : '';
    }

    sourceDataEl.innerHTML = `
        <li class="text-white"><span class="font-semibold text-[var(--spotify-green)]">Top Artists:</span> ${escapeHtml(data.topArtists.join(', '))}</li>
        <li class="text-white"><span class="font-semibold text-[var(--spotify-green)]">Top Tracks:</span> ${escapeHtml(data.topTracks.join(', '))}</li>
        <li class="text-white"><span class="font-semibold text-[var(--spotify-green)]">Top Genres:</span> ${escapeHtml(data.topGenres.join(', '))}</li>
    `;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Step 1: Initiates the Spotify OAuth flow by redirecting the user.
 */
function initiateSpotifyLogin() {
    const state = generateRandomString(16);
    sessionStorage.setItem('spotify_auth_state', state);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('scope', SCOPES);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('state', state);

    window.location.href = authUrl.toString();
}

/**
 * Step 2: Exchanges the authorization code for an Access Token via the backend.
 */
async function exchangeCodeForToken(code) {
    loadingMessageEl.textContent = 'Exchanging authorization code for access token...';

    const response = await fetchWithRetry(`${BACKEND_URL}/api/token-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
    });

    const data = await response.json();

    if (data.access_token) {
        return data.access_token;
    }
    throw new Error(data.details || data.error || 'Token exchange failed.');
}

/**
 * Step 3: Fetches real data from Spotify using the Access Token.
 */
async function fetchSpotifyData(token) {
    loadingMessageEl.textContent = 'Fetching your top tracks and artists...';

    const headers = { Authorization: `Bearer ${token}` };

    let artistsResponse;
    let tracksResponse;
    try {
        artistsResponse = await fetchWithRetry('https://api.spotify.com/v1/me/top/artists?limit=5&time_range=long_term', { headers });
        tracksResponse = await fetchWithRetry('https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=long_term', { headers });
    } catch (error) {
        if (error.message.includes('status: 401')) {
            throw new Error('Your Spotify session expired. Please log in again.');
        }
        throw error;
    }

    const artistsData = await artistsResponse.json();
    const topArtists = artistsData.items?.length ? artistsData.items.map((item) => item.name) : ['No top artists found'];

    const tracksData = await tracksResponse.json();
    const topTracks = tracksData.items?.length
        ? tracksData.items.map((item) => `${item.name} by ${item.artists[0].name}`)
        : ['No top tracks found'];

    const allGenres = artistsData.items ? artistsData.items.flatMap((artist) => artist.genres).filter((v, i, a) => a.indexOf(v) === i) : [];
    const topGenres = allGenres.length ? allGenres.slice(0, 5) : ['No genre data available'];

    return { topArtists, topTracks, topGenres };
}

/**
 * Step 4: Calls the backend, which calls the selected (or fallback-chained)
 * AI agent, to generate a roast.
 */
async function getRoastFromBackend(data) {
    loadingMessageEl.textContent = 'Sending your questionable taste to the AI critic...';

    const selectedProvider = providerSelectEl ? providerSelectEl.value : '';
    const payload = selectedProvider ? { ...data, provider: selectedProvider } : data;

    const response = await fetchWithRetry(`${BACKEND_URL}/api/generate-roast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.roastText) {
        return { roastText: result.roastText, provider: result.provider };
    }
    throw new Error(result.details || result.error || 'Backend failed to generate roast.');
}

/**
 * Runs the roast generation using already-fetched Spotify data (used by
 * the "Roast me again" button so we don't force a fresh OAuth round trip).
 */
async function runRoast(spotifyData) {
    initialStateEl.classList.add('hidden');
    resultsAreaEl.classList.remove('hidden');
    loadingEl.classList.remove('hidden');
    roastOutputEl.classList.add('hidden');
    errorOutputEl.classList.add('hidden');

    try {
        const { roastText, provider } = await getRoastFromBackend(spotifyData);
        displayResults(roastText, spotifyData, provider);
    } catch (error) {
        console.error('Roast generation failed:', error);
        displayError(`Roast generation failed: ${error.message}`);
    }
}

/**
 * Handles the redirect back from Spotify and orchestrates the full flow.
 */
async function handleSpotifyCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('spotify_auth_state');

    history.replaceState(null, '', window.location.pathname);

    if (params.get('error')) {
        displayError(`Spotify authentication failed: ${params.get('error_description') || 'User denied access or an unknown error occurred.'}`);
        return;
    }

    if (!code || state !== storedState) {
        if (code) {
            displayError('Authentication failed due to a state mismatch. Please try logging in again.');
        }
        return;
    }

    initialStateEl.classList.add('hidden');
    resultsAreaEl.classList.remove('hidden');
    loadingEl.classList.remove('hidden');

    try {
        const accessToken = await exchangeCodeForToken(code);
        const spotifyData = await fetchSpotifyData(accessToken);
        const { roastText, provider } = await getRoastFromBackend(spotifyData);
        displayResults(roastText, spotifyData, provider);
    } catch (error) {
        console.error('Full authentication flow failed:', error);
        displayError(`${error.message}`);
    } finally {
        sessionStorage.removeItem('spotify_auth_state');
    }
}

// --- Initialization ---

loadProviders();

if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
    handleSpotifyCallback();
} else {
    loginBtn.addEventListener('click', initiateSpotifyLogin);
}

if (retryBtn) {
    retryBtn.addEventListener('click', () => {
        if (lastSpotifyData) {
            runRoast(lastSpotifyData);
        } else {
            initiateSpotifyLogin();
        }
    });
}
