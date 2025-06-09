// Supabase 연결 정보
const SUPABASE_URL = 'https://knncinmwspqciwutilgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubmNpbm13c3BxY2l3dXRpbGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMzk1MzIsImV4cCI6MjA2NDkxNTUzMn0.nswNMUmLlaY1QgPhnCoHH5hVUkXjSgtoUYorHtRoQW4';

// Supabase 클라이언트 초기화
const supabase = supabasejs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 현재 페이지 이름
const currentPage = window.location.pathname.split('/').pop();

// 공통 함수: URL 쿼리 파라미터에서 값 가져오기
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// index.html: 선수 목록 페이지
async function loadPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('name');

  if (error) {
    alert('선수 목록을 불러오는데 실패했습니다.');
    console.error(error);
    return;
  }

  const playerList = document.getElementById('playerList');
  playerList.innerHTML = '';

  data.forEach(player => {
    const li = document.createElement('li');
    li.textContent = `${player.name} (${player.team || '팀 없음'})`;
    li.onclick = () => {
      window.location.href = `player_detail.html?id=${player.id}`;
    };
    playerList.appendChild(li);
  });
}

// index.html: 선수 추가 버튼
async function addPlayer() {
  const name = prompt('추가할 선수 이름을 입력하세요');
  if (!name) return;

  const { data, error } = await supabase
    .from('players')
    .insert([{ name }]);

  if (error) {
    alert('선수 추가에 실패했습니다.');
    console.error(error);
  } else {
    loadPlayers();
  }
}

// records.html: 경기 기록 로딩
async function loadPlayersForSelect() {
  const select = document.getElementById('playerSelect');
  select.innerHTML = '<option value="">선수 선택</option>';

  const { data, error } = await supabase
    .from('players')
    .select('id, name')
    .order('name');

  if (error) {
    alert('선수 목록을 불러오는데 실패했습니다.');
    console.error(error);
    return;
  }

  data.forEach(player => {
    const option = document.createElement('option');
    option.value = player.id;
    option.textContent = player.name;
    select.appendChild(option);
  });
}

async function loadRecords(playerId) {
  if (!playerId) return;

  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('player_id', playerId)
    .order('game_date', { ascending: false });

  if (error) {
    alert('기록을 불러오는데 실패했습니다.');
    console.error(error);
    return;
  }

  const tbody = document.querySelector('#recordsTable tbody');
  tbody.innerHTML = '';

  data.forEach(record => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${record.game_date}</td>
      <td>${record.at_bats}</td>
      <td>${record.hits}</td>
      <td>${record.runs}</td>
      <td>${record.rbis}</td>
      <td>${record.home_runs}</td>
      <td><button onclick="editRecord(${record.id})">수정</button></td>
      <td><button onclick="deleteRecord(${record.id})">삭제</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// 기록 추가 함수 (모달 대신 prompt 활용)
async function addRecord(playerId) {
  if (!playerId) {
    alert('선수를 선택하세요.');
    return;
  }

  const game_date = prompt('경기 날짜를 입력하세요 (YYYY-MM-DD)');
  if (!game_date) return;

  const at_bats = parseInt(prompt('타수 입력'), 10) || 0;
  const hits = parseInt(prompt('안타 입력'), 10) || 0;
  const runs = parseInt(prompt('득점 입력'), 10) || 0;
  const rbis = parseInt(prompt('타점 입력'), 10) || 0;
  const home_runs = parseInt(prompt('홈런 입력'), 10) || 0;

  const { error } = await supabase
    .from('records')
    .insert([{
      player_id: playerId,
      game_date,
      at_bats,
      hits,
      runs,
      rbis,
      home_runs
    }]);

  if (error) {
    alert('기록 추가에 실패했습니다.');
    console.error(error);
  } else {
    loadRecords(playerId);
  }
}

// 기록 삭제
async function deleteRecord(recordId) {
  if (!confirm('기록을 삭제하시겠습니까?')) return;

  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', recordId);

  if (error) {
    alert('기록 삭제 실패');
    console.error(error);
  } else {
    // 삭제 후 기록 재로딩
    const select = document.getElementById('playerSelect');
    if (select.value) loadRecords(select.value);
  }
}

// 기록 수정 (prompt 기반)
async function editRecord(recordId) {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('id', recordId)
    .single();

  if (error) {
    alert('기록을 불러오는데 실패했습니다.');
    console.error(error);
    return;
  }

  const record = data;
  const game_date = prompt('경기 날짜 (YYYY-MM-DD)', record.game_date);
  if (!game_date) return;

  const at_bats = parseInt(prompt('타수', record.at_bats), 10) || 0;
  const hits = parseInt(prompt('안타', record.hits), 10) || 0;
  const runs = parseInt(prompt('득점', record.runs), 10) || 0;
  const rbis = parseInt(prompt('타점', record.rbis), 10) || 0;
  const home_runs = parseInt(prompt('홈런', record.home_runs), 10) || 0;

  const { error:updateError } = await supabase
    .from('records')
    .update({
      game_date,
      at_bats,
      hits,
      runs,
      rbis,
      home_runs
    })
    .eq('id', recordId);

  if (updateError) {
    alert('기록 수정에 실패했습니다.');
    console.error(updateError);
  } else {
    const select = document.getElementById('playerSelect');
    if (select.value) loadRecords(select.value);
  }
}

// player_detail.html: 선수 상세 정보 불러오기 및 저장
async function loadPlayerDetail() {
  const playerId = getQueryParam('id');
  if (!playerId) {
    alert('잘못된 접근입니다.');
    window.location.href = 'index.html';
    return;
  }

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (error) {
    alert('선수 정보를 불러오는데 실패했습니다.');
    console.error(error);
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('playerName').value = data.name;
  document.getElementById('playerTeam').value = data.team || '';
  document.getElementById('playerPosition').value = data.position || '';
  document.getElementById('playerBirthdate').value = data.birthdate || '';
  document.getElementById('playerHeight').value = data.height_cm || '';
  document.getElementById('playerWeight').value = data.weight_kg || '';
}

async function savePlayerDetail(e) {
  e.preventDefault();

  const playerId = getQueryParam('id');
  if (!playerId) {
    alert('잘못된 접근입니다.');
    return;
  }

  const playerData = {
    name: document.getElementById('playerName').value.trim(),
    team: document.getElementById('playerTeam').value.trim(),
    position: document.getElementById('playerPosition').value.trim(),
    birthdate: document.getElementById('playerBirthdate').value,
    height_cm: parseInt(document.getElementById('playerHeight').value, 10) || null,
    weight_kg: parseInt(document.getElementById('playerWeight').value, 10) || null
  };

  if (!playerData.name) {
    alert('이름은 필수입니다.');
    return;
  }

  const { error } = await supabase
    .from('players')
    .update(playerData)
    .eq('id', playerId);

  if (error) {
    alert('선수 정보 저장에 실패했습니다.');
    console.error(error);
  } else {
    alert('저장되었습니다.');
    window.location.href = 'index.html';
  }
}

// 페이지별 초기화
document.addEventListener('DOMContentLoaded', () => {
  if (currentPage === 'index.html') {
    loadPlayers();
    document.getElementById('addPlayerBtn').addEventListener('click', addPlayer);

    // 검색 기능
    document.getElementById('searchInput').addEventListener('input', async (e) => {
      const keyword = e.target.value.toLowerCase();
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .ilike('name', `%${keyword}%`)
        .order('name');

      if (!error) {
        const playerList = document.getElementById('playerList');
        playerList.innerHTML = '';
        data.forEach(player => {
          const li = document.createElement('li');
          li.textContent = `${player.name} (${player.team || '팀 없음'})`;
          li.onclick = () => {
            window.location.href = `player_detail.html?id=${player.id}`;
          };
          playerList.appendChild(li);
        });
      }
    });
  } else if (currentPage === 'records.html') {
    loadPlayersForSelect();

    document.getElementById('playerSelect').addEventListener('change', (e) => {
      loadRecords(e.target.value);
    });

    document.getElementById('addRecordBtn').addEventListener('click', () => {
      const playerId = document.getElementById('playerSelect').value;
      addRecord(playerId);
    });
  } else if (currentPage === 'player_detail.html') {
    loadPlayerDetail();
    document.getElementById('playerForm').addEventListener('submit', savePlayerDetail);
  }
});
