// Supabase 연결
const SUPABASE_URL = 'https://knncinmwspqciwutilgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubmNpbm13c3BxY2l3dXRpbGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMzk1MzIsImV4cCI6MjA2NDkxNTUzMn0.nswNMUmLlaY1QgPhnCoHH5hVUkXjSgtoUYorHtRoQW4';
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
  return data || [];
}

// 선수 리스트 렌더링
function renderPlayerList(players) {
  const playerListDiv = document.getElementById('playerList');
  if (!playerListDiv) return;
  playerListDiv.innerHTML = '';
  if (players.length === 0) {
    playerListDiv.textContent = '등록된 선수가 없습니다.';
    updateMvpSelect(players);
    return;
  }

  // 표시할 스탯 컬럼 (한글명)
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

// Supabase에 선수 데이터 업데이트 함수
async function updatePlayerOnSupabase(player) {
  if (!player.id) return;
  const { error } = await supabase.from('players').update(player).eq('id', player.id);
  if (error) console.error('선수 업데이트 오류:', error);
}

// Supabase에 선수 삭제 함수
async function deletePlayerOnSupabase(playerId) {
  if (!playerId) return;
  const { error } = await supabase.from('players').delete().eq('id', playerId);
  if (error) console.error('선수 삭제 오류:', error);
}

// index.html 이벤트 바인딩
function bindIndexPageEvents(players) {
  const addPlayerForm = document.getElementById('addPlayerForm');
  if (addPlayerForm) {
    addPlayerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('playerName')?.value.trim();
      const type = document.getElementById('playerType')?.value;
      const team = document.getElementById('playerTeam')?.value;

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

      // 기본 스탯 초기화
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
      const { data, error } = await supabase.from('players').insert([newPlayer]);
      if (error) {
        alert('선수 추가 중 오류 발생: ' + error.message);
        console.error(error);
        return;
      }

      // 새로 추가된 선수의 id 포함 데이터 가져오기
      const insertedPlayer = data[0];
      players.push(insertedPlayer);
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

        // Supabase에서 삭제
        await deletePlayerOnSupabase(players[idx].id);

        players.splice(idx, 1);
        renderPlayerList(players);

      } else if (target.classList.contains('stat-btn')) {
        const idx = parseInt(target.dataset.idx);
        const stat = target.dataset.stat;
        const delta = parseInt(target.dataset.delta);
        if (isNaN(idx) || !stat || isNaN(delta)) return;

        if (stat === 'mvpcount') {
          const newVal = (players[idx].mvpcount || 0) + delta;
          if (newVal < 0) return;
          players[idx].mvpcount = newVal;
        } else {
          const newVal = (players[idx][stat] || 0) + delta;
          if (newVal < 0) return;
          players[idx][stat] = newVal;
        }

        // Supabase에 업데이트 반영
        await updatePlayerOnSupabase(players[idx]);

        renderPlayerList(players);
      }
    });
  }

  // MVP 선정 버튼
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
      players[idx].mvpcount = (players[idx].mvpcount || 0) + 1;
      updatePlayerOnSupabase(players[idx]);
      renderPlayerList(players);
      mvpMessage.textContent = `${players[idx].name} 선수가 MVP로 선정되었습니다! (총 ${players[idx].mvpcount}회)`;
      mvpSelect.value = '';
    });
  }

  // 선수 데이터 내보내기 버튼
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

// DOMContentLoaded 이벤트에서 페이지에 따라 기능 분기 실행
document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('addPlayerForm')) {
    const players = await loadPlayersFromSupabase();
    renderPlayerList(players);
    bindIndexPageEvents(players);
  }

  // records.html 관련 함수들은 필요하면 추가 구현하세요
});
