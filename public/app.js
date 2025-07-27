let sortMode = "";

function setSortMode(mode) {
  sortMode = mode;
  fetchGroups();
}

async function fetchGroups() {
  const res = await fetch('/api/groups');
  let groups = await res.json();

  if (sortMode === "name") {
    groups.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortMode === "created") {
    groups.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  renderGroups(groups);
}

function renderGroups(groups) {
  const container = document.getElementById('groups');
  container.innerHTML = '';
  groups.forEach(group => {
    const div = document.createElement('div');
    div.className = 'p-4 border border-gray-600 rounded bg-gray-800';
    div.innerHTML = `
      <h2 contenteditable="true" onblur="renameGroup('${group._id}', this.textContent)" class="text-lg font-semibold mb-2">${group.name}</h2>
      ${group.counters.map(counter => `
        <div class="flex justify-between items-center mb-2">
          <input type="text" value="${counter.name}" onblur="renameCounter('${group._id}', '${counter._id}', this.value)" class="bg-transparent text-white border-b border-gray-500 mr-2" />
          <span>${counter.value}</span>
          <div>
            <button onclick="updateCounter('${group._id}', '${counter._id}', 'increment')" class="text-green-400 hover:text-green-300"><i class="fas fa-plus"></i></button>
            <button onclick="updateCounter('${group._id}', '${counter._id}', 'decrement')" class="text-red-400 hover:text-red-300"><i class="fas fa-minus"></i></button>
          </div>
        </div>
      `).join('')}
      <form onsubmit="addCounter(event, '${group._id}')" class="flex gap-2 mt-2">
        <input type="text" placeholder="New counter name" id="newCounter-${group._id}" required class="px-2 py-1 rounded text-black" />
        <button type="submit" class="bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-500">Add Counter</button>
      </form>
      <div class="mt-3 flex gap-2">
        <button onclick="exportGroup('${group._id}', 'csv')" class="bg-yellow-600 px-3 py-1 rounded hover:bg-yellow-500">Export CSV</button>
        <button onclick="showQR('${group._id}')" class="bg-teal-600 px-3 py-1 rounded hover:bg-teal-500">QR Code</button>
      </div>
      <canvas id="chart-${group._id}" class="mt-4" width="300" height="150"></canvas>
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

async function addCounter(event, groupId) {
  event.preventDefault();
  const input = document.getElementById('newCounter-' + groupId);
  const name = input.value.trim();
  if (!name) return;
  const res = await fetch('/api/groups');
  const groups = await res.json();
  const group = groups.find(g => g._id === groupId);
  group.counters.push({ name, value: 0, history: [] });
  await fetch('/api/groups/' + groupId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(group)
  });
  input.value = '';
  fetchGroups();
}

async function renameCounter(groupId, counterId, newName) {
  const res = await fetch('/api/groups');
  const groups = await res.json();
  const group = groups.find(g => g._id === groupId);
  const counter = group.counters.find(c => c._id === counterId);
  counter.name = newName;
  await fetch('/api/groups/' + groupId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(group)
  });
}

async function renameGroup(groupId, newName) {
  const res = await fetch('/api/groups');
  const groups = await res.json();
  const group = groups.find(g => g._id === groupId);
  group.name = newName;
  await fetch('/api/groups/' + groupId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(group)
  });
}

function toggleTheme() {
  document.body.classList.toggle('bg-gray-900');
  document.body.classList.toggle('bg-white');
  document.body.classList.toggle('text-white');
  document.body.classList.toggle('text-black');
}

window.onload = fetchGroups;
