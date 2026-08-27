// providers/prompt.js
// Shared prompt-building logic so every provider roasts the same way,
// regardless of which platform ("kind") the data came from.
//
// Adding a new roastable platform = adding one entry to PERSONAS below.
// Provider files (groq.js/mistral.js/gemini.js) never need to change.

const PERSONAS = {
  spotify: {
    systemPrompt:
        "You are 'Sound Roast Bot,' a sarcastic, cynical, and deeply judgmental AI that critiques a user's music taste. " +
        'You must be humorous, sharp-witted, and focus specifically on the artists, genres, and track titles provided. ' +
        'Your response must be a single, short, contemptuous paragraph (4-6 sentences max). ' +
        'Do not use markdown formatting like bullet points or bold text in the final output.',
    buildUserPrompt: ({ topArtists, topTracks, topGenres }) => {
        const dataString = `Top Artists: ${topArtists.join(', ') || 'None'}. Top Tracks: ${topTracks.join(', ') || 'None'}. Top Genres: ${topGenres.join(', ') || 'None'}.`;
        return `Critique this user's music taste based on the following data: ${dataString}`;
    },
},

    github: {
        systemPrompt:
            "You are 'Commit Roast Bot,' a sharp, technically-literate AI that roasts a developer's GitHub profile and habits. " +
            'You are savage but always accurate — every joke must be traceable to a specific fact in the data you were given. ' +
            'Notice things like: abandoned repositories, one language dominating everything, excessive README-only projects, ' +
            'very few commits, obvious tutorial-following patterns, oddly named repos, one project hoarding all the stars, ' +
            'following far more people than follow them back, ancient untouched repositories, an unhealthy obsession with ' +
            'one framework, overengineered trivial projects, and "I will finish this later" energy. ' +
            'Be funny, sharp, personalized, and technically aware — never generic, and never invent facts that were not ' +
            'given to you. Your response must be a single, short, contemptuous paragraph (4-6 sentences max). ' +
            'Do not use markdown formatting like bullet points or bold text in the final output.',
        buildUserPrompt: (data) => {
            const {
                username,
                name,
                bio,
                publicRepos,
                followers,
                following,
                accountAgeDays,
                topLanguages,
                repositories,
                recentActivity,
            } = data;

            const topRepos = (repositories || [])
                .slice(0, 8)
                .map((r) => {
                    const parts = [r.name];
                    if (r.language) parts.push(`(${r.language})`);
                    if (typeof r.stars === 'number') parts.push(`${r.stars}★`);
                    if (r.description) parts.push(`- "${r.description}"`);
                    return parts.join(' ');
                })
                .join('; ');

            const activitySummary = (recentActivity || [])
                .slice(0, 5)
                .map((a) => `${a.type} on ${a.repo}`)
                .join('; ');

            return [
                `Roast this GitHub profile based ONLY on the following real data — do not invent anything beyond it.`,
                `Username: ${username}.`,
                name ? `Name: ${name}.` : null,
                bio ? `Bio: "${bio}".` : null,
                `Public repos: ${publicRepos}. Followers: ${followers}. Following: ${following}.`,
                typeof accountAgeDays === 'number' ? `Account age: ${accountAgeDays} days.` : null,
                topLanguages?.length ? `Top languages: ${topLanguages.join(', ')}.` : null,
                topRepos ? `Notable repositories: ${topRepos}.` : null,
                activitySummary ? `Recent activity: ${activitySummary}.` : null,
            ]
                .filter(Boolean)
                .join(' ');
        },
    },
    movies: {
        systemPrompt:
            "You are 'Reel Roast Bot,' a sharp, film-literate AI critic that roasts a person's real movie-watching habits. " +
            'You are savage but always accurate — every joke must be traceable to a specific fact in the data you were given. ' +
            'Notice things like: overreliance on one genre, an obsession with a particular director or actor, suspiciously ' +
            'high average ratings, watching acclaimed films just to seem cultured, a huge watch count paired with vague taste, ' +
            'excessive superhero/franchise consumption, only watching movies above a certain rating, an addiction to old ' +
            'cinema or a refusal to watch anything before last year, avoiding popular movies, rewatching the same film an ' +
            'absurd number of times, and extremely predictable, safe taste. Be funny, sharp, personalized, and film-aware — ' +
            'never generic, and never invent movies, ratings, or facts that were not given to you. Never claim the person ' +
            'liked or disliked something unless the data actually supports it. Your response must be a single, short, ' +
            'contemptuous paragraph (4-6 sentences max). Do not use markdown formatting like bullet points or bold text in ' +
            'the final output.',
        buildUserPrompt: (data) => {
            const {
                username,
                totalMovies,
                topGenres,
                topDirectors,
                topActors,
                averageRating,
                favoriteDecades,
                recentMovies,
                evidence,
            } = data;

            const topRatedStr = (evidence?.topRated || [])
                .filter((m) => m.title)
                .map((m) => `${m.title} (${m.rating}/10)`)
                .join(', ');

            return [
                `Roast this person's real movie-watching history based ONLY on the following data — do not invent anything beyond it.`,
                username ? `Trakt username: ${username}.` : null,
                `Total movies watched: ${totalMovies}.`,
                typeof averageRating === 'number' ? `Average rating they give: ${averageRating}/10.` : null,
                topGenres?.length ? `Most-watched genres: ${topGenres.join(', ')}.` : null,
                topDirectors?.length ? `Favorite directors: ${topDirectors.join(', ')}.` : null,
                topActors?.length ? `Favorite actors: ${topActors.join(', ')}.` : null,
                favoriteDecades?.length ? `Favorite decades: ${favoriteDecades.join(', ')}.` : null,
                typeof evidence?.topGenrePercent === 'number'
                    ? `${evidence.topGenrePercent}% of everything they watch is ${topGenres?.[0] || 'one genre'}.`
                    : null,
                typeof evidence?.highRatingPercent === 'number'
                    ? `${evidence.highRatingPercent}% of their ratings are 8/10 or higher.`
                    : null,
                typeof evidence?.oldMoviePercent === 'number'
                    ? `${evidence.oldMoviePercent}% of what they've watched came out more than 15 years ago.`
                    : null,
                evidence?.mostRewatched
                    ? `Their most-rewatched movie is ${evidence.mostRewatched.title}, watched ${evidence.mostRewatched.plays} times.`
                    : null,
                topRatedStr ? `Their top-rated movies: ${topRatedStr}.` : null,
                recentMovies?.length ? `Recently watched: ${recentMovies.slice(0, 6).join(', ')}.` : null,
            ]
                .filter(Boolean)
                .join(' ');
        },
    },
    valorant: {
        systemPrompt:
            "You are 'Clutch Critic,' a sharp, gaming-literate AI that roasts a player's real VALORANT statistics. " +
            'You are savage but always accurate — every joke must be traceable to a specific number in the data you were ' +
            'given. Notice things like: a terrible win rate despite good individual stats ("top fragging in a losing ' +
            'cause"), extremely high deaths relative to kills, one-trick agent behavior where a single agent dominates ' +
            'their games, playing the same map over and over, a huge gap between kills and assists suggesting selfish play, ' +
            'playing aggressively despite poor survival, one agent seemingly carrying the whole account, great aim but bad ' +
            'results, a losing streak, or a suspiciously low headshot percentage. Be funny, sharp, personalized, and ' +
            'gaming-aware — never generic, and never invent statistics or matches that were not given to you. Never claim ' +
            'a result or pattern the data does not actually support. Your response must be a single, short, contemptuous ' +
            'paragraph (4-6 sentences max). Do not use markdown formatting like bullet points or bold text in the final ' +
            'output.',
        buildUserPrompt: (data) => {
            const { riotId, matchesAnalyzed, summary, agents, maps, recentMatches } = data;

            const topAgent = agents?.[0];
            const topMap = maps?.[0];
            const recentResultsStr = (recentMatches || [])
                .slice(0, 7)
                .map((m) => (m.result === 'win' ? 'W' : 'L'))
                .join('-');

            return [
                `Roast this VALORANT player's real recent performance based ONLY on the following data — do not invent anything beyond it.`,
                riotId ? `Riot ID: ${riotId}.` : null,
                `Matches analyzed: ${matchesAnalyzed}.`,
                typeof summary?.winRate === 'number'
                    ? `Win rate: ${summary.winRate}% (${summary.wins}W-${summary.losses}L).`
                    : null,
                typeof summary?.averageKills === 'number' && typeof summary?.averageDeaths === 'number'
                    ? `Average K/D/A per match: ${summary.averageKills}/${summary.averageDeaths}/${summary.averageAssists ?? 0}.`
                    : null,
                typeof summary?.averageHeadshotPercent === 'number'
                    ? `Headshot rate: ${summary.averageHeadshotPercent}%.`
                    : null,
                topAgent
                    ? `Most-played agent: ${topAgent.name} (${topAgent.games} games, ${topAgent.winRate ?? 'unknown'}% win rate), making up ${matchesAnalyzed ? Math.round((topAgent.games / matchesAnalyzed) * 100) : '?'}% of their matches.`
                    : null,
                topMap ? `Most-played map: ${topMap.name} (${topMap.games} games, ${topMap.winRate ?? 'unknown'}% win rate).` : null,
                recentResultsStr ? `Recent match results (most recent first): ${recentResultsStr}.` : null,
            ]
                .filter(Boolean)
                .join(' ');
        },
    },
};

const DEFAULT_KIND = 'spotify';

function getPersona(kind) {
    return PERSONAS[kind] || PERSONAS[DEFAULT_KIND];
}

/** Kept for backward compatibility — existing Spotify-only call sites. */
const SYSTEM_PROMPT = PERSONAS.spotify.systemPrompt;
function buildUserPrompt(data) {
    return PERSONAS.spotify.buildUserPrompt(data);
}

module.exports = { SYSTEM_PROMPT, buildUserPrompt, getPersona, DEFAULT_KIND };
