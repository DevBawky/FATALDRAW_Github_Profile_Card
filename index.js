const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Get inputs from GitHub Actions
const USERNAME = core.getInput('username');
const TOKEN = core.getInput('token');
const CHAR_TYPE = core.getInput('character') || 'Juno';

// Rank thresholds definition
const RANK_THRESHOLDS = [
  { score: 2000, grade: 'S+', color: '#ffd700' }, 
  { score: 1000, grade: 'S',  color: '#00e676' }, 
  { score: 500,  grade: 'A',  color: '#2979ff' }, 
  { score: 200,  grade: 'B',  color: '#d500f9' }, 
  { score: 100,  grade: 'C',  color: '#ff9100' }, 
  { score: 0,    grade: 'D',  color: '#607d8b' }, 
];

// Convert image file to Base64 string
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

// Fetch user statistics from GitHub GraphQL API
async function fetchGitHubStats() {
  const query = `
    query {
      user(login: "${USERNAME}") {
        name
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
    
    if (response.data.errors) throw new Error(JSON.stringify(response.data.errors));
    const data = response.data.data.user;

    const totalStars = data.repositories.nodes.reduce((acc, repo) => acc + repo.stargazerCount, 0);
    
    const joinedDate = new Date(data.createdAt);
    const today = new Date();
    const yearsOnGitHub = today.getFullYear() - joinedDate.getFullYear();

    const weeks = data.contributionsCollection.contributionCalendar.weeks;
    const days = weeks.flatMap(w => w.contributionDays);
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].contributionCount > 0) {
        streak++;
      } else {
        if (i === days.length - 1) continue; 
        break; 
      }
    }

    return {
      name: data.name || USERNAME,
      commits: data.contributionsCollection.totalCommitContributions,
      stars: totalStars,
      prs: data.pullRequests.totalCount,
      streak: streak,
      years: yearsOnGitHub
    };
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch GitHub stats');
  }
}

// Calculate rank grade based on score
function calculateRank(stats) {
  const score = stats.commits; 
  const rank = RANK_THRESHOLDS.find(r => score >= r.score) || RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
  
  let percentage = 100;
  const nextRank = RANK_THRESHOLDS[RANK_THRESHOLDS.indexOf(rank) - 1];
  if (nextRank) {
    const range = nextRank.score - rank.score;
    const current = score - rank.score;
    percentage = Math.min(100, Math.max(0, (current / range) * 100));
  }

  return { grade: rank.grade, color: rank.color, percentage };
}

// Main execution function
async function main() {
  try {
    const stats = await fetchGitHubStats();
    const rankInfo = calculateRank(stats);
    
    console.log(`Stats updated for ${stats.name}`);

    const bgBase64 = encodeImage(path.join(__dirname, 'assets', 'BG.png'));
    const charBase64 = encodeImage(path.join(__dirname, 'assets', `char_${CHAR_TYPE}.png`));

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (rankInfo.percentage / 100) * circumference;

    const svgContent = `
    <svg width="600" height="200" viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { fill: #ffffff; font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; }
        .label { fill: #aaaaaa; font-family: 'Courier New', monospace; font-size: 13px; }
        .value { fill: #ffffff; font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold; }
        .grade { fill: ${rankInfo.color}; font-family: 'Arial', sans-serif; font-size: 30px; font-weight: bold; text-anchor: middle; dominant-baseline: middle; }
        .circle-bg { fill: none; stroke: #333333; stroke-width: 8; }
        .circle-progress { fill: none; stroke: ${rankInfo.color}; stroke-width: 8; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dashoffset 1s ease-in-out; }
      </style>

      <image href="${bgBase64}" x="0" y="0" width="600" height="200" />
      <image href="${charBase64}" x="30" y="-75" width="360" height="360" />

      <text x="180" y="35" class="title">${stats.name}'s Stats</text>
      
      <text x="180" y="70" class="label">Total Commits</text>
      <text x="320" y="70" class="value">${stats.commits}</text>

      <text x="180" y="95" class="label">Current Streak</text>
      <text x="320" y="95" class="value">${stats.streak} days</text>

      <text x="180" y="120" class="label">Total Stars</text>
      <text x="320" y="120" class="value">${stats.stars}</text>

      <text x="180" y="145" class="label">Total PRs</text>
      <text x="320" y="145" class="value">${stats.prs}</text>

      <text x="180" y="170" class="label">Years on GitHub</text>
      <text x="320" y="170" class="value">${stats.years} years</text>

      <g transform="translate(480, 100)">
        <circle cx="0" cy="0" r="${radius}" class="circle-bg" />
        <circle cx="0" cy="0" r="${radius}" class="circle-progress" 
                stroke-dasharray="${circumference}" 
                stroke-dashoffset="${offset}" />
        <text x="0" y="2" class="grade">${rankInfo.grade}</text>
      </g>
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