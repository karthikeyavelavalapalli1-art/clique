document.addEventListener('DOMContentLoaded', () => {
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminLoginError = document.getElementById('admin-login-error');
  const adminLoginView = document.getElementById('admin-login-view');
  const adminDashboardView = document.getElementById('admin-dashboard-view');
  const btnAdminLogout = document.getElementById('btn-admin-logout');

  // Profile Badges
  const adminProfileBadge = document.getElementById('admin-profile-badge');
  const adminAvatar = document.getElementById('admin-avatar');
  const adminDisplayName = document.getElementById('admin-display-name');

  // Tabs
  const sidebarBtns = document.querySelectorAll('.sidebar-btn');
  const adminTabs = document.querySelectorAll('.admin-tab');

  // RSVPs
  const adminSearchInput = document.getElementById('admin-search-input');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnClearAllRsvp = document.getElementById('btn-clear-all-rsvp');
  const adminTableBody = document.getElementById('admin-table-body');
  let currentAdminData = [];

  // Users
  const usersTableBody = document.getElementById('users-table-body');

  // Config
  const eventConfigForm = document.getElementById('event-config-form');

  // Fetch Config for Google Sign In
  fetch('/api/config')
    .then(res => res.json())
    .then(data => {
      if (data.googleClientId) {
        const meta = document.createElement('meta');
        meta.name = 'google-signin-client_id';
        meta.content = data.googleClientId;
        document.head.appendChild(meta);
        
        const gIdOnload = document.getElementById('g_id_onload');
        if(gIdOnload) gIdOnload.setAttribute('data-client_id', data.googleClientId);
      }
    });

  // Theme support
  const themeToggle = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('clique_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  themeToggle?.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('clique_theme', theme);
  });

  function showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast show';
    if (isError) toast.style.borderLeftColor = '#ef4444';
    toast.innerHTML = `
      <i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}" style="color: ${isError ? '#ef4444' : 'var(--accent-cyan)'}; margin-top: 2px;"></i>
      <div>${message}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('show'), 3000);
    setTimeout(() => toast.remove(), 3300);
  }
  window.showToast = showToast; // Expose for global use

  // Tab Switching
  sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebarBtns.forEach(b => b.classList.remove('active'));
      adminTabs.forEach(t => t.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.remove('hidden');
    });
  });

  // --- Authentication ---
  function loginSuccess(user) {
    adminLoginView.classList.add('hidden');
    adminDashboardView.classList.remove('hidden');
    adminProfileBadge.classList.remove('hidden');
    
    if (user.picture) {
      adminAvatar.innerHTML = `<img src="${user.picture}" style="width:100%; height:100%; object-fit:cover;">`;
    } else {
      adminAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'A';
    }
    adminDisplayName.textContent = user.name || 'Admin';

    renderAdminDashboard();
    renderUsersTable();
    loadEventConfig();
    showToast('Welcome Admin! Access Granted.');
  }

  adminLoginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const adminId = document.getElementById('admin-id-input').value.trim();
    const adminPass = document.getElementById('admin-pass-input').value.trim();

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, adminPass })
      });
      const data = await response.json();
      if (data.success) {
        adminLoginForm.reset();
        adminLoginError?.classList.add('hidden');
        loginSuccess(data.user);
      } else {
        adminLoginError?.classList.remove('hidden');
      }
    } catch (err) {
      showToast('Error connecting to authentication server.', true);
    }
  });

  btnAdminLogout?.addEventListener('click', () => {
    adminDashboardView.classList.add('hidden');
    adminLoginView.classList.remove('hidden');
    adminProfileBadge.classList.add('hidden');
    showToast('Logged out of Admin Portal.');
  });

  // --- RSVP Logic ---
  async function renderAdminDashboard(filterText = '') {
    try {
      const response = await fetch('/api/rsvps');
      if (response.ok) currentAdminData = await response.json();
    } catch (err) {}

    let filtered = currentAdminData;
    if (filterText) {
      filtered = filtered.filter(item => item.name.toLowerCase().includes(filterText.toLowerCase()));
    }

    if (adminTableBody) {
      adminTableBody.innerHTML = '';
      if (filtered.length === 0) {
        adminTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No RSVPs found.</td></tr>';
      }

      filtered.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
        const badgeColor = item.year.includes('1st') ? 'var(--accent-cyan)' : 'var(--accent-pink)';
        
        tr.innerHTML = `
          <td style="padding: 1rem; font-weight: 700; color: var(--text-primary);">${item.name}</td>
          <td style="padding: 1rem;"><span style="font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); background: rgba(255,255,255,0.08); color: ${badgeColor}; font-weight: 600;">${item.year}</span></td>
          <td style="padding: 1rem; color: var(--text-secondary);">${item.course || 'EEE'}</td>
          <td style="padding: 1rem; color: var(--text-secondary);">${item.section || 'General'}</td>
          <td style="padding: 1rem; font-size: 0.8rem; color: var(--text-muted);">${new Date(item.timestamp).toLocaleString()}</td>
        `;
        adminTableBody.appendChild(tr);
      });
    }

    document.getElementById('stat-total-rsvp').textContent = currentAdminData.length;
    document.getElementById('stat-juniors-count').textContent = currentAdminData.filter(i => i.year.includes('1st')).length;
    document.getElementById('stat-seniors-count').textContent = currentAdminData.filter(i => i.year.includes('2nd')).length;
  }

  adminSearchInput?.addEventListener('input', (e) => renderAdminDashboard(e.target.value));

  btnExportCsv?.addEventListener('click', () => {
    if (currentAdminData.length === 0) return showToast('No data to export!', true);
    let csvContent = 'data:text/csv;charset=utf-8,Name,Year,Department,Interest,Timestamp\\n';
    currentAdminData.forEach(row => {
      csvContent += `"${row.name}","${row.year}","${row.course || 'EEE'}","${row.section || ''}","${new Date(row.timestamp).toLocaleString()}"\\n`;
    });
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = 'clique_rsvps.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('CSV Exported Successfully!');
  });

  btnClearAllRsvp?.addEventListener('click', async () => {
    if (confirm('🚨 Are you absolutely sure? This will DELETE all student registrations permanently!')) {
      try {
        const response = await fetch('/api/rsvps', { method: 'DELETE' });
        if (response.ok) {
          showToast('All RSVP data cleared!');
          renderAdminDashboard();
        }
      } catch (err) {
        showToast('Error connecting to server.', true);
      }
    }
  });

  // --- Users Logic ---
  async function renderUsersTable() {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) return;
      const users = await response.json();
      
      usersTableBody.innerHTML = '';
      users.forEach((u, idx) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
        
        const permissions = u.permissions || [];
        const checkedManageUsers = permissions.includes('manage_users') ? 'checked' : '';
        const checkedManageEvents = permissions.includes('manage_events') ? 'checked' : '';
        const isStudent = u.role === 'student' ? 'selected' : '';
        const isAdmin = u.role === 'admin' ? 'selected' : '';

        tr.innerHTML = `
          <td style="padding: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
            ${u.picture ? `<img src="${u.picture}" style="width:24px; height:24px; border-radius:50%;">` : '<i class="fa-solid fa-user"></i>'}
            <div style="display:flex; flex-direction:column;">
              <span style="font-weight:700;">${u.name}</span>
              <span style="font-size:0.75rem; color:var(--text-muted);">${u.email}</span>
              ${u.username ? `<span style="font-size:0.75rem; color:var(--accent-cyan);">@${u.username}</span>` : ''}
            </div>
          </td>
          <td style="padding: 1rem; color: var(--text-secondary); font-family: monospace;">
            ${u.roll_number || '<span style="color:var(--text-muted); font-style:italic;">N/A</span>'}
          </td>
          <td style="padding: 1rem; color: var(--text-secondary); font-family: monospace;">
            ${u.contact_no || '<span style="color:var(--text-muted); font-style:italic;">N/A</span>'}
          </td>
          <td style="padding: 1rem;">
            <select class="role-select" data-email="${u.email}" style="padding: 0.35rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: var(--radius-sm);">
              <option value="student" ${isStudent}>Student</option>
              <option value="admin" ${isAdmin}>Admin</option>
            </select>
          </td>
          <td style="padding: 1rem;">
            <label style="display:block; font-size:0.8rem; color:var(--text-secondary);"><input type="checkbox" class="perm-check" data-email="${u.email}" value="manage_users" ${checkedManageUsers}> Manage Users</label>
            <label style="display:block; font-size:0.8rem; color:var(--text-secondary);"><input type="checkbox" class="perm-check" data-email="${u.email}" value="manage_events" ${checkedManageEvents}> Manage Events</label>
          </td>
          <td style="padding: 1rem;">
            <button class="btn btn-sm ${u.is_banned ? 'btn-outline' : 'btn-outline'} btn-ban-user" style="${u.is_banned ? 'color: #10b981; border-color: #10b981;' : 'color: #ef4444; border-color: #ef4444;'}" data-email="${u.email}" data-banned="${u.is_banned}">${u.is_banned ? 'Unban' : 'Ban'}</button>
          </td>
          <td style="padding: 1rem;">
            <button class="btn btn-sm btn-outline btn-save-user" data-email="${u.email}">Save</button>
          </td>
        `;
        usersTableBody.appendChild(tr);
      });

      // Attach save handlers
      document.querySelectorAll('.btn-save-user').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const email = e.target.dataset.email;
          const roleSelect = document.querySelector(`.role-select[data-email="${email}"]`).value;
          const permChecks = document.querySelectorAll(`.perm-check[data-email="${email}"]:checked`);
          const permissions = Array.from(permChecks).map(c => c.value);

          try {
            const res = await fetch(`/api/admin/users/${email}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: roleSelect, permissions })
            });
            if (res.ok) showToast(`Updated ${email} successfully`);
            else showToast(`Failed to update ${email}`, true);
          } catch(err) {
            showToast('Error updating user', true);
          }
        });
      });

      // Attach ban handlers
      document.querySelectorAll('.btn-ban-user').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const email = e.target.dataset.email;
          const isBanned = e.target.dataset.banned === 'true';
          const newStatus = !isBanned;

          if (!confirm(`Are you sure you want to ${newStatus ? 'BAN' : 'UNBAN'} ${email}?`)) return;

          try {
            const res = await fetch(`/api/admin/users/${email}/ban`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_banned: newStatus })
            });
            if (res.ok) {
              showToast(`User ${email} ${newStatus ? 'banned' : 'unbanned'} successfully`);
              renderUsersTable();
            } else {
              showToast(`Failed to update ban status for ${email}`, true);
            }
          } catch(err) {
            showToast('Error updating ban status', true);
          }
        });
      });

    } catch (err) {
      console.error(err);
    }
  }

  // --- Event Config Logic ---
  async function loadEventConfig() {
    try {
      const res = await fetch('/api/config/event');
      if (res.ok) {
        const config = await res.json();
        document.getElementById('config-date').value = config.date || '';
        document.getElementById('config-time').value = config.time || '';
        document.getElementById('config-venue').value = config.venue || '';
      }
      const wRes = await fetch('/api/config/winners');
      if (wRes.ok) {
        const winners = await wRes.json();
        const winnersStr = Array.isArray(winners) ? winners.join(', ') : '';
        document.getElementById('config-winners').value = winnersStr;
      }
    } catch(err) {}
  }

  eventConfigForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('config-date').value;
    const time = document.getElementById('config-time').value;
    const venue = document.getElementById('config-venue').value;
    
    const winnersStr = document.getElementById('config-winners').value;
    const winners = winnersStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

    try {
      const res1 = await fetch('/api/config/event', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time, venue })
      });
      
      const res2 = await fetch('/api/config/winners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winners })
      });

      if (res1.ok && res2.ok) showToast('Event configuration and Winners saved!');
      else showToast('Failed to save some configurations', true);
    } catch(err) {
      showToast('Error saving config', true);
    }
  });

  window.handleAdminGoogleLogin = async function(response) {
    if (!response || !response.credential) return;
    
    function parseJwt(token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    }
    
    const payload = parseJwt(response.credential);
    
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleEmail: payload.email })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('admin-login-error')?.classList.add('hidden');
        loginSuccess(data.user);
      } else {
        const errDiv = document.getElementById('admin-login-error');
        errDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.error || 'Access Denied. Your account does not have admin privileges.'}`;
        errDiv.classList.remove('hidden');
      }
    } catch (err) {
      showToast('Error connecting to authentication server.', true);
    }
  };

});
