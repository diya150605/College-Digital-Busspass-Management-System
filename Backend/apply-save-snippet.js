// Save application data to localStorage so dashboard can read it
// Insert this where payment is confirmed (before showStep(4) or before redirect).

const KEY = 'guni_app_data_v1';

// Build object from form values and selected route
const selectedRoute = routes.find(r => r.id === selectedRouteId) || { title: '—', fee: 0 };
const appData = {
  fullname: document.getElementById('app-fullname').value.trim() || 'Student',
  enrollment: document.getElementById('app-enrollment').value.trim() || '',
  department: document.getElementById('app-gender')?.value || '',
  routeTitle: selectedRoute.title,
  fee: selectedRoute.fee,
  passId: 'BP-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 900000 + 100000),
  issueDate: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
  validTill: '30 June 2025',   // demo static; compute real expiry as needed
  timeline: [
    { title: 'Application Approved', date: '01 Jul 2026' },
    { title: 'Payment Verified', date: '01 Jul 2026' },
    { title: 'Pass Activated', date: '02 Jul 2026' }
  ],
  notifications: [
    { text: 'Your pass expires in 6 months', small: 'Consider renewing early' },
    { text: 'New route added: Viramgam', small: 'Check routes page' }
  ]
};

localStorage.setItem(KEY, JSON.stringify(appData));

// Then show confirmation or navigate to dashboard
showStep(4); // OR: window.location.href = 'dashboard.html';