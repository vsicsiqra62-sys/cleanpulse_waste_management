/**
 * CleanPulse - Smart Civic Waste Management Platform
 * Complete Frontend Application Logic
 */

// Application State
const state = {
  currentUser: null,
  currentRole: 'user', // 'user' | 'collector' | 'admin'
  currentTab: 'report',
  areas: [],
  wasteAlertData: null,
  activeAlertFilter: 'all',
  countdownInterval: null,
  userLoggerData: [],
  collectorLoggerData: []
};

// Preset Sample Imagery for Quick Demos & Picture Submissions
const SAMPLE_IMAGES = {
  waste1: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=60",
  waste2: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop&q=60",
  waste3: "https://images.unsplash.com/photo-1528323273322-d81458248d40?w=600&auto=format&fit=crop&q=60",
  clean1: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&auto=format&fit=crop&q=60",
  clean2: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=600&auto=format&fit=crop&q=60"
};

// Role Tabs Configuration
const ROLE_TABS = {
  user: [
    { id: 'report', label: 'Report Box', icon: 'fa-camera' },
    { id: 'rewards', label: 'Score / Reward', icon: 'fa-award' },
    { id: 'profile', label: 'Profile', icon: 'fa-user' },
    { id: 'tracking', label: 'Tracking / Completed', icon: 'fa-clock-rotate-left' },
    { id: 'area', label: 'Area Details', icon: 'fa-map-location-dot' }
  ],
  collector: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-table-columns' },
    { id: 'progress', label: 'Personal Progress', icon: 'fa-chart-pie' },
    { id: 'profile', label: 'Profile & Rewards', icon: 'fa-address-card' }
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-simple' },
    { id: 'alerts', label: 'Waste Area Alert', icon: 'fa-triangle-exclamation' },
    { id: 'loggers', label: 'Logger (Users)', icon: 'fa-table' },
    { id: 'employees', label: 'Employees (Collectors)', icon: 'fa-users-gear' }
  ]
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
  await loadAreas();
  initAuthSession();
  setupCountdownTicker();
});

// Periodic ticker for 48h SLA timers
function setupCountdownTicker() {
  if (state.countdownInterval) clearInterval(state.countdownInterval);
  state.countdownInterval = setInterval(() => {
    updateAllCountdownDisplays();
  }, 1000);
}

// Load Areas list from backend
async function loadAreas() {
  try {
    const res = await fetch('/api/areas');
    const data = await res.json();
    if (data.success) {
      state.areas = data.areas;
      populateAreaDropdowns();
    }
  } catch (err) {
    console.error("Failed to load areas:", err);
  }
}

function populateAreaDropdowns() {
  const selects = ['complaint-area', 'reg-area', 'edit-area'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = state.areas.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
  });
}

// Session initialization
function initAuthSession() {
  const saved = localStorage.getItem('cleanpulse_auth');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.currentUser = parsed.user;
      state.currentRole = parsed.role;
      state.currentTab = ROLE_TABS[state.currentRole][0].id;
    } catch (e) {
      setDefaultUser();
    }
  } else {
    // Default to Citizen Aarav Mehta for instant experience
    setDefaultUser();
  }
  renderHeaderAuth();
  renderRoleNav();
  switchRoleView(state.currentRole, state.currentTab);
}

function setDefaultUser() {
  state.currentUser = {
    id: 1,
    unique_id: 'USR-29481',
    name: 'Aarav Mehta',
    age: 28,
    area: 'Downtown',
    email: 'aarav.mehta@example.com',
    phone: '9123456780',
    gender: 'Male',
    role: 'user'
  };
  state.currentRole = 'user';
  state.currentTab = 'report';
  saveSession();
}

function saveSession() {
  localStorage.setItem('cleanpulse_auth', JSON.stringify({
    user: state.currentUser,
    role: state.currentRole
  }));
}

// ================= NAVIGATION & VIEW SWITCHING =================

function renderHeaderAuth() {
  const container = document.getElementById('auth-header-container');
  const notifWrapper = document.getElementById('notification-wrapper');

  if (!state.currentUser) {
    notifWrapper.classList.add('hidden');
    container.innerHTML = `
      <button onclick="openAuthModal('login')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition">
        <i class="fa-solid fa-right-to-bracket mr-1"></i> Sign In
      </button>
    `;
    return;
  }

  // Show notifications bell for users
  if (state.currentRole === 'user') {
    notifWrapper.classList.remove('hidden');
    fetchUserNotifications();
  } else {
    notifWrapper.classList.add('hidden');
  }

  const roleColors = {
    user: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    collector: 'bg-blue-100 text-blue-800 border-blue-300',
    admin: 'bg-purple-100 text-purple-800 border-purple-300'
  };

  container.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="hidden sm:block text-right">
        <div class="text-xs font-extrabold text-slate-800 flex items-center gap-1 justify-end">
          <span>${state.currentUser.name}</span>
          <span class="text-[10px] font-mono px-1.5 py-0.2 rounded border ${roleColors[state.currentRole]}">${state.currentUser.unique_id}</span>
        </div>
        <div class="text-[11px] text-slate-400 capitalize">${state.currentRole} ${state.currentUser.area ? '&bull; ' + state.currentUser.area : (state.currentUser.assigned_area ? '&bull; ' + state.currentUser.assigned_area : '')}</div>
      </div>
      <button onclick="handleLogout()" title="Sign Out" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition">
        <i class="fa-solid fa-arrow-right-from-bracket"></i>
      </button>
    </div>
  `;

  // Highlight Demo button in topbar
  document.querySelectorAll('[id^="btn-demo-"]').forEach(btn => btn.classList.remove('bg-white', 'shadow-sm', 'font-bold'));
  if (state.currentRole === 'user' && state.currentUser.unique_id === 'USR-29481') {
    document.getElementById('btn-demo-user')?.classList.add('bg-white', 'shadow-sm', 'font-bold');
  } else if (state.currentRole === 'collector' && state.currentUser.unique_id === 'COL-41092') {
    document.getElementById('btn-demo-collector')?.classList.add('bg-white', 'shadow-sm', 'font-bold');
  } else if (state.currentRole === 'collector' && state.currentUser.unique_id === 'COL-65239') {
    document.getElementById('btn-demo-collector2')?.classList.add('bg-white', 'shadow-sm', 'font-bold');
  } else if (state.currentRole === 'admin') {
    document.getElementById('btn-demo-admin')?.classList.add('bg-white', 'shadow-sm', 'font-bold');
  }
}

function renderRoleNav() {
  const container = document.getElementById('nav-tabs-container');
  const tabs = ROLE_TABS[state.currentRole] || [];

  container.innerHTML = tabs.map(tab => {
    const isActive = tab.id === state.currentTab;
    const activeClasses = isActive 
      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold' 
      : 'text-slate-600 hover:bg-slate-100 font-semibold';
    
    // Collector and Admin accent styles
    let activeStyle = activeClasses;
    if (isActive && state.currentRole === 'collector') {
      activeStyle = 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold';
    } else if (isActive && state.currentRole === 'admin') {
      activeStyle = 'bg-purple-700 text-white shadow-md shadow-purple-700/20 font-bold';
    }

    return `
      <button onclick="switchTab('${state.currentRole}', '${tab.id}')" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${activeStyle}">
        <i class="fa-solid ${tab.icon}"></i>
        <span>${tab.label}</span>
      </button>
    `;
  }).join('');
}

function switchRoleView(role, tabId) {
  state.currentRole = role;
  state.currentTab = tabId || ROLE_TABS[role][0].id;

  // Toggle Portal Sections
  document.getElementById('user-portal').classList.toggle('hidden', role !== 'user');
  document.getElementById('collector-portal').classList.toggle('hidden', role !== 'collector');
  document.getElementById('admin-portal').classList.toggle('hidden', role !== 'admin');

  renderRoleNav();
  renderHeaderAuth();

  // Load content for active tab
  if (role === 'user') {
    showUserTab(state.currentTab);
  } else if (role === 'collector') {
    showCollectorTab(state.currentTab);
  } else if (role === 'admin') {
    showAdminTab(state.currentTab);
  }
}

function switchTab(role, tabId) {
  state.currentTab = tabId;
  renderRoleNav();

  if (role === 'user') showUserTab(tabId);
  else if (role === 'collector') showCollectorTab(tabId);
  else if (role === 'admin') showAdminTab(tabId);
}

function handleLogoClick() {
  if (state.currentRole === 'user') switchTab('user', 'report');
  else if (state.currentRole === 'collector') switchTab('collector', 'dashboard');
  else if (state.currentRole === 'admin') switchTab('admin', 'dashboard');
}

// ================= QUICK DEMO SWITCHER =================
async function quickSwitchRole(target) {
  if (target === 'user') {
    state.currentUser = {
      id: 1,
      unique_id: 'USR-29481',
      name: 'Aarav Mehta',
      age: 28,
      area: 'Downtown',
      email: 'aarav.mehta@example.com',
      phone: '9123456780',
      gender: 'Male',
      role: 'user'
    };
    state.currentRole = 'user';
    state.currentTab = 'report';
  } else if (target === 'collector') {
    state.currentUser = {
      id: 1,
      unique_id: 'COL-41092',
      name: 'Rajesh Sharma',
      gender: 'Male',
      phone: '9876543210',
      email: 'rajesh.collector@cleanwaste.com',
      assigned_area: 'Downtown',
      coins: 8,
      role: 'collector'
    };
    state.currentRole = 'collector';
    state.currentTab = 'dashboard';
  } else if (target === 'collector2') {
    state.currentUser = {
      id: 5,
      unique_id: 'COL-65239',
      name: 'Manoj Kumar',
      gender: 'Male',
      phone: '9876543214',
      email: 'manoj.collector@cleanwaste.com',
      assigned_area: 'Market Square',
      coins: 22,
      role: 'collector'
    };
    state.currentRole = 'collector';
    state.currentTab = 'dashboard';
  } else if (target === 'admin') {
    state.currentUser = {
      id: 1,
      unique_id: 'ADM-001',
      name: 'Chief Sanitation Director',
      email: 'admin@cleanwaste.com',
      phone: '9999999999',
      role: 'admin'
    };
    state.currentRole = 'admin';
    state.currentTab = 'dashboard';
  }

  saveSession();
  switchRoleView(state.currentRole, state.currentTab);
  showToast(`Switched active view to ${state.currentUser.name} (${state.currentRole.toUpperCase()})`, 'success');
}

// ================= 1. USER PORTAL LOGIC =================

function showUserTab(tabId) {
  const tabs = ['report', 'rewards', 'profile', 'tracking', 'area'];
  tabs.forEach(t => {
    const el = document.getElementById(`user-section-${t}`);
    if (el) el.classList.toggle('hidden', t !== tabId);
  });

  if (tabId === 'rewards') loadUserRewards();
  else if (tabId === 'profile') loadUserProfile();
  else if (tabId === 'tracking') loadUserTracking();
  else if (tabId === 'area') loadUserAreaDetails();
  else if (tabId === 'report') {
    // Pre-fill user's area if available
    const areaSelect = document.getElementById('complaint-area');
    if (areaSelect && state.currentUser && state.currentUser.area) {
      areaSelect.value = state.currentUser.area;
    }
  }
}

// Form Submission: Complain
async function handleComplaintSubmit(e) {
  e.preventDefault();
  const desc = document.getElementById('complaint-desc').value.trim();
  const area = document.getElementById('complaint-area').value;
  const previewImg = document.getElementById('complaint-image-preview').src;
  const image = previewImg && !previewImg.endsWith('index.html') ? previewImg : '';

  if (!desc || !area) {
    showToast('Please provide a complaint description and area', 'error');
    return;
  }

  const submitBtn = document.getElementById('btn-submit-complaint');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Submitting...';

  try {
    const res = await fetch('/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: state.currentUser.id,
        area: area,
        description: desc,
        complaint_image: image
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Complaint filed! Tracking ID: ${data.tracking_id} (48h SLA activated)`, 'success');
      // Reset form
      document.getElementById('report-form').reset();
      clearImagePreview('complaint-image-preview', 'complaint-preview-container');
      // Navigate to tracking
      switchTab('user', 'tracking');
    } else {
      showToast(data.message || 'Failed to file complaint', 'error');
    }
  } catch (err) {
    showToast('Server error while filing complaint', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i> Submit Waste Complain';
  }
}

// Score & Rewards Loading
async function loadUserRewards() {
  try {
    const res = await fetch(`/api/user/profile?user_id=${state.currentUser.id}`);
    const data = await res.json();
    if (!data.success) return;

    const r = data.rewards;
    document.getElementById('user-total-complaints-count').textContent = r.total_complaints;
    document.getElementById('user-current-badge-display').textContent = r.badge;
    document.getElementById('user-reward-summary-title').textContent = `${r.badge_level} &bull; ${r.badge} Rank`;
    document.getElementById('user-next-badge-label').textContent = r.next_badge;
    document.getElementById('user-badge-progress-pct').textContent = `${r.progress_to_next}%`;
    document.getElementById('user-badge-progress-bar').style.width = `${r.progress_to_next}%`;

    // Badges: 25 = Bronze, 50 = Silver, 100 = Gold
    updateBadgeCard('bronze', r.total_complaints, 25, 'Bronze');
    updateBadgeCard('silver', r.total_complaints, 50, 'Silver');
    updateBadgeCard('gold', r.total_complaints, 100, 'Gold');
  } catch (err) {
    console.error("Failed to load user rewards:", err);
  }
}

function updateBadgeCard(tier, count, target, label) {
  const card = document.getElementById(`badge-card-${tier}`);
  const status = document.getElementById(`badge-status-${tier}`);
  const countEl = document.getElementById(`badge-count-${tier}`);
  
  if (!card) return;
  countEl.textContent = `${Math.min(count, target)} / ${target}`;

  if (count >= target) {
    status.textContent = 'Unlocked';
    status.className = 'text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1';
    status.innerHTML = '<i class="fa-solid fa-check"></i> Unlocked';
    card.classList.add('border-emerald-500', 'shadow-lg');
  } else {
    status.textContent = 'Locked';
    status.className = 'text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1';
    status.innerHTML = '<i class="fa-solid fa-lock"></i> Locked';
    card.classList.remove('border-emerald-500', 'shadow-lg');
  }
}

// Profile Loading
async function loadUserProfile() {
  try {
    const res = await fetch(`/api/user/profile?user_id=${state.currentUser.id}`);
    const data = await res.json();
    if (!data.success) return;

    const u = data.user;
    document.getElementById('profile-unique-id').textContent = u.unique_id;
    document.getElementById('profile-name').textContent = u.name;
    document.getElementById('profile-age-gender').textContent = `${u.age || 'N/A'} yrs &bull; ${u.gender || 'Not specified'}`;
    document.getElementById('profile-area').textContent = u.area;
    document.getElementById('profile-email').textContent = u.email || 'N/A';
    document.getElementById('profile-phone').textContent = u.phone;

    // Render complaint history
    renderComplainHistory(data.complaints);
  } catch (err) {
    console.error("Failed to load user profile:", err);
  }
}

function renderComplainHistory(complaints) {
  const container = document.getElementById('user-history-list');
  const countBadge = document.getElementById('history-total-count');
  countBadge.textContent = `${complaints.length} Reports`;

  if (complaints.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">No complaints filed yet. Help your community by reporting waste!</div>`;
    return;
  }

  container.innerHTML = complaints.map(c => {
    const isResolved = c.status === 'Resolved';
    const statusPill = isResolved
      ? `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800"><i class="fa-solid fa-check mr-1"></i>Resolved</span>`
      : `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800"><i class="fa-solid fa-hourglass-half mr-1"></i>Pending</span>`;

    return `
      <div class="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <img src="${c.complaint_image || SAMPLE_IMAGES.waste1}" class="w-14 h-14 rounded-xl object-cover border border-slate-200" alt="Spot">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-bold text-slate-800">${c.tracking_id}</span>
              <span class="text-xs text-slate-500 font-semibold">&bull; ${c.area}</span>
            </div>
            <p class="text-xs text-slate-600 line-clamp-1 mt-0.5">${c.description}</p>
            <div class="text-[10px] text-slate-400 mt-1">Reported: ${new Date(c.created_at).toLocaleDateString()} ${new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
          </div>
        </div>
        <div class="self-end sm:self-center">
          ${statusPill}
        </div>
      </div>
    `;
  }).join('');
}

// Edit Profile Modal Handling
function openEditProfileModal() {
  document.getElementById('edit-name').value = state.currentUser.name || '';
  document.getElementById('edit-age').value = state.currentUser.age || '';
  document.getElementById('edit-gender').value = state.currentUser.gender || 'Male';
  document.getElementById('edit-area').value = state.currentUser.area || state.areas[0]?.name;
  document.getElementById('edit-email').value = state.currentUser.email || '';
  document.getElementById('edit-phone').value = state.currentUser.phone || '';
  document.getElementById('modal-edit-profile').classList.remove('hidden');
}

function closeEditProfileModal() {
  document.getElementById('modal-edit-profile').classList.add('hidden');
}

async function handleEditProfileSubmit(e) {
  e.preventDefault();
  const payload = {
    id: state.currentUser.id,
    name: document.getElementById('edit-name').value.trim(),
    age: document.getElementById('edit-age').value,
    gender: document.getElementById('edit-gender').value,
    area: document.getElementById('edit-area').value,
    email: document.getElementById('edit-email').value.trim(),
    phone: document.getElementById('edit-phone').value.trim()
  };

  try {
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Profile updated successfully!', 'success');
      state.currentUser = data.user;
      saveSession();
      closeEditProfileModal();
      loadUserProfile();
      renderHeaderAuth();
    } else {
      showToast(data.message || 'Failed to update profile', 'error');
    }
  } catch (err) {
    showToast('Network error while updating profile', 'error');
  }
}

// Tracking / Completed Loading
async function loadUserTracking() {
  const container = document.getElementById('user-tracking-list');
  try {
    const res = await fetch(`/api/user/tracking?user_id=${state.currentUser.id}`);
    const data = await res.json();
    if (!data.success) return;

    if (data.complaints.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-400 space-y-3">
          <i class="fa-solid fa-clipboard-check text-4xl text-slate-300"></i>
          <h4 class="text-base font-bold text-slate-700">No Active Complains to Track</h4>
          <p class="text-xs max-w-sm mx-auto">When you report waste spots, real-time 48-hour SLA status and collector verification photos will be tracked right here.</p>
          <button onclick="switchTab('user', 'report')" class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow hover:bg-emerald-700 transition">File a Complain Now</button>
        </div>
      `;
      return;
    }

    container.innerHTML = data.complaints.map(c => {
      const isResolved = c.status === 'Resolved';
      
      // Step indicator styling
      const step1Class = 'text-emerald-600 font-bold';
      const step2Class = 'text-emerald-600 font-bold';
      const step3Class = isResolved ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold animate-pulse';
      const step4Class = isResolved ? 'text-emerald-600 font-extrabold' : 'text-slate-300';

      return `
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <!-- Top Row: ID, Area, 48h Countdown Timer & Status -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div class="flex items-center gap-3">
              <span class="w-3 h-3 rounded-full ${isResolved ? 'bg-emerald-500' : 'bg-amber-500 pulse-dot-red'}"></span>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-extrabold text-slate-800 font-mono">${c.tracking_id}</h3>
                  <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">${c.area}</span>
                </div>
                <div class="text-[11px] text-slate-400">Filed on: ${new Date(c.created_at).toLocaleString()}</div>
              </div>
            </div>

            <!-- 48-Hour SLA Timer Pill -->
            <div class="flex items-center gap-2">
              <div class="countdown-badge px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                isResolved 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }" data-deadline="${c.deadline_at}" data-status="${c.status}">
                <i class="fa-solid fa-clock"></i>
                <span class="timer-text">${isResolved ? 'Task Completed' : 'Calculating SLA...'}</span>
              </div>
              <span class="px-3 py-1.5 rounded-xl text-xs font-bold ${
                isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }">${c.status}</span>
            </div>
          </div>

          <!-- Progress Flow Line (4 Steps) -->
          <div class="py-2">
            <div class="grid grid-cols-4 text-center text-xs relative">
              <div class="space-y-1">
                <div class="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-[10px]"><i class="fa-solid fa-check"></i></div>
                <div class="${step1Class}">1. Reported</div>
              </div>
              <div class="space-y-1">
                <div class="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-[10px]"><i class="fa-solid fa-check"></i></div>
                <div class="${step2Class}">2. Assigned</div>
                <div class="text-[10px] text-slate-400">${c.collector_name || 'Assigned'}</div>
              </div>
              <div class="space-y-1">
                <div class="w-6 h-6 rounded-full ${isResolved ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'} flex items-center justify-center mx-auto text-[10px]">
                  <i class="fa-solid ${isResolved ? 'fa-check' : 'fa-spinner fa-spin'}"></i>
                </div>
                <div class="${step3Class}">3. In Progress</div>
              </div>
              <div class="space-y-1">
                <div class="w-6 h-6 rounded-full ${isResolved ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/50' : 'bg-slate-200 text-slate-400'} flex items-center justify-center mx-auto text-[10px]">
                  <i class="fa-solid fa-flag-checkered"></i>
                </div>
                <div class="${step4Class}">4. Completed</div>
              </div>
            </div>
          </div>

          <!-- Middle Content: Details & Images -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <!-- Left: Description and original photo -->
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <i class="fa-solid fa-align-left text-emerald-600"></i> Complain Description:
              </div>
              <p class="text-xs text-slate-700 leading-relaxed">${c.description}</p>
              <div>
                <span class="text-[10px] font-bold text-slate-400 block mb-1">Your Submitted Picture:</span>
                <img src="${c.complaint_image || SAMPLE_IMAGES.waste1}" class="w-full h-36 rounded-xl object-cover border border-slate-200" alt="Reported Picture">
              </div>
            </div>

            <!-- Right: Collector Resolution Proof -->
            <div class="p-4 rounded-2xl ${isResolved ? 'bg-emerald-50/60 border border-emerald-200' : 'bg-slate-50 border border-slate-200'} space-y-3">
              <div class="text-xs font-bold ${isResolved ? 'text-emerald-800' : 'text-slate-500'} flex items-center justify-between">
                <span class="flex items-center gap-1.5">
                  <i class="fa-solid fa-camera-rotate ${isResolved ? 'text-emerald-600' : 'text-slate-400'}"></i> Collector Verification Proof:
                </span>
                ${isResolved ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">Verified Cleared</span>' : ''}
              </div>

              ${isResolved ? `
                <div>
                  <img src="${c.resolution_image || SAMPLE_IMAGES.clean1}" class="w-full h-36 rounded-xl object-cover border border-emerald-300 shadow-sm" alt="Resolution Proof">
                </div>
                <div class="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-emerald-100">
                  <span class="font-bold text-emerald-800">Resolution Note:</span> ${c.resolution_notes || 'Cleaned and sanitized.'}
                  <div class="text-[10px] text-slate-400 mt-1">Cleared on: ${new Date(c.resolved_at).toLocaleString()} by Collector ${c.collector_name}</div>
                </div>
              ` : `
                <div class="h-44 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <i class="fa-solid fa-truck-moving text-2xl mb-1 text-slate-300"></i>
                  <span class="text-xs font-semibold">Sanitation crew assigned</span>
                  <span class="text-[10px] mt-1">Verification photo will appear here when collector clears the spot.</span>
                </div>
              `}
            </div>
          </div>

        </div>
      `;
    }).join('');

    // Trigger timer update immediately
    updateAllCountdownDisplays();
  } catch (err) {
    console.error("Failed to load user tracking:", err);
  }
}

// 48h Countdown update logic
function updateAllCountdownDisplays() {
  const badges = document.querySelectorAll('.countdown-badge');
  badges.forEach(badge => {
    const status = badge.getAttribute('data-status');
    const deadlineStr = badge.getAttribute('data-deadline');
    const textEl = badge.querySelector('.timer-text');
    if (!textEl) return;

    if (status === 'Resolved') {
      textEl.textContent = 'Task Completed';
      return;
    }

    if (!deadlineStr) return;
    const deadline = new Date(deadlineStr).getTime();
    const now = new Date().getTime();
    const diff = deadline - now;

    if (diff <= 0) {
      textEl.textContent = '⏱️ SLA Overdue';
      badge.classList.remove('bg-amber-50', 'text-amber-800');
      badge.classList.add('bg-rose-100', 'text-rose-800', 'border-rose-300');
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      textEl.textContent = `⏱️ ${hours}h ${mins}m ${secs}s left`;
    }
  });
}

// Area Details Loading
async function loadUserAreaDetails() {
  const userArea = state.currentUser?.area || 'Downtown';
  try {
    const res = await fetch(`/api/area-details?area=${encodeURIComponent(userArea)}`);
    const data = await res.json();
    if (!data.success) return;

    const a = data.area;
    document.getElementById('area-details-title').textContent = `${a.name} Ward`;
    document.getElementById('area-dumping-spots').textContent = a.dumping_spots;
    document.getElementById('area-cleanup-schedule').textContent = a.cleanup_schedule;
    document.getElementById('area-waste-capacity').textContent = a.waste_capacity;

    const alertPill = document.getElementById('area-active-alert-pill');
    if (data.active_complaints >= 5) {
      alertPill.textContent = `High Alert (${data.active_complaints} Active Complains)`;
      alertPill.className = 'text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300';
    } else if (data.active_complaints >= 2) {
      alertPill.textContent = `Medium Alert (${data.active_complaints} Active Complains)`;
      alertPill.className = 'text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300';
    } else if (data.active_complaints === 1) {
      alertPill.textContent = `Low Alert (1 Active Complain)`;
      alertPill.className = 'text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300';
    } else {
      alertPill.textContent = 'Pristine Clean (0 Active Complains)';
      alertPill.className = 'text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300';
    }

    // Render assigned collectors
    const collectorsContainer = document.getElementById('area-collectors-list');
    if (data.collectors.length === 0) {
      collectorsContainer.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No collector assigned yet.</div>`;
    } else {
      collectorsContainer.innerHTML = data.collectors.map(col => `
        <div class="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              <i class="fa-solid fa-truck-pickup"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-800">${col.name}</div>
              <div class="text-[10px] text-slate-400 font-mono">${col.unique_id} &bull; ${col.gender}</div>
            </div>
          </div>
          <a href="tel:${col.phone}" class="px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1 shadow-sm">
            <i class="fa-solid fa-phone text-emerald-600 text-[10px]"></i> Call
          </a>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("Failed to load area details:", err);
  }
}

// Notifications Handling
async function fetchUserNotifications() {
  if (!state.currentUser || state.currentRole !== 'user') return;
  try {
    const res = await fetch(`/api/user/notifications?user_id=${state.currentUser.id}`);
    const data = await res.json();
    if (!data.success) return;

    const notifs = data.notifications;
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notification-list');

    const unreadCount = notifs.filter(n => !n.is_read).length;
    if (unreadCount > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    if (notifs.length === 0) {
      list.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No notifications yet.</div>`;
      return;
    }

    list.innerHTML = notifs.map(n => `
      <div class="p-4 hover:bg-slate-50 transition ${n.is_read ? 'opacity-70' : 'bg-emerald-50/40'}">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <div class="flex-1">
            <div class="text-xs font-extrabold text-slate-800">${n.title}</div>
            <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">${n.message}</p>
            ${n.proof_image ? `
              <img src="${n.proof_image}" class="w-24 h-16 rounded-lg object-cover mt-2 border border-slate-200 shadow-sm" alt="Resolution Proof">
            ` : ''}
            <div class="text-[10px] text-slate-400 mt-1">${new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
  }
}

function toggleNotificationDropdown() {
  const dd = document.getElementById('notification-dropdown');
  dd.classList.toggle('hidden');
}

async function markAllNotificationsRead() {
  try {
    await fetch('/api/user/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: state.currentUser.id })
    });
    document.getElementById('notif-badge').classList.add('hidden');
    fetchUserNotifications();
  } catch (err) {
    console.error("Failed to mark notifications read:", err);
  }
}

// ================= 2. WASTE COLLECTOR PORTAL LOGIC =================

function showCollectorTab(tabId) {
  const tabs = ['dashboard', 'progress', 'profile'];
  tabs.forEach(t => {
    const el = document.getElementById(`collector-section-${t}`);
    if (el) el.classList.toggle('hidden', t !== tabId);
  });

  if (tabId === 'dashboard' || tabId === 'progress') {
    loadCollectorData();
  } else if (tabId === 'profile') {
    loadCollectorProfile();
  }
}

async function loadCollectorData() {
  try {
    const res = await fetch(`/api/collector/dashboard?collector_id=${state.currentUser.id}`);
    const data = await res.json();
    if (!data.success) return;

    const stats = data.stats;
    const col = data.collector;

    // Update Dashboard KPIs
    document.getElementById('collector-pending-count').textContent = stats.pending_complaints;
    document.getElementById('collector-resolved-count').textContent = stats.resolved_complaints;
    document.getElementById('collector-total-count').textContent = stats.total_complaints;

    // Update Progress Bar
    const progressPct = stats.progress_percentage;
    document.getElementById('collector-progress-pct-display').textContent = `${progressPct}%`;
    document.getElementById('collector-progress-bar').style.width = `${progressPct}%`;

    // Reward eligibility banner
    const rewardBanner = document.getElementById('collector-reward-eligibility-banner');
    if (stats.already_claimed_today) {
      rewardBanner.className = 'p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800';
      rewardBanner.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
          <span><strong>Daily Goal Achieved!</strong> You earned +1 Digital Coin today for exceeding 70% progress. Total coins: <strong>${stats.coins}</strong></span>
        </div>
        <span class="font-bold text-emerald-700">Claimed Today</span>
      `;
    } else if (stats.eligible_for_daily_coin) {
      rewardBanner.className = 'p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800';
      rewardBanner.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-gift text-amber-600 text-base"></i>
          <span><strong>Threshold Met (${progressPct}%)!</strong> Claim your daily reward coin now.</span>
        </div>
        <button onclick="claimCollectorDailyReward()" class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow transition">
          Claim +1 Coin
        </button>
      `;
    } else {
      rewardBanner.className = 'p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600';
      rewardBanner.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-bullseye text-blue-600 text-base"></i>
          <span>Reach <strong>70% resolution</strong> in your area today to unlock your <strong>+1 Digital Coin</strong> reward. (Currently at ${progressPct}%)</span>
        </div>
      `;
    }

    // Render Complaints List with Resolve action
    renderCollectorComplaints(data.complaints);
  } catch (err) {
    console.error("Failed to load collector data:", err);
  }
}

function renderCollectorComplaints(complaints) {
  const container = document.getElementById('collector-complaints-list');
  const badge = document.getElementById('collector-tasks-badge');
  badge.textContent = `${complaints.length} Assigned Tasks`;

  if (complaints.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">No complaints currently assigned in your sector.</div>`;
    return;
  }

  container.innerHTML = complaints.map(c => {
    const isResolved = c.status === 'Resolved';

    return `
      <div class="p-5 rounded-2xl border ${isResolved ? 'border-slate-200 bg-slate-50/50' : 'border-amber-200 bg-amber-50/20 shadow-sm'} transition space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full ${isResolved ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}"></span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-sm font-extrabold text-slate-800">${c.tracking_id}</span>
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">${c.area}</span>
              </div>
              <div class="text-[11px] text-slate-500">Citizen: <strong>${c.user_name}</strong> (${c.user_phone})</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-xl text-xs font-bold ${
              isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }">${c.status}</span>
            ${!isResolved ? `
              <button onclick="openResolveModal(${c.id}, '${c.tracking_id}', '${escapeQuotes(c.description)}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5">
                <i class="fa-solid fa-camera"></i> Verify & Resolve
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Description and Photos Comparison -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <!-- Citizen Reported Photo -->
          <div class="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
            <span class="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <i class="fa-solid fa-triangle-exclamation text-amber-600"></i> Reported Waste Issue:
            </span>
            <p class="text-xs text-slate-700 line-clamp-2">${c.description}</p>
            <img src="${c.complaint_image || SAMPLE_IMAGES.waste1}" class="w-full h-32 rounded-lg object-cover border border-slate-200" alt="Issue Photo">
          </div>

          <!-- Resolution Proof Picture (Required) -->
          <div class="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
            <span class="text-[11px] font-bold ${isResolved ? 'text-emerald-700' : 'text-slate-400'} flex items-center gap-1">
              <i class="fa-solid fa-circle-check ${isResolved ? 'text-emerald-600' : 'text-slate-300'}"></i> Cleared Place Verification:
            </span>
            ${isResolved ? `
              <p class="text-xs text-slate-700 line-clamp-2">${c.resolution_notes || 'Cleaned and sanitized.'}</p>
              <img src="${c.resolution_image || SAMPLE_IMAGES.clean1}" class="w-full h-32 rounded-lg object-cover border border-emerald-300" alt="Cleared Proof Photo">
            ` : `
              <div class="h-32 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-3 text-slate-400">
                <span class="text-xs font-semibold">Verification Photo Required</span>
                <span class="text-[10px] mt-1">Upload proof when resolving this task.</span>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Modal: Resolve Complaint
function openResolveModal(id, trackingId, description) {
  document.getElementById('resolve-complaint-id').value = id;
  document.getElementById('resolve-modal-tracking-id').textContent = trackingId;
  document.getElementById('resolve-modal-desc').textContent = description;
  clearImagePreview('resolve-image-preview', 'resolve-preview-container');
  document.getElementById('modal-resolve-complaint').classList.remove('hidden');
}

function closeResolveModal() {
  document.getElementById('modal-resolve-complaint').classList.add('hidden');
}

async function handleResolveSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('resolve-complaint-id').value;
  const image = document.getElementById('resolve-image-preview').src;
  const notes = document.getElementById('resolve-notes').value.trim();

  // Mandatory verification image check
  if (!image || image.endsWith('index.html')) {
    showToast('A verification picture of the cleared place is mandatory!', 'error');
    return;
  }

  const btn = document.getElementById('btn-submit-resolve');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Verifying...';

  try {
    const res = await fetch(`/api/collector/complaints/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collector_id: state.currentUser.id,
        resolution_image: image,
        notes: notes || 'Site completely cleared and sanitized.'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Task marked as Resolved! Citizen notified with verification proof.', 'success');
      if (data.coin_rewarded) {
        showToast('🎉 Goal Reached: +1 Digital Coin awarded for >= 70% daily resolution!', 'success');
      }
      closeResolveModal();
      loadCollectorData();
      renderHeaderAuth();
    } else {
      showToast(data.message || 'Failed to resolve complaint', 'error');
    }
  } catch (err) {
    showToast('Server error while resolving complaint', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check-double mr-1"></i> Verify & Mark Resolved';
  }
}

// Collector Profile & Rewards
async function loadCollectorProfile() {
  try {
    const res = await fetch(`/api/collector/dashboard?collector_id=${state.currentUser.id}`);
    const data = await res.json();
    if (!data.success) return;

    const col = data.collector;
    const stats = data.stats;

    document.getElementById('collector-profile-id').textContent = col.unique_id;
    document.getElementById('collector-profile-name').textContent = col.name;
    document.getElementById('collector-profile-area').textContent = col.assigned_area;
    document.getElementById('collector-profile-gender').textContent = col.gender;
    document.getElementById('collector-profile-phone').textContent = col.phone;
    document.getElementById('collector-profile-email').textContent = col.email;

    document.getElementById('collector-coins-balance').textContent = stats.coins;
    document.getElementById('collector-cash-value').textContent = `$${stats.cash_value_usd}.00 USD`;
  } catch (err) {
    console.error("Failed to load collector profile:", err);
  }
}

async function claimCollectorDailyReward() {
  try {
    const res = await fetch('/api/collector/claim-daily-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collector_id: state.currentUser.id })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadCollectorData();
      renderHeaderAuth();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to claim reward', 'error');
  }
}

function openCashOutModal() {
  const coins = parseInt(document.getElementById('collector-coins-balance').textContent) || 0;
  if (coins <= 0) {
    showToast('You do not have any coins to convert yet.', 'error');
    return;
  }
  document.getElementById('modal-cashout-coins').textContent = coins;
  document.getElementById('modal-cashout-usd').textContent = `$${coins * 10}.00 USD`;
  const amtInput = document.getElementById('cashout-amount');
  amtInput.max = coins;
  amtInput.value = coins;
  document.getElementById('modal-cashout').classList.remove('hidden');
}

function closeCashOutModal() {
  document.getElementById('modal-cashout').classList.add('hidden');
}

async function handleCashOutSubmit(e) {
  e.preventDefault();
  const coinsToConvert = parseInt(document.getElementById('cashout-amount').value);

  try {
    const res = await fetch('/api/collector/convert-coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collector_id: state.currentUser.id,
        coins: coinsToConvert
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeCashOutModal();
      loadCollectorProfile();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Payout conversion request failed', 'error');
  }
}

// ================= 3. ADMIN PORTAL LOGIC =================

function showAdminTab(tabId) {
  const tabs = ['dashboard', 'alerts', 'loggers', 'employees'];
  tabs.forEach(t => {
    const el = document.getElementById(`admin-section-${t}`);
    if (el) el.classList.toggle('hidden', t !== tabId);
  });

  if (tabId === 'dashboard') loadAdminDashboard();
  else if (tabId === 'alerts') loadAdminWasteAlerts();
  else if (tabId === 'loggers') loadAdminUserLogger();
  else if (tabId === 'employees') loadAdminCollectorsLogger();
}

async function loadAdminDashboard() {
  try {
    const res = await fetch('/api/admin/dashboard');
    const data = await res.json();
    if (!data.success) return;

    const stats = data.stats;
    // Required 4 counters: Users, Complains, Collector, Resolve complains
    document.getElementById('admin-stat-users').textContent = stats.total_users;
    document.getElementById('admin-stat-complaints').textContent = stats.total_complaints;
    document.getElementById('admin-stat-collectors').textContent = stats.total_collectors;
    document.getElementById('admin-stat-resolved').textContent = stats.total_resolved;
  } catch (err) {
    console.error("Failed to load admin dashboard:", err);
  }
}

// Waste Area Alert System (4 Color Categories)
async function loadAdminWasteAlerts() {
  try {
    const res = await fetch('/api/admin/waste-area-alerts');
    const data = await res.json();
    if (!data.success) return;

    state.wasteAlertData = data;

    // Update Counts on Color Buttons
    document.getElementById('badge-count-high').textContent = data.summary.high_count;
    document.getElementById('badge-count-medium').textContent = data.summary.medium_count;
    document.getElementById('badge-count-low').textContent = data.summary.low_count;
    document.getElementById('badge-count-clear').textContent = data.summary.clear_count;

    renderWasteAlertCards(state.activeAlertFilter);
  } catch (err) {
    console.error("Failed to load waste alerts:", err);
  }
}

// Requirement: "color buttons should be interactable which shows the name of areas based on complain reported by user"
function filterWasteAlerts(category) {
  state.activeAlertFilter = category;

  // Update button active styles
  const btnIds = ['high', 'medium', 'low', 'clear', 'all'];
  btnIds.forEach(id => {
    const btn = document.getElementById(`filter-btn-${id}`);
    if (btn) {
      if (id === category) {
        btn.classList.add('active', 'ring-2', 'ring-offset-2', 'ring-slate-400');
      } else {
        btn.classList.remove('active', 'ring-2', 'ring-offset-2', 'ring-slate-400');
      }
    }
  });

  renderWasteAlertCards(category);
}

function renderWasteAlertCards(filter) {
  const container = document.getElementById('waste-alert-areas-container');
  if (!state.wasteAlertData) return;

  let areasToDisplay = [];
  const cats = state.wasteAlertData.categories;

  if (filter === 'all') {
    areasToDisplay = [
      ...cats.high,
      ...cats.medium,
      ...cats.low,
      ...cats.clear
    ];
  } else if (cats[filter]) {
    areasToDisplay = cats[filter];
  }

  if (areasToDisplay.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
        <i class="fa-solid fa-check-circle text-3xl mb-2 text-emerald-500"></i>
        <h4 class="text-base font-bold text-slate-700">No Areas in this Alert Category</h4>
        <p class="text-xs">Select another category button above to view areas.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = areasToDisplay.map(area => {
    let cardBorder = 'border-slate-200';
    let badgeBg = 'bg-slate-100 text-slate-700';
    let iconClass = 'fa-circle-info text-slate-500';

    if (area.category === 'High') {
      cardBorder = 'border-rose-300 bg-rose-50/20';
      badgeBg = 'bg-rose-600 text-white shadow-sm shadow-rose-600/30';
      iconClass = 'fa-triangle-exclamation text-rose-600';
    } else if (area.category === 'Medium') {
      cardBorder = 'border-orange-300 bg-orange-50/20';
      badgeBg = 'bg-orange-500 text-white shadow-sm shadow-orange-500/30';
      iconClass = 'fa-circle-exclamation text-orange-600';
    } else if (area.category === 'Low') {
      cardBorder = 'border-yellow-300 bg-yellow-50/20';
      badgeBg = 'bg-yellow-400 text-slate-900 shadow-sm';
      iconClass = 'fa-bell text-yellow-600';
    } else if (area.category === 'Clear') {
      cardBorder = 'border-emerald-300 bg-emerald-50/20';
      badgeBg = 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30';
      iconClass = 'fa-circle-check text-emerald-600';
    }

    const collectorNames = area.collectors.length > 0 
      ? area.collectors.map(c => `<strong>${c.name}</strong> (${c.phone})`).join(', ') 
      : 'Unassigned';

    return `
      <div class="bg-white rounded-3xl p-6 border ${cardBorder} shadow-sm space-y-4 hover:shadow-md transition">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <i class="fa-solid ${iconClass} text-xl"></i>
            <h3 class="text-lg font-extrabold text-slate-800">${area.name}</h3>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${badgeBg}">
            ${area.category} (${area.active_complaints})
          </span>
        </div>

        <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
          <div><span class="text-slate-400 font-semibold">Active Unresolved Complains:</span> <strong class="text-slate-800 text-sm font-black">${area.active_complaints}</strong></div>
          <div><span class="text-slate-400 font-semibold">Total Reports Ever:</span> <strong class="text-slate-700">${area.total_complaints}</strong></div>
          <div><span class="text-slate-400 font-semibold">Designated Dumping Points:</span> <p class="text-slate-600 italic mt-0.5">${area.dumping_spots}</p></div>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span class="text-slate-400 block text-[10px]">Assigned Waste Collector:</span>
            <span class="text-slate-700 font-medium text-xs">${collectorNames}</span>
          </div>
          <button onclick="dispatchAlertCheck('${area.name}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition text-xs">
            Inspect Ward
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function dispatchAlertCheck(areaName) {
  showToast(`Sanitation inspector alert dispatched to ${areaName} ward`, 'info');
}

// Admin Users Logger Table
async function loadAdminUserLogger() {
  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    if (!data.success) return;

    state.userLoggerData = data.users;
    renderUserLoggerTable(state.userLoggerData);
  } catch (err) {
    console.error("Failed to load user logger:", err);
  }
}

function renderUserLoggerTable(users) {
  const tbody = document.getElementById('user-logger-tbody');
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-400">No users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    let badgeClass = 'bg-slate-100 text-slate-600';
    if (u.badge === 'Gold') badgeClass = 'badge-gold font-bold';
    else if (u.badge === 'Silver') badgeClass = 'badge-silver font-bold';
    else if (u.badge === 'Bronze') badgeClass = 'badge-bronze font-bold';

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4 font-mono font-bold text-emerald-700">${u.unique_id}</td>
        <td class="py-3 px-4 font-bold text-slate-800">${u.name}</td>
        <td class="py-3 px-4 text-slate-600">${u.age || '-'} / ${u.gender || '-'}</td>
        <td class="py-3 px-4 font-medium text-slate-700">${u.area}</td>
        <td class="py-3 px-4 text-slate-600 font-mono">${u.email || '-'}</td>
        <td class="py-3 px-4 text-slate-600 font-mono">${u.phone}</td>
        <td class="py-3 px-4 text-center font-bold text-slate-800">${u.total_complaints || 0}</td>
        <td class="py-3 px-4 text-center">
          <span class="px-2.5 py-0.5 rounded-full text-[11px] ${badgeClass}">${u.badge}</span>
        </td>
      </tr>
    `;
  }).join('');
}

function filterUserLoggerTable() {
  const query = document.getElementById('user-logger-search').value.toLowerCase().trim();
  const filtered = state.userLoggerData.filter(u => 
    u.name.toLowerCase().includes(query) ||
    u.unique_id.toLowerCase().includes(query) ||
    u.area.toLowerCase().includes(query) ||
    (u.email && u.email.toLowerCase().includes(query)) ||
    u.phone.includes(query)
  );
  renderUserLoggerTable(filtered);
}

// Admin Collectors Logger Table
async function loadAdminCollectorsLogger() {
  try {
    const res = await fetch('/api/admin/collectors');
    const data = await res.json();
    if (!data.success) return;

    state.collectorLoggerData = data.collectors;
    renderCollectorLoggerTable(state.collectorLoggerData);
  } catch (err) {
    console.error("Failed to load collector logger:", err);
  }
}

function renderCollectorLoggerTable(collectors) {
  const tbody = document.getElementById('collector-logger-tbody');
  if (collectors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="py-8 text-center text-slate-400">No collectors found.</td></tr>`;
    return;
  }

  tbody.innerHTML = collectors.map(col => {
    const perfRate = col.performance_rate || 0;
    const perfColor = perfRate >= 70 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold';

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4 font-mono font-bold text-blue-700">${col.unique_id}</td>
        <td class="py-3 px-4 font-bold text-slate-800">${col.name}</td>
        <td class="py-3 px-4 text-slate-600">${col.gender}</td>
        <td class="py-3 px-4 font-bold text-emerald-800">${col.assigned_area}</td>
        <td class="py-3 px-4 text-slate-600 font-mono">${col.phone}</td>
        <td class="py-3 px-4 text-slate-600 font-mono">${col.email}</td>
        <td class="py-3 px-4 text-center font-bold text-slate-700">${col.assigned_tasks || 0}</td>
        <td class="py-3 px-4 text-center font-bold text-emerald-700">${col.resolved_tasks || 0}</td>
        <td class="py-3 px-4 text-center font-bold text-amber-600">
          <i class="fa-solid fa-coins text-amber-500 mr-0.5"></i> ${col.coins || 0}
        </td>
        <td class="py-3 px-4 text-center ${perfColor}">${perfRate}%</td>
      </tr>
    `;
  }).join('');
}

function filterCollectorLoggerTable() {
  const query = document.getElementById('collector-logger-search').value.toLowerCase().trim();
  const filtered = state.collectorLoggerData.filter(col => 
    col.name.toLowerCase().includes(query) ||
    col.unique_id.toLowerCase().includes(query) ||
    col.assigned_area.toLowerCase().includes(query) ||
    col.email.toLowerCase().includes(query) ||
    col.phone.includes(query)
  );
  renderCollectorLoggerTable(filtered);
}

// ================= AUTHENTICATION MODAL & LOGOUT =================

let authCurrentRole = 'user';
let authMode = 'login'; // 'login' | 'register'

function openAuthModal(mode = 'login') {
  authMode = mode;
  toggleAuthMode(mode);
  document.getElementById('modal-auth').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('modal-auth').classList.add('hidden');
}

function setAuthRole(role) {
  authCurrentRole = role;
  ['user', 'collector', 'admin'].forEach(r => {
    const btn = document.getElementById(`auth-tab-${r}`);
    if (r === role) {
      btn.className = 'flex-1 py-1.5 text-xs font-bold rounded-lg bg-white shadow-sm text-emerald-800 transition';
    } else {
      btn.className = 'flex-1 py-1.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition';
    }
  });

  // Admin cannot self-register through portal
  const toggleContainer = document.getElementById('auth-toggle-container');
  if (role === 'admin') {
    toggleAuthMode('login');
    toggleContainer.classList.add('hidden');
  } else {
    toggleContainer.classList.remove('hidden');
  }

  // Adjust registration area label & fields
  const areaLabel = document.getElementById('reg-area-label');
  const ageContainer = document.getElementById('reg-age-container');
  if (role === 'collector') {
    areaLabel.textContent = 'Assigned Area *';
    ageContainer.classList.add('hidden');
  } else {
    areaLabel.textContent = 'Area *';
    ageContainer.classList.remove('hidden');
  }
}

function toggleAuthMode(mode) {
  authMode = mode;
  const loginForm = document.getElementById('form-login');
  const regForm = document.getElementById('form-register');
  const title = document.getElementById('auth-modal-title');

  if (mode === 'register') {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    title.textContent = `Register as ${authCurrentRole.toUpperCase()}`;
  } else {
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    title.textContent = 'Sign In to CleanPulse';
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const identifier = document.getElementById('login-identifier').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, role: authCurrentRole })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      state.currentUser = data.user;
      state.currentRole = data.role;
      state.currentTab = ROLE_TABS[data.role][0].id;
      saveSession();
      closeAuthModal();
      switchRoleView(state.currentRole, state.currentTab);
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showToast('Network error during login', 'error');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const isUser = authCurrentRole === 'user';
  const endpoint = isUser ? '/api/auth/register-user' : '/api/auth/register-collector';

  const payload = {
    name: document.getElementById('reg-name').value.trim(),
    gender: document.getElementById('reg-gender').value,
    email: document.getElementById('reg-email').value.trim(),
    phone: document.getElementById('reg-phone').value.trim(),
    password: document.getElementById('reg-password').value.trim()
  };

  if (isUser) {
    payload.age = document.getElementById('reg-age').value;
    payload.area = document.getElementById('reg-area').value;
  } else {
    payload.assigned_area = document.getElementById('reg-area').value;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(`${data.message} ID: ${data.user.unique_id}`, 'success');
      state.currentUser = data.user;
      state.currentRole = data.user.role;
      state.currentTab = ROLE_TABS[data.user.role][0].id;
      saveSession();
      closeAuthModal();
      switchRoleView(state.currentRole, state.currentTab);
    } else {
      showToast(data.message || 'Registration failed', 'error');
    }
  } catch (err) {
    showToast('Network error during registration', 'error');
  }
}

function handleLogout() {
  localStorage.removeItem('cleanpulse_auth');
  state.currentUser = null;
  showToast('You have been signed out.', 'info');
  // Default to User login prompt
  openAuthModal('login');
  renderHeaderAuth();
}

// ================= IMAGE UPLOAD & PREVIEW HELPERS =================

function handleImageUpload(e, previewImgId) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const imgEl = document.getElementById(previewImgId);
    imgEl.src = event.target.result;
    if (previewImgId === 'complaint-image-preview') {
      document.getElementById('complaint-preview-container').classList.remove('hidden');
    } else if (previewImgId === 'resolve-image-preview') {
      document.getElementById('resolve-preview-container').classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
}

function selectSampleImage(key) {
  const url = SAMPLE_IMAGES[key];
  if (!url) return;
  const imgEl = document.getElementById('complaint-image-preview');
  imgEl.src = url;
  document.getElementById('complaint-preview-container').classList.remove('hidden');
}

function selectSampleCleanImage(key) {
  const url = SAMPLE_IMAGES[key];
  if (!url) return;
  const imgEl = document.getElementById('resolve-image-preview');
  imgEl.src = url;
  document.getElementById('resolve-preview-container').classList.remove('hidden');
}

function clearImagePreview(imgId, containerId) {
  const imgEl = document.getElementById(imgId);
  if (imgEl) imgEl.src = '';
  const container = document.getElementById(containerId);
  if (container) container.classList.add('hidden');
}

// ================= TOAST NOTIFICATION UTILITY =================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');

  const icons = {
    success: 'fa-solid fa-circle-check text-emerald-400',
    error: 'fa-solid fa-circle-exclamation text-rose-400',
    info: 'fa-solid fa-circle-info text-blue-400'
  };

  const bgStyles = {
    success: 'bg-slate-900 text-white border-slate-700',
    error: 'bg-slate-900 text-white border-slate-700',
    info: 'bg-slate-900 text-white border-slate-700'
  };

  toast.className = `p-4 rounded-2xl shadow-2xl border text-xs flex items-center gap-3 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto max-w-sm ${bgStyles[type]}`;
  toast.innerHTML = `
    <i class="${icons[type]} text-base"></i>
    <div class="flex-1 font-semibold leading-relaxed">${message}</div>
  `;

  container.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeQuotes(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
