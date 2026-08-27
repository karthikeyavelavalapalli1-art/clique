document.addEventListener('DOMContentLoaded', () => {
  const notLoggedInView = document.getElementById('not-logged-in-view');
  const dashboardView = document.getElementById('dashboard-view');
  const btnLogout = document.getElementById('btn-logout');

  // Profile Elements
  const profileAvatar = document.getElementById('profile-avatar');
  const profileEmail = document.getElementById('profile-email');
  const profileRole = document.getElementById('profile-role');
  
  const profileForm = document.getElementById('profile-form');
  const profileNameInput = document.getElementById('profile-name');
  const profileUsernameInput = document.getElementById('profile-username');
  const profileYearInput = document.getElementById('profile-year');
  const profilePicFileInput = document.getElementById('profile-pic-file');

  // History & Winners Elements
  const historyTableBody = document.getElementById('history-table-body');
  const winnersList = document.getElementById('winners-list');

  let currentUserEmail = null;

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

  function initRsvpModal() {
    const modal = document.getElementById('rsvp-modal');
    const modalClose = document.getElementById('modal-close');
    const openModalBtns = document.querySelectorAll('.open-modal-btn');
    const rsvpForm = document.getElementById('rsvp-form');
    const modalSuccess = document.getElementById('modal-success');
    const btnCloseSuccess = document.getElementById('btn-close-success');

    const openRsvp = (e) => {
      if (e) e.preventDefault();
      
      const profileName = document.getElementById('profile-name')?.value;
      const profileRoll = document.getElementById('profile-roll-number')?.value;
      const profileContact = document.getElementById('profile-contact-no')?.value;
      const profileYear = document.getElementById('profile-year')?.value;

      if (!profileRoll || !profileContact) {
        showToast('Please complete and save your Profile Settings (Roll Number & Contact) before RSVPing.', true);
        return;
      }

      const nameInput = document.getElementById('full-name');
      const emailInput = document.getElementById('email-input');
      const rollInput = document.getElementById('roll-input');
      const contactInput = document.getElementById('contact-input');

      if (nameInput) nameInput.value = profileName;
      if (emailInput) emailInput.value = currentUserEmail;
      if (rollInput) rollInput.value = profileRoll;
      if (contactInput) contactInput.value = profileContact;

      modal?.classList.add('open');
    };

    openModalBtns.forEach(btn => {
      btn.addEventListener('click', openRsvp);
    });

    const closeModal = () => {
      modal?.classList.remove('open');
      setTimeout(() => {
        rsvpForm?.classList.remove('hidden');
        modalSuccess?.classList.add('hidden');
      }, 300);
    };

    modalClose?.addEventListener('click', closeModal);
    btnCloseSuccess?.addEventListener('click', closeModal);

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    rsvpForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('full-name').value.trim();
      const email = document.getElementById('email-input').value.trim();
      const studentId = document.getElementById('roll-input').value.trim();
      const phone = document.getElementById('contact-input').value.trim();
      
      const profileYear = document.getElementById('profile-year')?.value || 'N/A';

      const rsvpData = {
        name,
        studentId,
        course: 'EEE',
        section: 'N/A',
        year: profileYear,
        college: 'N/A',
        phone,
        email
      };

      try {
        const response = await fetch('/api/rsvps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rsvpData)
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to save RSVP');
        }

        rsvpForm.classList.add('hidden');
        modalSuccess.classList.remove('hidden');

        if (currentUserEmail) {
          fetchHistory(currentUserEmail);
        }

        showToast(`RSVP Confirmed for ${name}! See you Saturday.`);
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Error saving RSVP. Check connection.', true);
      }
    });
  }

  initRsvpModal();

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

  // Check LocalStorage on load
  const localUser = JSON.parse(localStorage.getItem('clique_student_user'));
  if (localUser && localUser.email) {
    loadDashboard(localUser.email);
  }

  window.handleStudentDashboardLogin = async function(response) {
    if (!response || !response.credential) return;
    
    function parseJwt(token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    }
    
    const payload = parseJwt(response.credential);
    const userObj = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      year: '1st Year Junior (Mandatory)',
      provider: 'Google OAuth SDK'
    };

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userObj)
      });
      if (res.ok) {
        localStorage.setItem('clique_student_user', JSON.stringify(userObj));
        loadDashboard(userObj.email);
        showToast('Successfully signed in!');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Login failed', true);
      }
    } catch (err) {
      showToast('Error syncing with server.', true);
    }
  };

  btnLogout?.addEventListener('click', () => {
    localStorage.removeItem('clique_student_user');
    currentUserEmail = null;
    dashboardView.classList.add('hidden');
    notLoggedInView.classList.remove('hidden');
    showToast('Signed out successfully.');
  });

  async function loadDashboard(email) {
    const profileOk = await fetchProfile(email);
    if (!profileOk) return;

    currentUserEmail = email;
    notLoggedInView.classList.add('hidden');
    dashboardView.classList.remove('hidden');

    await fetchHistory(email);
    await fetchWinners();
  }

  async function fetchProfile(email) {
    try {
      const res = await fetch(`/api/user/profile/${email}`);
      if (res.ok) {
        const data = await res.json();
        
        if (data.is_banned) {
          localStorage.removeItem('clique_student_user');
          currentUserEmail = null;
          dashboardView.classList.add('hidden');
          notLoggedInView.classList.remove('hidden');
          showToast('Your account has been banned from the portal.', true);
          return false;
        }

        profileEmail.textContent = data.email;
        profileRole.textContent = data.role.toUpperCase();
        
        profileNameInput.value = data.name || '';
        profileUsernameInput.value = data.username || '';
        const profileRollNumberInput = document.getElementById('profile-roll-number');
        if (profileRollNumberInput) profileRollNumberInput.value = data.roll_number || '';
        const profileContactNoInput = document.getElementById('profile-contact-no');
        if (profileContactNoInput) profileContactNoInput.value = data.contact_no || '';
        if (data.year) profileYearInput.value = data.year;


        if (data.picture) {
          profileAvatar.innerHTML = `<img src="${data.picture}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
          profileAvatar.innerHTML = `<i class="fa-solid fa-user"></i>`;
        }
        return true;
      }
    } catch(err) {
      console.error('Error fetching profile', err);
    }
    return true;
  }

  profileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserEmail) return;

    const name = profileNameInput.value;
    const username = profileUsernameInput.value;
    const rollNumber = document.getElementById('profile-roll-number')?.value || '';
    const contactNo = document.getElementById('profile-contact-no')?.value || '';
    const year = profileYearInput.value;
    let picture = null;
    if (profilePicFileInput.files.length > 0) {
      const file = profilePicFileInput.files[0];
      const reader = new FileReader();
      picture = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUserEmail, name, username, rollNumber, contactNo, year, picture })
      });
      if (res.ok) {
        showToast('Profile updated successfully!');
        fetchProfile(currentUserEmail); // refresh avatar
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update profile', true);
      }
    } catch(err) {
      showToast('Error updating profile', true);
    }
  });

  async function fetchHistory(email) {
    try {
      const res = await fetch(`/api/user/history/${email}`);
      if (res.ok) {
        const history = await res.json();
        historyTableBody.innerHTML = '';
        
        if (history.length === 0) {
          historyTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">No RSVPs found. Time to attend an event!</td></tr>';
          return;
        }

        history.forEach((item, idx) => {
          const tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid var(--border-color)';
          tr.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
          
          const dateStr = new Date(item.timestamp).toLocaleString();
          const badgeColor = item.year.includes('1st') ? 'var(--accent-cyan)' : 'var(--accent-pink)';

          tr.innerHTML = `
            <td style="padding: 1rem; color: var(--text-secondary);">${dateStr}</td>
            <td style="padding: 1rem; font-weight: 600; color: var(--text-primary);">${item.name}</td>
            <td style="padding: 1rem;"><span style="font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); background: rgba(255,255,255,0.08); color: ${badgeColor}; font-weight: 600;">${item.year}</span></td>
            <td style="padding: 1rem; color: var(--text-secondary);">${item.section || 'General'}</td>
          `;
          historyTableBody.appendChild(tr);
        });
      }
    } catch(err) {
      console.error('Error fetching history', err);
    }
  }

  async function fetchWinners() {
    try {
      const res = await fetch('/api/config/winners');
      if (res.ok) {
        const winners = await res.json();
        winnersList.innerHTML = '';
        
        if (winners.length === 0) {
          winnersList.innerHTML = '<div style="color: var(--text-muted); font-style: italic; font-size: 0.9rem;">No winners announced yet. Check back later!</div>';
          return;
        }

        winners.forEach(w => {
          const div = document.createElement('div');
          div.style.background = 'rgba(255,255,255,0.05)';
          div.style.padding = '0.85rem 1rem';
          div.style.borderRadius = 'var(--radius-sm)';
          div.style.border = '1px solid rgba(250, 204, 21, 0.2)';
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.gap = '0.75rem';
          
          div.innerHTML = `
            <i class="fa-solid fa-medal" style="color: #facc15; font-size: 1.2rem;"></i>
            <span style="font-weight: 600; color: var(--text-primary);">${w}</span>
          `;
          winnersList.appendChild(div);
        });
      }
    } catch(err) {
      console.error('Error fetching winners', err);
    }
  }

});
