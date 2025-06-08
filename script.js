// Supabase 연결 정보
const SUPABASE_URL = 'https://knncinmwspqciwutilgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubmNpbm13c3BxY2l3dXRpbGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMzk1MzIsImV4cCI6MjA2NDkxNTUzMn0.nswNMUmLlaY1QgPhnCoHH5hVUkXjSgtoUYorHtRoQW4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let players = [];  // 선수 전체 데이터 저장

// 선수 데이터 불러오기 (Supabase)
async function loadPlayersFromSupabase() {
  const { data, error } = await supabase.from('players').select('*').order('id', { ascending: true });
  if (error) {
    console.error('선수 데이터 불러오기 실패:', error);
    return [];
  }
  return data || [];
}

// index.html용: 선수 리스트 렌더링
function renderPlayerList(players) {
  const playerListDiv = document.getElementById('playerList');
  if (!playerListDiv) return;
  playerListDiv.innerHTML = '';

  if (players.length === 0) {
    playerListDiv.textContent = '등록된 선수가 없습니다.';
    updateMvpSelect(players);
    return;
  }

  // 표시할 스탯 컬럼
  const statKeys = [
    "1루타", "2루타", "3루타", "홈런", "삼진", "볼넷",
    "희생플라이", "내야땅볼", "플라이아웃", "타점",
    "투구수", "피안타", "피홈런", "자책점", "이닝",
    "승리", "패배", "홀드", "세이브", "사구"
  ];

  players.forEach((player, idx) => {
    const container = document.createElement('div');
    container.style.border = '1px solid #ccc';
    container.style.margin = '10px 0';
    container.style.padding = '10px';
    container.style.overflowX = 'auto';

    let html = `<h3>${player.name} (${player.team} / ${player.type}) <button class="delete-btn" data-idx="${idx}" style="color:#e53935; background:none; border:none; cursor:pointer;">삭제</button></h3>`;
    html += '<table><thead><tr>';

    statKeys.forEach(stat => {
      html += `<th>${stat}</th>`;
    });
    html += '<th>MVP 횟수</th></tr></thead><tbody><tr>';

    // 스탯 증감 버튼 행
    statKeys.forEach(stat => {
      html += `<td class="buttons-cell">
        <button class="stat-btn" data-idx="${idx}" data-stat="${stat}" data-delta="1">&#x25B2;</button>
        <button class="stat-btn" data-idx="${idx}" data-stat="${stat}" data-delta="-1">&#x25BC;</button>
      </td>`;
    });

    html += `<td class="buttons-cell">
      <button class="stat-btn" data-idx="${idx}" data-stat="mvpcount" data-delta="1">&#x25B2;</button>
      <button class="stat-btn" data-idx="${idx}" data-stat="mvpcount" data-delta="-1">&#x25BC;</button>
    </td></tr><tr>`;

    // 스탯 값 행
    statKeys.forEach(stat => {
      html += `<td>${player[stat] || 0}</td>`;
    });
    html += `<td>${player.mvpcount || 0}</td>`;
    html += '</tr></tbody></table>';

    container.innerHTML = html;
    playerListDiv.appendChild(container);
  });

  updateMvpSelect(players);
}

// MVP 셀렉트박스 업데이트
function updateMvpSelect(players) {
  const mvpSelect = document.getElementById('mvpSelect');
  if (!mvpSelect) return;
  mvpSelect.innerHTML = '<option value="" disabled selected>선수 선택</option>';
  players.forEach((p, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    option.textContent = `${p.name} (${p.team} / ${p.type})`;
    mvpSelect.appendChild(option);
  });
}

// index.html 이벤트 바인딩
function bindIndexPageEvents(players) {
  const addPlayerForm = document.getElementById('addPlayerForm');
  if (addPlayerForm) {
    addPlayerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('playerName').value.trim();
      const type = document.getElementById('playerType').value;
      const team = document.getElementById('playerTeam').value;

      if (!name) {
        alert('선수 이름을 입력하세요.');
        return;
      }
      if (!team) {
        alert('팀을 선택하세요.');
        return;
      }
      if (players.some(p => p.name === name && p.type === type)) {
        alert('이미 등록된 선수입니다.');
        return;
      }

      const hitterStatsHeaders = [
        '1루타', '2루타', '3루타', '홈런', '삼진', '볼넷',
        '희생플라이', '내야땅볼', '플라이아웃', '타점'
      ];
      const pitcherStatsHeaders = [
        '투구수', '삼진', '볼넷', '피안타', '피홈런',
        '자책점', '이닝', '승리', '패배', '홀드', '세이브', '사구'
      ];

      const stats = (type === '타자') ?
        hitterStatsHeaders.reduce((acc, cur) => { acc[cur] = 0; return acc; }, {}) :
        pitcherStatsHeaders.reduce((acc, cur) => { acc[cur] = 0; return acc; }, {});

      const newPlayer = { name, type, team, ...stats, mvpcount: 0 };

      // Supabase에 추가
      const { error } = await supabase.from('players').insert([newPlayer]);
      if (error) {
        alert('선수 추가 중 오류 발생: ' + error.message);
        console.error(error);
        return;
      }

      players.push(newPlayer);
      renderPlayerList(players);
      addPlayerForm.reset();
    });
  }

  // 선수 리스트 클릭 이벤트 처리 (삭제, 스탯 증감)
  const playerListDiv = document.getElementById('playerList');
  if (playerListDiv) {
    playerListDiv.addEventListener('click', async e => {
      const target = e.target;
      if (!target) return;

      if (target.classList.contains('delete-btn')) {
        const idx = parseInt(target.dataset.idx);
        if (isNaN(idx)) return;
        if (!confirm(`${players[idx].name} 선수를 삭제하시겠습니까?`)) return;

        // Supabase에서 삭제 (id 컬럼 필요)
        const { error } = await supabase.from('players').delete().eq('id', players[idx].id);
        if (error) {
          alert('삭제 중 오류 발생: ' + error.message);
          console.error(error);
          return;
        }

        players.splice(idx, 1);
        renderPlayerList(players);

      } else if (target.classList.contains('stat-btn')) {
        const idx = parseInt(target.dataset.idx);
        const stat = target.dataset.stat;
        const delta = parseInt(target.dataset.delta);
        if (isNaN(idx) || !stat || isNaN(delta)) return;

        let newVal;
        if (stat === 'mvpcount') {
          newVal = (players[idx].mvpcount || 0) + delta;
          if (newVal < 0) return;
          players[idx].mvpcount = newVal;
        } else {
          newVal = (players[idx][stat] || 0) + delta;
          if (newVal < 0) return;
          players[idx][stat] = newVal;
        }

        // Supabase 업데이트
        const { error } = await supabase.from('players').update({ [stat]: newVal }).eq('id', players[idx].id);
        if (error) {
          alert('수정 중 오류 발생: ' + error.message);
          console.error(error);
          return;
        }

        renderPlayerList(players);
      }
    });
  }

  // MVP 선정 버튼 클릭 이벤트
  const selectMvpBtn = document.getElementById('selectMvpBtn');
  if (selectMvpBtn) {
    selectMvpBtn.addEventListener('click', () => {
      const mvpSelect = document.getElementById('mvpSelect');
      const mvpMessage = document.getElementById('mvpMessage');
      if (!mvpSelect || !mvpMessage) return;
      const idx = mvpSelect.value;
      if (!idx) {
        alert('MVP 선수를 선택하세요.');
        return;
      }

      const newMvpCount = (players[idx].mvpcount || 0) + 1;

      // Supabase 업데이트
      supabase.from('players').update({ mvpcount: newMvpCount }).eq('id', players[idx].id)
        .then(({ error }) => {
          if (error) {
            alert('MVP 업데이트 중 오류 발생: ' + error.message);
            console.error(error);
            return;
          }

          players[idx].mvpcount = newMvpCount;
          renderPlayerList(players);
          mvpMessage.textContent = `${players[idx].name} 선수가 MVP로 선정되었습니다! (총 ${players[idx].mvpcount}회)`;
          mvpSelect.value = '';
        });
    });
  }

  // 선수 데이터 내보내기 버튼 이벤트
  const exportBtn = document.getElementById('exportPlayersBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const json = JSON.stringify(players, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'playersData.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

// records.html용: 팀 통계 계산 및 렌더링
async function calculateTeamStats() {
  const teamStatsSection = document.getElementById('teamStatsSection');
  const teamStatsTableBody = document.querySelector('#teamStatsTable tbody');
  if (!teamStatsSection || !teamStatsTableBody) return;

  if (!players || players.length === 0) {
    teamStatsSection.style.display = 'none';
    return;
  }

  const teams = {};

  players.forEach(p => {
    if (!teams[p.team]) {
      teams[p.team] = {
        totalHits: 0,
        totalAtBats: 0,
        totalER: 0,
        totalInnings: 0,
        totalRuns: 0,
        totalRBI: 0,
        totalWins: 0,
        totalLosses: 0,
        playerCount: 0
      };
    }
    const team = teams[p.team];

    if (p.type === '타자') {
      const hits = (p["1루타"]||0) + (p["2루타"]||0) + (p["3루타"]||0) + (p["홈런"]||0);
      const atBats = hits + (p["삼진"]||0) + (p["내야땅볼"]||0) + (p["플라이아웃"]||0);
      team.totalHits += hits;
      team.totalAtBats += atBats;
      team.totalRuns += p["득점"] || 0;
      team.totalRBI += p["타점"] || 0;
    }

    if (p.type === '투수') {
      team.totalER += p["자책점"] || 0;
      team.totalInnings += p["이닝"] || 0;
      team.totalWins += p["승리"] || 0;
      team.totalLosses += p["패배"] || 0;
    }

    team.playerCount++;
  });

  teamStatsTableBody.innerHTML = '';
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
    teamStatsTableBody.appendChild(tr);
  }
  teamStatsSection.style.display = Object.keys(teams).length > 0 ? 'block' : 'none';
}

// MVP 순위 렌더링
async function renderMvpRanking() {
  const mvpRankingSection = document.getElementById('mvpRankingSection');
  const mvpRankingTableBody = document.querySelector('#mvpRankingTable tbody');
  if (!mvpRankingSection || !mvpRankingTableBody) return;

  const { data: mvpPlayers, error } = await supabase
    .from('players')
    .select('*')
    .gt('mvpcount', 0)
    .order('mvpcount', { ascending: false });

  if (error) {
    console.error('MVP 순위 불러오기 오류:', error);
    mvpRankingSection.style.display = 'none';
    return;
  }
  if (!mvpPlayers || mvpPlayers.length === 0) {
    mvpRankingSection.style.display = 'none';
    return;
  }

  mvpRankingSection.style.display = 'block';
  mvpRankingTableBody.innerHTML = '';

  mvpPlayers.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="player-name" style="color:#1a73e8; cursor:pointer; text-decoration:underline;">${p.name}</td>
      <td>${p.team}</td>
      <td>${p.mvpcount}</td>
    `;
    tr.querySelector('.player-name').addEventListener('click', () => {
      window.location.href = `player_detail.html?name=${encodeURIComponent(p.name)}&type=${encodeURIComponent(p.type)}`;
    });
    mvpRankingTableBody.appendChild(tr);
  });
}

// 통계 계산 함수
function calculateStat(player, stat) {
  switch(stat) {
    case '타율': {
      const hits = (player["1루타"]||0) + (player["2루타"]||0) + (player["3루타"]||0) + (player["홈런"]||0);
      const atBats = hits + (player["삼진"]||0) + (player["내야땅볼"]||0) + (player["플라이아웃"]||0);
      return atBats === 0 ? 0 : hits / atBats;
    }
    case '출루율': {
      const hits = (player["1루타"]||0) + (player["2루타"]||0) + (player["3루타"]||0) + (player["홈런"]||0);
      const walks = player["볼넷"] || 0;
      const sf = player["희생플라이"] || 0;
      const atBats = hits + (player["삼진"]||0) + (player["내야땅볼"]||0) + (player["플라이아웃"]||0);
      const denom = atBats + walks + sf;
      return denom === 0 ? 0 : (hits + walks) / denom;
    }
    case 'OPS': {
      return calculateStat(player, '출루율') + calculateSLG(player);
    }
    case '홈런':
    case '타점':
    case '승리':
    case '세이브':
    case '홀드':
    case '삼진':
      return player[stat] || 0;
    case 'ERA': {
      const er = player["자책점"] || 0;
      const ip = player["이닝"] || 0;
      return ip === 0 ? 0 : (er * 9) / ip;
    }
    case 'WHIP': {
      const bb = player["볼넷"] || 0;
      const h = player["피안타"] || 0;
      const ip = player["이닝"] || 0;
      return ip === 0 ? 0 : (bb + h) / ip;
    }
    default:
      return 0;
  }
}

function calculateSLG(player) {
  const singles = player["1루타"] || 0;
  const doubles = player["2루타"] || 0;
  const triples = player["3루타"] || 0;
  const hr = player["홈런"] || 0;
  const atBats = singles + doubles + triples + hr + (player["삼진"]||0) + (player["내야땅볼"]||0) + (player["플라이아웃"]||0);
  if (atBats === 0) return 0;
  const totalBases = singles + 2*doubles + 3*triples + 4*hr;
  return totalBases / atBats;
}

// 통계별 선수 순위 렌더링
function renderRanking(stat, asc = true) {
  const rankingContent = document.getElementById('rankingContent');
  const searchInput = document.getElementById('searchInput');
  if (!rankingContent || !searchInput) return;

  rankingContent.innerHTML = '';
  let filteredPlayers = players.slice();

  const keyword = searchInput.value.trim().toLowerCase();
  if (keyword) {
    filteredPlayers = filteredPlayers.filter(p => p.name.toLowerCase().includes(keyword));
  }

  filteredPlayers.sort((a, b) => {
    const valA = calculateStat(a, stat);
    const valB = calculateStat(b, stat);
    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
  });

  if (filteredPlayers.length === 0) {
    rankingContent.innerHTML = '<p class="no-data">선수 기록이 없습니다.</p>';
    return;
  }

  rankingContent.appendChild(createRankingTable(filteredPlayers, stat, { column: stat, asc }));
}

function createRankingTable(players, stat, currentSort) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

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
    nameTd.addEventListener('click', () => {
      window.location.href = `player_detail.html?name=${encodeURIComponent(player.name)}&type=${encodeURIComponent(player.type)}`;
    });
    tr.appendChild(nameTd);

    const statTd = document.createElement('td');
    let val = calculateStat(player, stat);
    if (['타율', '출루율', 'OPS'].includes(stat)) val = val.toFixed(3);
    else if (stat === 'ERA') val = val.toFixed(2);
    else if (stat === 'WHIP') val = val.toFixed(3);
    else if (stat === '승률') val = (val*100).toFixed(1) + '%';
    statTd.textContent = val;
    tr.appendChild(statTd);

    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

// 초기 실행 및 이벤트 바인딩
document.addEventListener('DOMContentLoaded', async () => {
  players = await loadPlayersFromSupabase();

  calculateTeamStats();
  renderMvpRanking();
  renderRanking('타율', true);

  const hitterMenu = document.getElementById('hitterMenu');
  const pitcherMenu = document.getElementById('pitcherMenu');
  const searchInput = document.getElementById('searchInput');
  const goToInputBtn = document.getElementById('goToInputBtn');

  let currentSort = { column: '타율', asc: true };

  if (hitterMenu) {
    hitterMenu.addEventListener('click', e => {
      if (e.target.tagName === 'LI') {
        [...hitterMenu.children].forEach(li => li.classList.remove('active'));
        [...pitcherMenu.children].forEach(li => li.classList.remove('active'));
        e.target.classList.add('active');
        currentSort.column = e.target.getAttribute('data-stat');
        currentSort.asc = true;
        if (searchInput) searchInput.value = '';
        renderRanking(currentSort.column, currentSort.asc);
      }
    });
  }

  if (pitcherMenu) {
    pitcherMenu.addEventListener('click', e => {
      if (e.target.tagName === 'LI') {
        [...hitterMenu.children].forEach(li => li.classList.remove('active'));
        [...pitcherMenu.children].forEach(li => li.classList.remove('active'));
        e.target.classList.add('active');
        currentSort.column = e.target.getAttribute('data-stat');
        currentSort.asc = true;
        if (searchInput) searchInput.value = '';
        renderRanking(currentSort.column, currentSort.asc);
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderRanking(currentSort.column, currentSort.asc);
    });
  }

  if (goToInputBtn) {
    goToInputBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
});
