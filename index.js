require('dotenv').config();

const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const USERNAME = core.getInput('username') || process.env.USERNAME || process.env.INPUT_USERNAME;
const CHAR_TYPE = core.getInput('character') || process.env.CHARACTER || 'Juno';
const TOKEN = core.getInput('token') || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error("Error: No GitHub Token found.");
  process.exit(1);
}

const POSTER_CONFIG = {
  x: 15,
  y: -285,
  width: 550,
  height: 770
};

const AVATAR_CONFIG = {
  x: POSTER_CONFIG.x + 435, 
  y: POSTER_CONFIG.y + 338,  
  size: 82
};

const BOUNTY_CONFIG = {
  x: POSTER_CONFIG.x + 476,  
  y: POSTER_CONFIG.y + 445   
};

const STATS_BG_CONFIG = {
  x: 160,
  y: 17,
  width: 260,
  height: 172,
  radius: 8
};

const STAMP_CONFIG = {
  x: 460,     
  y: 65,      
  rotate: -20 
};

const BOUNTY_MULTIPLIER = {
  perCommit: 10000,
  perStar: 75000
};

const RANK_THRESHOLDS = [
  { score: 30000000, grade: 'S+', color: '#d32f2f' },
  { score: 15000000, grade: 'S',  color: '#c62828' },
  { score: 10000000, grade: 'A',  color: '#e65100' },
  { score: 5000000,  grade: 'B',  color: '#f9a825' },
  { score: 1000000,  grade: 'C',  color: '#2e7d32' },
  { score: 0,        grade: 'D',  color: '#455a64' },
];

const FONT_URL = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";

function encodeImage(filePath) {
  try {
    const bitmap = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1);
    return `data:image/${ext};base64,${bitmap.toString('base64')}`;
  } catch (err) {
    console.error(`Error: Image not found at ${filePath}`);
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
}

async function fetchImageAsBase64(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error("Failed to fetch avatar:", error.message);
    return "";
  }
}

function formatCurrency(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function fetchGitHubStats() {
  const query = `
    query {
      user(login: "${USERNAME}") {
        name
        avatarUrl(size: 200)
        createdAt
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          nodes { stargazerCount }
        }
        contributionsCollection {
          totalCommitContributions
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
        pullRequests { totalCount }
        issues { totalCount }
      }
    }
  `;

  try {
    const response = await axios.post(
      'https://api.github.com/graphql',
      { query },
      { headers: { Authorization: `bearer ${TOKEN}` } }
    );

    if (response.data.errors) {
      throw new Error(JSON.stringify(response.data.errors));
    }

    const data = response.data.data.user;
    const totalStars = data.repositories.nodes.reduce((acc, repo) => acc + repo.stargazerCount, 0);
    const joinedDate = new Date(data.createdAt);
    const yearsOnGitHub = new Date().getFullYear() - joinedDate.getFullYear();

    const weeks = data.contributionsCollection.contributionCalendar.weeks;
    const days = weeks.flatMap(w => w.contributionDays);
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].contributionCount > 0) streak++;
      else if (i !== days.length - 1) break;
    }

    return {
      name: data.name || USERNAME,
      avatarUrl: data.avatarUrl,
      commits: data.contributionsCollection.totalCommitContributions,
      stars: totalStars,
      prs: data.pullRequests.totalCount,
      streak: streak,
      years: yearsOnGitHub
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

function calculateRank(bounty) {
    return RANK_THRESHOLDS.find(r => bounty >= r.score) || RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
}

async function main() {
  try {
    const stats = await fetchGitHubStats();
    
    let rawBounty = (stats.commits * BOUNTY_MULTIPLIER.perCommit) + (stats.stars * BOUNTY_MULTIPLIER.perStar);
    
    const rankInfo = calculateRank(rawBounty);

    if (rawBounty > 99999999) {
        rawBounty = 99999999;
    }
    const bountyString = formatCurrency(rawBounty);

    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    console.log(`Stats updated for ${stats.name} at ${now} | Grade: ${rankInfo.grade}`);

    const bgBase64 = encodeImage(path.join(__dirname, 'assets', 'BG.png'));
    const charBase64 = encodeImage(path.join(__dirname, 'assets', `char_${CHAR_TYPE}.png`));
    const posterBase64 = encodeImage(path.join(__dirname, 'assets', 'WANTED_POSTER.png'));
    const avatarBase64 = await fetchImageAsBase64(stats.avatarUrl);

    const escapedFontUrl = FONT_URL.replace(/&/g, '&amp;');

    const svgContent = `
    <svg width="600" height="200" viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="ink-poster-rough" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" result="roughened"/>
            <feColorMatrix in="roughened" type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0" result="gray"/>
            <feColorMatrix in="gray" type="matrix"
                values="0.35 0 0 0 0
                        0 0.22 0 0 0
                        0 0.18 0 0 0
                        0 0 0 1 0" />
        </filter>

        <filter id="stamp-rough" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <style type="text/css">
          @import url('${escapedFontUrl}');
        </style>
      </defs>

      <style>
        .title, .label, .value, .bounty-text, .dead-alive, .stamp-text {
            font-family: 'Press Start 2P', cursive;
        }

        .title, .label, .value {
             text-shadow: 2px 2px 0px #3e2723;
        }

        .title { 
            fill: #ffffff; 
            font-size: 16px; 
            font-weight: bold; 
        }
        .label { 
            fill: #ffd54f; 
            font-size: 10px; 
        }
        .value { 
            fill: #ffffff; 
            font-size: 10px; 
            font-weight: bold; 
        }
        
        .bounty-text { 
            fill: #3e2723; 
            font-size: 10px; 
            font-weight: bold; 
            text-anchor: middle; 
            letter-spacing: -1.5px; 
        }
        .dead-alive { 
            fill: #5a4a42; 
            font-size: 12px; 
            text-anchor: middle; 
            font-weight: bold; 
            letter-spacing: -3px; 
        }
        
        .stamp-text {
            font-size: 18px;
            font-weight: bold;
            text-anchor: middle;
        }
      </style>
      
      <image href="${bgBase64}" x="0" y="0" width="600" height="200" />
      
      <rect x="${STATS_BG_CONFIG.x}" y="${STATS_BG_CONFIG.y}" 
            width="${STATS_BG_CONFIG.width}" height="${STATS_BG_CONFIG.height}" 
            rx="${STATS_BG_CONFIG.radius}" ry="${STATS_BG_CONFIG.radius}"
            fill="#000000" opacity="0.4" stroke="#5d4037" stroke-width="2" />

      <image href="${charBase64}" x="30" y="-75" width="360" height="360" />
      
      <text x="180" y="40" class="title">${stats.name}'s Stats</text>
      
      <text x="180" y="75" class="label">Total Commits</text>
      <text x="340" y="75" class="value">${stats.commits}</text>
      
      <text x="180" y="100" class="label">Current Streak</text>
      <text x="340" y="100" class="value">${stats.streak} days</text>
      
      <text x="180" y="125" class="label">Total Stars</text>
      <text x="340" y="125" class="value">${stats.stars}</text>
      
      <text x="180" y="150" class="label">Total PRs</text>
      <text x="340" y="150" class="value">${stats.prs}</text>
      
      <text x="180" y="175" class="label">Years on GitHub</text>
      <text x="340" y="175" class="value">${stats.years} years</text>

      <image href="${posterBase64}" x="${POSTER_CONFIG.x}" y="${POSTER_CONFIG.y}" width="${POSTER_CONFIG.width}" height="${POSTER_CONFIG.height}" />
      
      <image href="${avatarBase64}" 
             x="${AVATAR_CONFIG.x}" y="${AVATAR_CONFIG.y}" 
             width="${AVATAR_CONFIG.size}" height="${AVATAR_CONFIG.size}" 
             filter="url(#ink-poster-rough)" preserveAspectRatio="xMidYMid slice" />
      
      <g transform="translate(${STAMP_CONFIG.x}, ${STAMP_CONFIG.y}) rotate(${STAMP_CONFIG.rotate})" opacity="0.9">
         <circle cx="0" cy="0" r="22" fill="none" stroke="${rankInfo.color}" stroke-width="3" filter="url(#stamp-rough)" />
         <circle cx="0" cy="0" r="18" fill="none" stroke="${rankInfo.color}" stroke-width="1" filter="url(#stamp-rough)" />
         <text x="0" y="8" fill="${rankInfo.color}" class="stamp-text" filter="url(#stamp-rough)">${rankInfo.grade}</text>
      </g>

      <text x="${BOUNTY_CONFIG.x}" y="${BOUNTY_CONFIG.y-5}" class="dead-alive">DEAD OR ALIVE</text>
      <text x="${BOUNTY_CONFIG.x}" y="${BOUNTY_CONFIG.y+12}" class="bounty-text">$ ${bountyString}</text>

    </svg>
    `;

    const outputPath = process.env.GITHUB_WORKSPACE 
      ? path.join(process.env.GITHUB_WORKSPACE, 'stats.svg') 
      : 'stats.svg';

    fs.writeFileSync(outputPath, svgContent);
    console.log(`Stats SVG generated successfully at ${outputPath}`);
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();