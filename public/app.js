async function fetchGroups() {
  const res = await fetch('/api/groups');
  const groups = await res.json();
  renderGroups(groups);
}

function renderGroups(groups) {
  const container = document.getElementById('groups');
  container.innerHTML = '';
  groups.forEach(group => {
    const div = document.createElement('div');
    div.className = 'group';
    div.innerHTML = `
      <h2>${group.name}</h2>
      ${group.counters.map(counter => `
        <div class="counter">
          <span>${counter.name}: ${counter.value}</span>
          <div>
            <button onclick="updateCounter('${group._id}', '${counter._id}', 'increment')">+</button>
            <button onclick="updateCounter('${group._id}', '${counter._id}', 'decrement')">–</button>
          </div>
        </div>
      `).join('')}
      <button onclick="exportGroup('${group._id}', 'csv')">Export CSV</button>
      <button onclick="showQR('${group._id}')">QR Code</button>
      <canvas id="chart-${group._id}" width="300" height="150"></canvas>
    `;
    container.appendChild(div);
    renderChart(group);
  });
}

async function updateCounter(groupId, counterId, action) {
  await fetch(`/api/groups/${groupId}/counters/${counterId}/${action}`, { method: 'POST' });
  fetchGroups();
}

async function exportGroup(groupId, format) {
  const url = `/api/groups/${groupId}/export/${format}`;
  window.open(url, '_blank');
}

async function showQR(groupId) {
  const res = await fetch(`/api/groups/${groupId}/qr`);
  const { qr } = await res.json();
  const win = window.open('');
  win.document.write('<img src="' + qr + '" />');
}

function renderChart(group) {
  const ctx = document.getElementById('chart-' + group._id).getContext('2d');
  const data = {};

  group.counters.forEach(counter => {
    counter.history.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString();
      if (!data[date]) data[date] = 0;
      data[date] += (event.action === 'increment' ? 1 : -1);
    });
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: 'Total Activity',
        data: Object.values(data),
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

async function createGroup(event) {
  event.preventDefault();
  const input = document.getElementById('groupNameInput');
  const groupName = input.value.trim();
  if (!groupName) return;
  await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: groupName, counters: [] })
  });
  input.value = '';
  fetchGroups();
}

function toggleTheme() {
  document.body.classList.toggle('light');
}

window.onload = fetchGroups;
