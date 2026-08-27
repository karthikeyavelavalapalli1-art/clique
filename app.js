/**
 * CLIQUE - College Senior-Junior Bonding Event Platform
 * Interactive Script logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initCanvasBg();
  initCountdownTimer();
  initStatsCounter();
  initGalleryFilters();
  initFaqAccordion();
  initThemeToggle();
  initMobileMenu();
  initStudentAuth();
  initHistoryModal();
});

/* ==========================================
   1. Animated Background Canvas (Particles)
   ========================================== */
function initCanvasBg() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 45;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      color: i % 2 === 0 ? 'rgba(139, 92, 246, 0.4)' : 'rgba(6, 182, 212, 0.4)'
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p, index) => {
      p.x += p.dx;
      p.y += p.dy;

      if (p.x < 0 || p.x > width) p.dx *= -1;
      if (p.y < 0 || p.y > height) p.dy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // Connect close particles
      for (let j = index + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 - dist / 1000})`;
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(animate);
  }

  animate();
}

/* ==========================================
   2. Real-Time Weekly Countdown to Saturday Session (9:30 AM / 2:00 PM)
   ========================================== */
function initCountdownTimer() {
  const cdDays = document.getElementById('cd-days');
  const cdHours = document.getElementById('cd-hours');
  const cdMinutes = document.getElementById('cd-minutes');
  const cdSeconds = document.getElementById('cd-seconds');
  const cdBadge = document.querySelector('.countdown-badge');

  if (!cdDays) return;

  function getNextSaturdaySession() {
    const now = new Date();
    const result = new Date();
    let label = 'Saturday Morning Session @ 9:30 AM';

    // Saturday is day 6 (0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat)
    let dayDiff = (6 - now.getDay() + 7) % 7;

    if (dayDiff === 0) {
      // Today is Saturday
      if (now.getHours() < 9 || (now.getHours() === 9 && now.getMinutes() < 30)) {
        // Target Morning session 9:30 AM today
        result.setHours(9, 30, 0, 0);
        label = 'Today Morning Session @ 9:30 AM';
        return { time: result, label };
      } else if (now.getHours() < 14) {
        // Target Afternoon session 2:00 PM (14:00) today
        result.setHours(14, 0, 0, 0);
        label = 'Today Afternoon Session @ 2:00 PM';
        return { time: result, label };
      } else {
        // Both sessions passed today, target next Saturday 9:30 AM
        dayDiff = 7;
      }
    }

    result.setDate(now.getDate() + dayDiff);
    result.setHours(9, 30, 0, 0);
    label = 'Saturday Morning Session @ 9:30 AM';
    return { time: result, label };
  }

  function updateTimer() {
    const session = getNextSaturdaySession();
    const now = new Date().getTime();
    const distance = session.time.getTime() - now;

    if (cdBadge && session.label) {
      cdBadge.textContent = session.label;
    }

    if (distance < 0) {
      cdDays.textContent = '00';
      cdHours.textContent = '00';
      cdMinutes.textContent = '00';
      cdSeconds.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((distance % (1000 * 60)) / 1000);

    cdDays.textContent = String(days).padStart(2, '0');
    cdHours.textContent = String(hours).padStart(2, '0');
    cdMinutes.textContent = String(mins).padStart(2, '0');
    cdSeconds.textContent = String(secs).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

/* ==========================================
   3. Animated Stats Counter
   ========================================== */
function initStatsCounter() {
  const statNumbers = document.querySelectorAll('.stat-number');
  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        statNumbers.forEach(el => {
          const target = parseInt(el.getAttribute('data-target'), 10);
          let current = 0;
          const step = Math.ceil(target / 40);

          const interval = setInterval(() => {
            current += step;
            if (current >= target) {
              el.textContent = target;
              clearInterval(interval);
            } else {
              el.textContent = current;
            }
          }, 35);
        });
      }
    });
  }, { threshold: 0.5 });

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) observer.observe(heroStats);
}



/* ==========================================
   5. Gallery Filtering
   ========================================== */
function initGalleryFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      galleryItems.forEach(item => {
        const cat = item.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================
   6. FAQ Accordion Toggle
   ========================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}


/* ==========================================
   8. Toast Notification Utility
   ========================================== */
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-green)"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ==========================================
   9. Dark / Light Theme Toggle
   ========================================== */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  const icon = toggleBtn.querySelector('i');

  // Check saved theme from localStorage
  const savedTheme = localStorage.getItem('clique_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    if (icon) icon.className = 'fa-solid fa-sun';
  } else {
    document.body.classList.remove('light-theme');
    if (icon) icon.className = 'fa-solid fa-moon';
  }

  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');

    if (isLight) {
      if (icon) icon.className = 'fa-solid fa-sun';
      localStorage.setItem('clique_theme', 'light');
      showToast('Switched to Light Mode');
    } else {
      if (icon) icon.className = 'fa-solid fa-moon';
      localStorage.setItem('clique_theme', 'dark');
      showToast('Switched to Dark Glow Mode');
    }
  });
}

/* ==========================================
   10. Mobile Menu & Navbar Scroll
   ========================================== */
function initMobileMenu() {
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  const navbar = document.querySelector('.navbar');

  menuToggle?.addEventListener('click', () => {
    drawer.classList.toggle('open');
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
    });
  });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

/* ==========================================
   12. Student Google Sign-In Portal
   ========================================== */
function initStudentAuth() {
  const btnStudentLogin = document.getElementById('btn-student-login');
  const mobileStudentLoginBtn = document.getElementById('mobile-student-login-btn');
  const studentLoginModal = document.getElementById('student-login-modal');
  const studentLoginClose = document.getElementById('student-login-close');

  const userProfileBadge = document.getElementById('user-profile-badge');
  const userAvatar = document.getElementById('user-avatar');
  const userDisplayName = document.getElementById('user-display-name');
  const btnStudentLogout = document.getElementById('btn-student-logout');

  function updateAuthStateUI() {
    const user = JSON.parse(localStorage.getItem('clique_student_user'));
    if (user) {
      btnStudentLogin?.classList.add('hidden');
      mobileStudentLoginBtn?.classList.add('hidden');
      userProfileBadge?.classList.remove('hidden');

      if (userAvatar) {
        if (user.picture) {
          userAvatar.innerHTML = `<img src="${user.picture}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
          userAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'S';
        }
      }
      if (userDisplayName) userDisplayName.textContent = user.name ? user.name.split(' ')[0] : 'Student';
    } else {
      btnStudentLogin?.classList.remove('hidden');
      mobileStudentLoginBtn?.classList.remove('hidden');
      userProfileBadge?.classList.add('hidden');
    }
  }

  window.updateAuthStateUI = updateAuthStateUI;
  window.addEventListener('storage', updateAuthStateUI);

  updateAuthStateUI();

  const openStudentModal = () => studentLoginModal?.classList.add('open');
  btnStudentLogin?.addEventListener('click', openStudentModal);
  mobileStudentLoginBtn?.addEventListener('click', () => {
    document.getElementById('mobile-drawer')?.classList.remove('open');
    openStudentModal();
  });

  studentLoginClose?.addEventListener('click', () => studentLoginModal?.classList.remove('open'));

  studentLoginModal?.addEventListener('click', (e) => {
    if (e.target === studentLoginModal) studentLoginModal.classList.remove('open');
  });

  btnStudentLogout?.addEventListener('click', () => {
    localStorage.removeItem('clique_student_user');
    updateAuthStateUI();
    showToast('Signed out of Google Account.');
  });
}

/* ==========================================
   13. Student History Portal (Bookings & Hall of Fame)
   ========================================== */
function initHistoryModal() {
  const navHistoryLink = document.getElementById('nav-history-link');
  const mobileHistoryLink = document.getElementById('mobile-history-link');
  const historyModal = document.getElementById('history-modal');
  const historyModalClose = document.getElementById('history-modal-close');

  const tabBtnBookings = document.getElementById('tab-btn-bookings');
  const tabBtnWinners = document.getElementById('tab-btn-winners');
  const tabContentBookings = document.getElementById('tab-content-bookings');
  const tabContentWinners = document.getElementById('tab-content-winners');

  const historyBookingsTableBody = document.getElementById('history-bookings-table-body');
  const winnersGridContainer = document.getElementById('winners-grid-container');

  const openHistory = (e) => {
    e?.preventDefault();
    const user = JSON.parse(localStorage.getItem('clique_student_user'));
    if (!user) {
      showToast('🔒 Please Sign In with Google to view your history!');
      return;
    }
    renderStudentHistory();
    historyModal?.classList.add('open');
  };

  navHistoryLink?.addEventListener('click', openHistory);
  mobileHistoryLink?.addEventListener('click', (e) => {
    document.getElementById('mobile-drawer')?.classList.remove('open');
    openHistory(e);
  });

  historyModalClose?.addEventListener('click', () => historyModal?.classList.remove('open'));

  historyModal?.addEventListener('click', (e) => {
    if (e.target === historyModal) historyModal.classList.remove('open');
  });

  tabBtnBookings?.addEventListener('click', () => {
    tabBtnBookings.classList.add('active');
    tabBtnWinners.classList.remove('active');
    tabContentBookings.classList.remove('hidden');
    tabContentWinners.classList.add('hidden');
  });

  tabBtnWinners?.addEventListener('click', () => {
    tabBtnWinners.classList.add('active');
    tabBtnBookings.classList.remove('active');
    tabContentWinners.classList.remove('hidden');
    tabContentBookings.classList.add('hidden');
  });

  async function renderStudentHistory() {
    const user = JSON.parse(localStorage.getItem('clique_student_user'));
    let allRsvps = [];
    try {
      const response = await fetch('/api/rsvps');
      if (response.ok) {
        allRsvps = await response.json();
      }
    } catch (err) {
      console.error(err);
    }

    let userBookings = allRsvps.filter(r => r.name.toLowerCase().includes(user.name.toLowerCase()) || (user.email && r.studentId === user.email));

    if (historyBookingsTableBody) {
      historyBookingsTableBody.innerHTML = '';
      if (userBookings.length === 0) {
        historyBookingsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No bookings found.</td></tr>';
      }
      userBookings.forEach((b, i) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
        tr.innerHTML = `
          <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${i + 1}</td>
          <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--text-primary);">CLIQUE Saturday 4-Stage Quiz</td>
          <td style="padding: 0.75rem 1rem; color: var(--text-secondary);">EEE Classroom • Morning/Afternoon</td>
          <td style="padding: 0.75rem 1rem;"><span style="font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); background: rgba(139,92,246,0.15); color: var(--accent-purple); font-weight: 600;">${b.year}</span></td>
          <td style="padding: 0.75rem 1rem;"><span style="font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); background: rgba(16,185,129,0.15); color: var(--accent-green); font-weight: 700;"><i class="fa-solid fa-circle-check"></i> Confirmed</span></td>
        `;
        historyBookingsTableBody.appendChild(tr);
      });
    }

    const pastWinners = [];

    if (winnersGridContainer) {
      winnersGridContainer.innerHTML = '';
      if (pastWinners.length === 0) {
        winnersGridContainer.innerHTML = '<div style="color: var(--text-muted); padding: 2rem; text-align: center; grid-column: 1 / -1;">No winners announced yet. Check back after the next session!</div>';
      }
    }
  }
}

/* Close Modals on ESC Key */
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

/* ==========================================
   14. Google Identity Services (GSI) Callback
   ========================================== */
window.GOOGLE_CLIENT_ID = "712129213277-vvlrfsfcto664s31bb025v4j1dgulvbj.apps.googleusercontent.com";

// Fetch config from backend
fetch('/api/config')
  .then(res => res.json())
  .then(data => {
    if (data.googleClientId) {
      window.GOOGLE_CLIENT_ID = data.googleClientId;
      const meta = document.querySelector('meta[name="google-signin-client_id"]');
      if (meta) meta.content = data.googleClientId;
    }
  })
  .catch(err => console.error('Failed to load config', err));

// Fetch event details
fetch('/api/config/event')
  .then(res => res.json())
  .then(data => {
    const detailsSpan = document.getElementById('hero-event-details');
    if (detailsSpan) {
      detailsSpan.textContent = `${data.date} • ${data.time} • ${data.venue}`;
    }
  })
  .catch(err => console.error('Failed to fetch event details', err));
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT Decode error:", e);
    return {};
  }
}

async function handleGoogleCredentialResponse(response) {
  if (!response || !response.credential) return;
  const payload = parseJwt(response.credential);

  const userObj = {
    name: payload.name || (payload.email ? payload.email.split('@')[0] : 'Google Student'),
    email: payload.email || 'student@gmail.com',
    picture: payload.picture || '',
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
      const dbUser = await res.json();
      userObj.role = dbUser.role;
      userObj.permissions = dbUser.permissions;
      
      localStorage.setItem('clique_student_user', JSON.stringify(userObj));

      const studentLoginModal = document.getElementById('student-login-modal');
      studentLoginModal?.classList.remove('open');

      // Trigger UI refresh
      window.dispatchEvent(new Event('storage'));
      if (window.updateAuthStateUI) window.updateAuthStateUI();

      if (typeof showToast === 'function') {
        showToast(`Signed in via Google SDK as ${userObj.name}!`);
      }

      // Redirect user based on role
      setTimeout(() => {
        if (userObj.role === 'admin' || (userObj.permissions && userObj.permissions.length > 0)) {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }, 400);
    } else {
      const errData = await res.json();
      if (typeof showToast === 'function') {
        showToast(errData.error || 'Login failed', true);
      }
    }
  } catch (err) {
    console.error('Error syncing user with backend:', err);
    if (typeof showToast === 'function') {
      showToast('Error connecting to server', true);
    }
  }
}

/* ==========================================
   15. Interactive Neon Cursor & Sparkle Trail Effect
   ========================================== */
function initCursorEffect() {
  // Cursor special effects disabled
}



