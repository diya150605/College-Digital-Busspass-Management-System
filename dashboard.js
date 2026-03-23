// dashboard.js — reads application data from localStorage and renders the dashboard
document.addEventListener('DOMContentLoaded', () => {
  // keys used by the Apply flow (apply.js should save these)
  const KEY = 'guni_app_data_v1';

  // default demo fallback when no stored application
  const demo = {
    fullname: 'Rahul Sharma',
    enrollment: '21012345',
    department: 'Computer Engineering',
    routeTitle: 'Ahmedabad - Ganpat University',
    fee: 35000,
    passId: 'BP-2026-012345',
    issueDate: '01 July 2026',
    validTill: '30 June 2025',
    timeline: [
      { title: 'Application Approved', date: '01 Jul 2026' },
      { title: 'Payment Verified', date: '01 Jul 2026' },
      { title: 'Pass Activated', date: '02 Jul 2026' }
    ],
    notifications: [
      { text: 'Your pass expires in 6 months', small: 'Consider renewing early' },
      { text: 'New route added: Viramgam', small: 'Check routes page' },
      { text: 'Pass verification successful', small: 'Last scanned today' }
    ]
  };

  // load stored data
  let data = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse stored application', e);
  }
  if (!data) data = demo; // fallback

  // Render welcome
  document.getElementById('welcome-name').textContent = `Welcome, ${data.fullname}`;
  document.getElementById('welcome-sub').textContent = `Enrollment No: ${data.enrollment} | ${data.department || ''}`;
  document.getElementById('pass-id').textContent = data.passId;
  document.getElementById('pass-valid').textContent = data.validTill;
  document.getElementById('pass-route').textContent = `Route: ${data.routeTitle}`;
  document.getElementById('pass-issue').textContent = data.issueDate;

  // timeline
  const timelineList = document.getElementById('timeline-list');
  timelineList.innerHTML = '';
  (data.timeline || []).forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = `<div class="timeline-dot">✓</div>
      <div class="timeline-text"><div class="title">${t.title}</div><div class="date">${t.date}</div></div>`;
    timelineList.appendChild(li);
  });

  // notifications
  const notList = document.getElementById('notifications-list');
  notList.innerHTML = '';
  (data.notifications || []).forEach(n => {
    const el = document.createElement('div');
    el.className = 'note';
    el.innerHTML = `<div class="text">${n.text}</div><div class="small">${n.small || ''}</div>`;
    notList.appendChild(el);
  });

  // view pass button (could open a modal or PDF; demo opens a small alert)
  document.getElementById('view-pass-btn').addEventListener('click', () => {
    alert(`Open digital pass (demo)\nPass ID: ${data.passId}\nRoute: ${data.routeTitle}`);
  });

  // renew / history buttons (demo alerts)
  document.getElementById('renew-btn').addEventListener('click', () => {
    alert('Renew pass — demo: this would start a renewal flow.');
  });
  document.getElementById('history-btn').addEventListener('click', () => {
    alert('Show payment history — demo.');
  });
});