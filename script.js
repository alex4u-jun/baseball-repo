
// DOM 요소
const goToInputBtn = document.getElementById('goToInputBtn');
const hitterMenu = document.getElementById('hitterMenu');
const pitcherMenu = document.getElementById('pitcherMenu');
const rankingContent = document.getElementById('rankingContent');
const searchInput = document.getElementById('searchInput');
const recentMvpInfo = document.getElementById('recentMvpInfo');

const mvpRankingSection = document.getElementById('mvpRankingSection');
const mvpRankingTableBody = document.querySelector('#mvpRankingTable tbody');

const teamStatsSection = document.getElementById('teamStatsSection');
const teamStatsTableBody = document.querySelector('#teamStatsTable tbody');

// 주요 랭킹 스탯
const hitterStatsForRanking = ['타율', '홈런', '출루율', 'OPS', '타점'];
const pitcherStatsForRanking = ['승리', '세이브', '홀드', '삼진', 'ERA', 'WHIP'];

let currentSort = { column: null, asc: true };


// 최근 MVP 불러오기 및 표시
async function loadRecentMvp() {
  const { data, error } = await supabase
    .from('players') // Assuming you have a 'players' table
    .select('*')
    .order('mvpDate', { ascending: false }) // Assuming you have a 'mvpDate' column
    .limit(1);

  if (error) {
    console.error('MVP 불러오기 오류:', error);
    recentMvpInfo.textContent = 'MVP 정보를 불러오는 데 실패했습니다.';
    return;
  }

  if (data && data.length > 0) {
    const mvp = data[0];
    const dateStr = new Date(mvp.mvpDate).toLocaleDateString(); // Assuming you have a 'mvpDate' column
    recentMvpInfo.innerHTML = `
      <img src="mvp_logo.png" alt="MVP" style="height:40px; margin-right:10px; vertical-align:middle;">
      <span>${mvp.name} (${mvp.team} / ${mvp.type}) - 선정일: ${dateStr}</span>
    `;
  } else {
    recentMvpInfo.textContent = '선택된 MVP가 없습니다.';
  }
}

// 선수 이름 필터링
function filterByName(players, keyword) {
  if (!keyword) return players;
  const lower = keyword.toLowerCase();
  return players.filter(p => p.name.toLowerCase().includes(lower));
}

// 타율 계산
function calculateAVG(player) {
  const H = (player.stats['1루타']||0) + (player.stats['2루타']||0) + (player.stats['3루타']||0) + (player.stats['홈런']||0);
  const AB = H + (player.stats['삼진']||0) + (player.stats['내야땅볼']||0) + (player.stats['플라이아웃']||0);
  if (AB === 0) return 0;
  return H / AB;
}

// 출루율 계산
function calculateOBP(player) {
  const H = (player.stats['1루타']||0) + (player.stats['2루타']||0) + (player.stats['3루타']||0) + (player.stats['홈런']||0);
  const BB = player.stats['볼넷']||0;
  const HBP = 0;
  const AB = H + (player.stats['삼진']||0) + (player.stats['내야땅볼']||0) + (player.stats['플라이아웃']||0);
  const SF = player.stats['희생플라이']||0;
  const denom = AB + BB + HBP + SF;
  if (denom === 0) return 0;
  return (H + BB + HBP) / denom;
}

// 장타율 계산
function calculateSLG(player) {
  const doubles = player.stats['2루타']||0;
  const triples = player.stats['3루타']||0;
  const HR = player.stats['홈런']||0;
  const AB = doubles + triples + HR + (player.stats['삼진']||0) + (player.stats['내야땅볼']||0) + (player.stats['플라이아웃']||0);
  if (AB === 0) return 0;
  const totalBases = 2*doubles + 3*triples + 4*HR;
  return totalBases / AB;
}

// OPS 계산
function calculateOPS(player) {
  return calculateOBP(player) + calculateSLG(player);
}

// ERA 계산
function calculateERA(player) {
  const ER = player.stats['자책점']||0;
  const IP = player.stats['이닝']||0;
  if (IP === 0) return 0;
  return (ER * 9) / IP;
}

// WHIP 계산
function calculateWHIP(player) {
  const BB = player.stats['볼넷']||0;
  const H = player.stats['피안타']||0;
  const IP = player.stats['이닝']||0;
  if (IP === 0) return 0;
  return (BB + H) / IP;
}

// 승률 계산
function calculateWinRate(player) {
  const W = player.stats['승리']||0;
  const L = player.stats['패배']||0;
  const total = W + L;
  if (total === 0) return 0;
  return W / total;
}

// stat에 따른 선수 필터링
async function getRankingData(stat) {
  const players = await loadPlayersFromSupabase();
  if (hitterStatsForRanking.includes(stat)) {
    return players.filter(p => p.type === '타자');
  }
  if (pitcherStatsForRanking.includes(stat)) {
    return players.filter(p => p.type === '투수');
  }
  return [];
}

// stat별 실제 값 계산
function getStatValue(player, stat) {
  switch(stat) {
    case '타율': return calculateAVG(player);
    case '출루율': return calculateOBP(player);
    case 'OPS': return calculateOPS(player);
    case '홈런': return player.stats['홈런'] || 0;
    case '타점': return player.stats['타점'] || 0;
    case '승리': return player.stats['승리'] || 0;
    case '세이브': return player.stats['세이브'] || 0;
    case '홀드': return player.stats['홀드'] || 0;
    case '삼진': return player.stats['삼진'] || 0;
    case 'ERA': return calculateERA(player);
    case 'WHIP': return calculateWHIP(player);
    default: return 0;
  }
}

// stat별 표기값 (소수점 자리 등)
function getStatDisplay(player, stat) {
  const val = getStatValue(player, stat);
  if (['타율', '출루율', 'OPS'].includes(stat)) return val.toFixed(3);
  if (stat === 'ERA') return val.toFixed(2);
  if (stat === 'WHIP') return val.toFixed(3);
  if (stat === '승률') return (val * 100).toFixed(1) + '%';
  return val;
}

// 선수 목록과 stat으로 테이블 생성
function createRankingTable(players, stat) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // 헤더 행
  const headerRow = document.createElement('tr');
  ['순위', '선수명', stat].forEach((text, idx) => {
    const th = document.createElement('th');
    th.textContent = text;
    if (idx === 2) {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        if (currentSort.column === stat) currentSort.asc = !currentSort.asc;
        else {
          currentSort.column = stat;
          currentSort.asc = true;
        }
        renderRanking(stat, currentSort.asc);
      });
      if (currentSort.column === stat) {
        th.textContent += currentSort.asc ? ' ▲' : ' ▼';
      }
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // 선수 데이터 행
  players.forEach((player, idx) => {
    const tr = document.createElement('tr');

    const rankTd = document.createElement('td');
    rankTd.textContent = idx + 1;
    tr.appendChild(rankTd);

    const nameTd = document.createElement('td');
    nameTd.textContent = player.name;
    nameTd.classList.add('player-name');
    nameTd.style.cursor = 'pointer';
    nameTd.style.color = '#1a73e8';
    nameTd.style.textDecoration = 'underline';
    // 클릭 시 타입도 같이 전달하여 player_detail.html에서 구분 가능하게 함
    nameTd.addEventListener('click', () => {
      window.location.href = `player_detail.html?name=${encodeURIComponent(player.name)}&type=${encodeURIComponent(player.type)}`;
    });
    tr.appendChild(nameTd);

    const statTd = document.createElement('td');
    statTd.textContent = getStatDisplay(player, stat);
    tr.appendChild(statTd);

    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

// 순위 렌더링 함수
async function renderRanking(stat, asc = true) {
  rankingContent.innerHTML = '';
  let players = await loadPlayersFromSupabase();

  // 선수 이름 검색 필터
  const keyword = searchInput.value.trim();
  players = filterByName(players, keyword);

  // 정렬 적용
  players = players.sort((a, b) => {
    const valA = getStatValue(a, stat);
    const valB = getStatValue(b, stat);
    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
  });

  if (players.length === 0) {
    rankingContent.innerHTML = '<p class="no-data">선수 기록이 없습니다.</p>';
    return;
  }

  rankingContent.appendChild(createRankingTable(players, stat));
}

// MVP 순위 테이블 생성
async function renderMvpRanking() {
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .filter('mvpCount', 'gt', 0)
    .order('mvpCount', { ascending: false });

  if (error) {
    console.error('MVP 순위 불러오기 오류:', error);
    mvpRankingSection.style.display = 'none';
    return;
  }

  if (!players || players.length === 0) {
    mvpRankingSection.style.display = 'none';
    return;
  }

  mvpRankingSection.style.display = 'block';
  mvpRankingTableBody.innerHTML = '';

  players.forEach((p, idx) => {
    const tr = document.createElement('tr');

    const rankTd = document.createElement('td');
    rankTd.textContent = idx + 1;
    tr.appendChild(rankTd);

    const nameTd = document.createElement('td');
    nameTd.textContent = p.name;
    nameTd.classList.add('player-name');
    nameTd.style.cursor = 'pointer';
    nameTd.style.color = '#1a73e8';
    nameTd.style.textDecoration = 'underline';
    nameTd.addEventListener('click', () => {
      window.location.href = `player_detail.html?name=${encodeURIComponent(p.name)}&type=${encodeURIComponent(p.type)}`;
    });
    tr.appendChild(nameTd);

    const teamTd = document.createElement('td');
    teamTd.textContent = p.team;
    tr.appendChild(teamTd);

    const mvpTd = document.createElement('td');
    mvpTd.textContent = p.mvpCount;
    tr.appendChild(mvpTd);

    mvpRankingTableBody.appendChild(tr);
  });
}

// 팀별 주요 통계 계산 및 테이블 생성
async function calculateTeamStats() {
  const players = await loadPlayersFromSupabase();

  const teams = {};

  players.forEach(p => {
    if (!teams[p.team]) {
      teams[p.team] = {
        totalHits: 0, totalAtBats: 0,
        totalER: 0, totalInnings: 0,
        totalRuns: 0, totalRBI: 0,
        totalWins: 0, totalLosses: 0,
        playerCount: 0
      };
    }

    const team = teams[p.team];

    if (p.type === '타자') {
      const hits = (p.stats['1루타']||0) + (p.stats['2루타']||0) + (p.stats['3루타']||0) + (p.stats['홈런']||0);
      const atBats = hits + (p.stats['삼진']||0) + (p.stats['내야땅볼']||0) + (p.stats['플라이아웃']||0);
      team.totalHits += hits;
      team.totalAtBats += atBats;
      team.totalRuns += p.stats['득점'] || 0;
      team.totalRBI += p.stats['타점'] || 0;
    }

    if (p.type === '투수') {
      team.totalER += p.stats['자책점'] || 0;
      team.totalInnings += p.stats['이닝'] || 0;
      team.totalWins += p.stats['승리'] || 0;
      team.totalLosses += p.stats['패배'] || 0;
    }

    team.playerCount++;
  });

  const tbody = teamStatsTableBody;
  tbody.innerHTML = '';

  for (const teamName in teams) {
    const t = teams[teamName];
    const teamAVG = t.totalAtBats > 0 ? (t.totalHits / t.totalAtBats) : 0;
    const teamERA = t.totalInnings > 0 ? (t.totalER * 9 / t.totalInnings) : 0;
    const teamWinRate = (t.totalWins + t.totalLosses) > 0 ? (t.totalWins / (t.totalWins + t.totalLosses)) : 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${teamName}</td>
      <td>${teamAVG.toFixed(3)}</td>
      <td>${teamERA.toFixed(2)}</td>
      <td>${t.totalRuns}</td>
      <td>${t.totalRBI}</td>
      <td>${(teamWinRate * 100).toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  }

  teamStatsSection.style.display = Object.keys(teams).length > 0 ? 'block' : 'none';
}


// Supabase 연결
const SUPABASE_URL = 'https://knncinmwspqciwutilgp.supabase.co'; // 본인 프로젝트 URL로 변경
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubmNpbm13c3BxY2l3dXRpbGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMzk1MzIsImV4cCI6MjA2NDkxNTUzMn0.nswNMUmLlaY1QgPhnCoHH5hVUkXjSgtoUYorHtRoQW4'; // 본인 프로젝트 anon key로 변경
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 선수 데이터 불러오기 (Supabase)
async function loadPlayersFromSupabase() {
  console.log('Supabase에서 선수 데이터를 불러옵니다...');
  const { data, error } = await supabase.from('players').select('*');
  if (error) {
    console.error('Supabase 불러오기 오류:', error);
    return [];
  }
  console.log('Supabase에서 선수 데이터를 성공적으로 불러왔습니다:', data);
  return data;
}



// 선수 추가 예시
async function addPlayer(newPlayer) {
  console.log('Supabase에 새 선수를 추가합니다:', newPlayer);
  const { data, error } = await supabase.from('players').insert([newPlayer]).select();
  if (error) {
    console.error('Supabase 선수 추가 오류:', error);
  } else {
    console.log('Supabase에 선수를 성공적으로 추가했습니다:', data);
  }
}

// 선수 기록 수정 예시
async function updatePlayer(updatedPlayer) {
  const { id, ...updateData } = updatedPlayer;
  console.log(`Supabase에서 ID가 ${id}인 선수를 업데이트합니다:`, updateData);
  const { data, error } = await supabase
    .from('players')
    .update(updateData)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Supabase 선수 업데이트 오류:', error);
  } else {
    console.log('Supabase에서 선수를 성공적으로 업데이트했습니다:', data);
  }
}

// 선수 삭제 예시
async function deletePlayer(playerId) {
  console.log(`Supabase에서 ID가 ${playerId}인 선수를 삭제합니다.`);
  const { data, error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId)
    .select();

  if (error) {
    console.error('Supabase 선수 삭제 오류:', error);
  } else {
    console.log('Supabase에서 선수를 성공적으로 삭제했습니다:', data);
  }
}

// 선수 데이터 불러오기 및 화면 반영
async function loadAndRenderPlayers() {
  const players = await loadPlayersFromSupabase();
  // players로 화면 렌더링 함수 호출
}


// 초기 로딩 시 최근 MVP 정보 표시 및 데이터 렌더링
document.addEventListener('DOMContentLoaded', () => {
  loadRecentMvp();
  renderMvpRanking();
  calculateTeamStats();
});

goToInputBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

function clearActiveMenu() {
  [...hitterMenu.children].forEach(li => li.classList.remove('active'));
  [...pitcherMenu.children].forEach(li => li.classList.remove('active'));
}

hitterMenu.addEventListener('click', e => {
  if (e.target.tagName === 'LI') {
    clearActiveMenu();
    e.target.classList.add('active');
    currentSort.column = e.target.getAttribute('data-stat');
    currentSort.asc = true;
    searchInput.value = '';
    renderRanking(currentSort.column, currentSort.asc);
  }
});

pitcherMenu.addEventListener('click', e => {
  if (e.target.tagName === 'LI') {
    clearActiveMenu();
    e.target.classList.add('active');
    currentSort.column = e.target.getAttribute('data-stat');
    currentSort.asc = true;
    searchInput.value = '';
    renderRanking(currentSort.column, currentSort.asc);
  }
});

searchInput.addEventListener('input', () => {
  if (!currentSort.column) return;
  renderRanking(currentSort.column, currentSort.asc);
});
