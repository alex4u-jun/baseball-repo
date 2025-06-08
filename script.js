// Supabase 연결
const SUPABASE_URL = 'https://knncinmwspqciwutilgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubmNpbm13c3BxY2l3dXRpbGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMzk1MzIsImV4cCI6MjA2NDkxNTUzMn0.nswNMUmLlaY1QgPhnCoHH5hVUkXjSgtoUYorHtRoQW4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 선수 데이터 Supabase에서 불러오기 ---
async function loadPlayersFromSupabase() {
  const { data, error } = await supabase.from('players').select('*');
  if (error) {
    console.error('Supabase 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

// --- index.html 관련 기능 ---

// DOMContentLoaded 이벤트 내부
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('addPlayerForm')) {
    // index.html 기능 시작

    let players = [];

    // 선수 리스트 렌더 함수
    function renderPlayerList() {
      const playerListDiv = document.getElementById('playerList');
      playerListDiv.innerHTML = '';
      if (players.length === 0) {
        playerListDiv.textContent = '등록된 선수가 없습니다.';
        updateMvpSelect();
        return;
      }
      players.forEach((player, idx) => {
        const container = document.createElement('div');
        container.style.border = '1px solid #ccc';
        container.style.margin = '10px 0';
        container.style.padding = '10px';
        container.style.overflowX = 'auto';

        let html = `<h3>${player.name} (${player.team} / ${player.type}) <button class="delete-btn" data-idx="${idx}">삭제</button></h3>`;
        html += '<table><thead><tr>';

        const statsKeys = Object.keys(player.stats);
        statsKeys.forEach(stat => {
          html += `<th>${stat}</th>`;
        });
        html += '<th>MVP 횟수</th></tr></thead><tbody><tr>';

        // 증가/감소 버튼
        statsKeys.forEach(stat => {
          html += `<td class="buttons-cell">
            <button class="stat-btn" data-idx="${idx}" data-stat="${stat}" data-delta="1">&#x25B2;</button>
            <button class="stat-btn" data-idx="${idx}" data-stat="${stat}" data-delta="-1">&#x25BC;</button>
          </td>`;
        });
        html += `<td class="buttons-cell">
          <button class="stat-btn" data-idx="${idx}" data-stat="mvpCount" data-delta="1">&#x25B2;</button>
          <button class="stat-btn" data-idx="${idx}" data-stat="mvpCount" data-delta="-1">&#x25BC;</button>
        </td></tr><tr>`;

        // 값 출력
        statsKeys.forEach(stat => {
          html += `<td>${player.stats[stat]}</td>`;
        });
        html += `<td>${player.mvpCount || 0}</td>`;
        html += '</tr></tbody></table>';

        container.innerHTML = html;
        playerListDiv.appendChild(container);
      });

      updateMvpSelect();
    }

    // MVP select 업데이트
    function updateMvpSelect() {
      const mvpSelect = document.getElementById('mvpSelect');
      mvpSelect.innerHTML = '<option value="" disabled selected>선수 선택</option>';
      players.forEach((p, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = `${p.name} (${p.team} / ${p.type})`;
        mvpSelect.appendChild(option);
      });
    }

    // Supabase에 선수 저장
    async function savePlayerToSupabase(player) {
      const insertData = {
        name: player.name,
        type: player.type,
        team: player.team,
        mvpCount: player.mvpCount || 0,
        ...player.stats
      };
      const { error } = await supabase.from('players').insert([insertData]);
      if (error) {
        alert('Supabase 저장 오류: ' + error.message);
        console.error(error);
      }
    }

    // 초기 선수 데이터 로드
    async function init() {
      players = await loadPlayersFromSupabase();
      renderPlayerList();
    }
    init();

    // 선수 추가 폼 처리
    document.getElementById('addPlayerForm').addEventListener('submit', async (e) => {
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

      const newPlayer = { name, type, team, stats, mvpCount: 0 };
      // Supabase 저장 시도
      await savePlayerToSupabase(newPlayer);

      players.push(newPlayer);
      renderPlayerList();
      e.target.reset();
    });

    // 선수 리스트 내 버튼 이벤트 처리 (삭제, 스탯 증가/감소)
    document.getElementById('playerList').addEventListener('click', async (e) => {
      if (e.target.classList.contains('delete-btn')) {
        const idx = parseInt(e.target.dataset.idx);
        if (confirm(`${players[idx].name} 선수를 삭제하시겠습니까?`)) {
          const playerId = players[idx].id; // id가 있다면
          if (playerId) {
            const { error } = await supabase.from('players').delete().eq('id', playerId);
            if (error) {
              alert('삭제 중 오류가 발생했습니다: ' + error.message);
              return;
            }
          }
          players.splice(idx, 1);
          renderPlayerList();
        }
      } else if (e.target.classList.contains('stat-btn')) {
        const idx = parseInt(e.target.dataset.idx);
        const stat = e.target.dataset.stat;
        const delta = parseInt(e.target.dataset.delta);
        if (stat === 'mvpCount') {
          const newVal = (players[idx].mvpCount || 0) + delta;
          if (newVal < 0) return;
          players[idx].mvpCount = newVal;
        } else {
          const newVal = players[idx].stats[stat] + delta;
          if (newVal < 0) return;
          players[idx].stats[stat] = newVal;
        }
        renderPlayerList();
      }
    });

    // MVP 선정 버튼
    document.getElementById('selectMvpBtn').addEventListener('click', async () => {
      const mvpSelect = document.getElementById('mvpSelect');
      const idx = mvpSelect.value;
      const mvpMessage = document.getElementById('mvpMessage');
      if (!idx) {
        alert('MVP 선수를 선택하세요.');
        return;
      }
      players[idx].mvpCount = (players[idx].mvpCount || 0) + 1;

      // Supabase 업데이트도 가능하면 추가 구현 권장

      renderPlayerList();
      mvpMessage.textContent = `${players[idx].name} 선수가 MVP로 선정되었습니다! (총 ${players[idx].mvpCount}회)`;
      mvpSelect.value = '';
    });

    // 대결 기록 검색 및 편집 (투수-타자)
    let selectedPitcher = null;
    let selectedHitter = null;

    const pitcherSearchInput = document.getElementById('pitcherSearch');
    const pitcherSearchResults = document.getElementById('pitcherSearchResults');
    const pitcherEditSection = document.getElementById('pitcherEditSection');
    const pitcherNameDisplay = document.getElementById('pitcherNameDisplay');
    const pitcherStatsContainer = document.getElementById('pitcherStatsContainer');

    const hitterSearchInput = document.getElementById('hitterSearch');
    const hitterSearchResults = document.getElementById('hitterSearchResults');
    const hitterEditSection = document.getElementById('hitterEditSection');
    const hitterNameDisplay = document.getElementById('hitterNameDisplay');
    const hitterStatsContainer = document.getElementById('hitterStatsContainer');

    function renderStatsEditor(player, container) {
      container.innerHTML = '';
      for (const stat in player.stats) {
        const statDiv = document.createElement('div');
        statDiv.style.marginBottom = '8px';
        statDiv.innerHTML = `
          <label>${stat}: </label>
          <div class="arrow-buttons" style="display:inline-flex; flex-direction: column; gap: 3px;">
            <button class="stat-btn" data-delta="1" style="width: 20px;">+</button>
            <button class="stat-btn" data-delta="-1" style="width: 20px;">-</button>
          </div>
          <span>${player.stats[stat]}</span>
        `;
        container.appendChild(statDiv);

        const btns = statDiv.querySelectorAll('button');
        const valueSpan = statDiv.querySelector('span');

        btns.forEach(btn => {
          btn.addEventListener('click', () => {
            const delta = parseInt(btn.dataset.delta);
            const newVal = player.stats[stat] + delta;
            if (newVal < 0) return;
            player.stats[stat] = newVal;
            valueSpan.textContent = newVal;
            renderPlayerList();
          });
        });
      }
    }

    function filterPlayersByNameAndType(name, type) {
      return players.filter(p => p.type === type && p.name.includes(name));
    }

    pitcherSearchInput.addEventListener('input', () => {
      const val = pitcherSearchInput.value.trim();
      pitcherSearchResults.innerHTML = '';
      if (val.length === 0) {
        pitcherEditSection.style.display = 'none';
        selectedPitcher = null;
        return;
      }
      const filtered = filterPlayersByNameAndType(val, '투수');
      filtered.forEach(player => {
        const div = document.createElement('div');
        div.textContent = player.name;
        div.style.cursor = 'pointer';
        div.style.padding = '4px';
        div.addEventListener('click', () => {
          selectedPitcher = player;
          pitcherNameDisplay.textContent = `${player.name} (투수)`;
          renderStatsEditor(player, pitcherStatsContainer);
          pitcherEditSection.style.display = 'block';
          pitcherSearchResults.innerHTML = '';
        });
        pitcherSearchResults.appendChild(div);
      });
    });

    hitterSearchInput.addEventListener('input', () => {
      const val = hitterSearchInput.value.trim();
      hitterSearchResults.innerHTML = '';
      if (val.length === 0) {
        hitterEditSection.style.display = 'none';
        selectedHitter = null;
        return;
      }
      const filtered = filterPlayersByNameAndType(val, '타자');
      filtered.forEach(player => {
        const div = document.createElement('div');
        div.textContent = player.name;
        div.style.cursor = 'pointer';
        div.style.padding = '4px';
        div.addEventListener('click', () => {
          selectedHitter = player;
          hitterNameDisplay.textContent = `${player.name} (타자)`;
          renderStatsEditor(player, hitterStatsContainer);
          hitterEditSection.style.display = 'block';
          hitterSearchResults.innerHTML = '';
        });
        hitterSearchResults.appendChild(div);
      });
    });

    document.getElementById('saveDuelBtn').addEventListener('click', () => {
      if (!selectedPitcher || !selectedHitter) {
        alert('투수와 타자를 모두 선택하세요.');
        return;
      }
      alert(`대결 기록이 저장되었습니다:\n투수: ${selectedPitcher.name}\n타자: ${selectedHitter.name}`);
    });

    // 선수 데이터 내보내기
    document.getElementById('exportPlayersBtn').addEventListener('click', () => {
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

  // --- records.html 관련 기능 ---
  if (document.getElementById('rankingContent')) {
    const goToInputBtn = document.getElementById('goToInputBtn');
    const hitterMenu = document.getElementById('hitterMenu');
    const pitcherMenu = document.getElementById('pitcherMenu');
    const searchInput = document.getElementById('searchInput');

    const hitterStatsForRanking = ['타율', '홈런', '출루율', 'OPS', '타점'];
    const pitcherStatsForRanking = ['승리', '세이브', '홀드', '삼진', 'ERA', 'WHIP'];
    let currentSort = { column: '타율', asc: true };

    async function renderRanking(stat, asc = true) {
      const rankingContent = document.getElementById('rankingContent');
      rankingContent.innerHTML = '';
      let players = await loadPlayersFromSupabase();

      const keyword = searchInput.value.trim();
      if (keyword) {
        const lower = keyword.toLowerCase();
        players = players.filter(p => p.name.toLowerCase().includes(lower));
      }

      // 정렬
      players.sort((a, b) => {
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

      rankingContent.appendChild(createRankingTable(players, stat, currentSort));
    }

    function getStatValue(player, stat) {
      switch(stat) {
        case '타율': {
          const H = (player.stats['1루타']||0)+(player.stats['2루타']||0)+(player.stats['3루타']||0)+(player.stats['홈런']||0);
          const AB = H + (player.stats['삼진']||0) + (player.stats['내야땅볼']||0) + (player.stats['플라이아웃']||0);
          return AB === 0 ? 0 : H/AB;
        }
        case '출루율': {
          const H = (player.stats['1루타']||0)+(player.stats['2루타']||0)+(player.stats['3루타']||0)+(player.stats['홈런']||0);
          const BB = player.stats['볼넷']||0;
          const SF = player.stats['희생플라이']||0;
          const AB = H + (player.stats['삼진']||0) + (player.stats['내야땅볼']||0) + (player.stats['플라이아웃']||0);
          const denom = AB + BB + SF;
          return denom === 0 ? 0 : (H + BB) / denom;
        }
        case 'OPS': {
          return getStatValue(player, '출루율') + calculateSLG(player);
        }
        case '홈런':
        case '타점':
        case '승리':
        case '세이브':
        case '홀드':
        case '삼진':
          return player.stats[stat] || 0;
        case 'ERA': {
          const ER = player.stats['자책점']||0;
          const IP = player.stats['이닝']||0;
          return IP === 0 ? 0 : (ER * 9) / IP;
        }
        case 'WHIP': {
          const BB = player.stats['볼넷']||0;
          const H = player.stats['피안타']||0;
          const IP = player.stats['이닝']||0;
          return IP === 0 ? 0 : (BB + H) / IP;
        }
        default: return 0;
      }
    }

    function calculateSLG(player) {
      const doubles = player.stats['2루타']||0;
      const triples = player.stats['3루타']||0;
      const HR = player.stats['홈런']||0;
      const AB = doubles + triples + HR + (player.stats['삼진']||0) + (player.stats['내야땅볼']||0) + (player.stats['플라이아웃']||0);
      if (AB === 0) return 0;
      const totalBases = (1*(player.stats['1루타']||0)) + 2*doubles + 3*triples + 4*HR;
      return totalBases / AB;
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
        const val = getStatValue(player, stat);
        let displayVal = val;
        if (['타율', '출루율', 'OPS'].includes(stat)) displayVal = val.toFixed(3);
        else if (stat === 'ERA') displayVal = val.toFixed(2);
        else if (stat === 'WHIP') displayVal = val.toFixed(3);
        else if (stat === '승률') displayVal = (val*100).toFixed(1) + '%';
        statTd.textContent = displayVal;
        tr.appendChild(statTd);

        tbody.appendChild(tr);
      });

      table.appendChild(thead);
      table.appendChild(tbody);
      return table;
    }

    // MVP 순위 렌더링
    async function renderMvpRanking() {
      const mvpRankingSection = document.getElementById('mvpRankingSection');
      const mvpRankingTableBody = document.querySelector('#mvpRankingTable tbody');
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

    // 팀별 통계 계산 및 렌더링
    async function calculateTeamStats() {
      const teamStatsSection = document.getElementById('teamStatsSection');
      const teamStatsTableBody = document.querySelector('#teamStatsTable tbody');
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

    goToInputBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // 초기 렌더링
    renderRanking(currentSort.column, currentSort.asc);
    renderMvpRanking();
    calculateTeamStats();

    hitterMenu.addEventListener('click', e => {
      if (e.target.tagName === 'LI') {
        [...hitterMenu.children].forEach(li => li.classList.remove('active'));
        [...pitcherMenu.children].forEach(li => li.classList.remove('active'));
        e.target.classList.add('active');
        currentSort.column = e.target.getAttribute('data-stat');
        currentSort.asc = true;
        searchInput.value = '';
        renderRanking(currentSort.column, currentSort.asc);
      }
    });

    pitcherMenu.addEventListener('click', e => {
      if (e.target.tagName === 'LI') {
        [...hitterMenu.children].forEach(li => li.classList.remove('active'));
        [...pitcherMenu.children].forEach(li => li.classList.remove('active'));
        e.target.classList.add('active');
        currentSort.column = e.target.getAttribute('data-stat');
        currentSort.asc = true;
        searchInput.value = '';
        renderRanking(currentSort.column, currentSort.asc);
      }
    });

    searchInput.addEventListener('input', () => {
      renderRanking(currentSort.column, currentSort.asc);
    });
  }
});
