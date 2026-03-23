// apply.js: stepper logic, route population, validation and simulated payment
document.addEventListener('DOMContentLoaded', () => {
  const steps = Array.from(document.querySelectorAll('.step'));
  const stepperItems = Array.from(document.querySelectorAll('.step-item'));
  let current = 0;

  // Routes data (23 routes)
  const routes = [
    { id:1, title:'Ahmedabad - Ganpat University', desc:'Daily service, AC buses', fee:35000 },
    { id:2, title:'Gandhinagar - Ganpat University', desc:'Daily service, AC buses', fee:28000 },
    { id:3, title:'Mehsana - Ganpat University', desc:'Daily service, AC buses', fee:12000 },
    { id:4, title:'Palanpur - Ganpat University', desc:'Daily service, AC buses', fee:18000 },
    { id:5, title:'Patan - Ganpat University', desc:'Daily service, AC buses', fee:15000 },
    { id:6, title:'Visnagar - Ganpat University', desc:'Daily service, AC buses', fee:8000 },
    { id:7, title:'Unjha - Ganpat University', desc:'Daily service, AC buses', fee:10000 },
    { id:8, title:'Siddhpur - Ganpat University', desc:'Daily service, AC buses', fee:12000 },
    { id:9, title:'Kadi - Ganpat University', desc:'Daily service, AC buses', fee:10000 },
    { id:10, title:'Kalol - Ganpat University', desc:'Daily service, AC buses', fee:14000 },
    { id:11, title:'Himmatnagar - Ganpat University', desc:'Daily service, AC buses', fee:16000 },
    { id:12, title:'Idar - Ganpat University', desc:'Daily service, AC buses', fee:20000 },
    { id:13, title:'Modasa - Ganpat University', desc:'Daily service, AC buses', fee:22000 },
    { id:14, title:'Vijapur - Ganpat University', desc:'Daily service, AC buses', fee:11000 },
    { id:15, title:'Kheralu - Ganpat University', desc:'Daily service, AC buses', fee:9000 },
    { id:16, title:'Chanasma - Ganpat University', desc:'Daily service, AC buses', fee:13000 },
    { id:17, title:'Satlasana - Ganpat University', desc:'Daily service, AC buses', fee:14000 },
    { id:18, title:'Radhanpur - Ganpat University', desc:'Daily service, AC buses', fee:19000 },
    { id:19, title:'Deesa - Ganpat University', desc:'Daily service, AC buses', fee:21000 },
    { id:20, title:'Dhanera - Ganpat University', desc:'Daily service, AC buses', fee:23000 },
    { id:21, title:'Vav - Ganpat University', desc:'Daily service, AC buses', fee:25000 },
    { id:22, title:'Tharad - Ganpat University', desc:'Daily service, AC buses', fee:24000 },
    { id:23, title:'Danta - Ganpat University', desc:'Daily service, AC buses', fee:26000 },
  ];

  const PROC_FEE = 500;
  let selectedRouteId = null;

  const routesListEl = document.getElementById('routes-list');
  const feePassEl = document.getElementById('fee-pass');
  const feeProcEl = document.getElementById('fee-proc');
  const feeTotalEl = document.getElementById('fee-total');
  const paymentPassEl = document.getElementById('payment-pass');
  const paymentTotalEl = document.getElementById('payment-total');

  // Populate routes list
  function populateRoutes() {
    routesListEl.innerHTML = '';
    routes.forEach(r => {
      const item = document.createElement('div');
      item.className = 'route-item';
      item.innerHTML = `
        <div class="route-left">
          <label style="display:flex;gap:12px;align-items:center">
            <input type="radio" name="route" value="${r.id}">
            <div>
              <div class="route-title">${r.title}</div>
              <div class="route-desc">${r.desc}</div>
            </div>
          </label>
        </div>
        <div class="route-fee"><div style="text-align:right"><div style="color:#1b8c77;font-weight:600">₹${r.fee.toLocaleString()}</div><div style="font-size:12px;color:#7b8590">Annual Fee</div></div></div>
      `;
      routesListEl.appendChild(item);
    });

    // default select first route
    const firstRadio = routesListEl.querySelector('input[type=radio]');
    if (firstRadio) {
      firstRadio.checked = true;
      selectedRouteId = Number(firstRadio.value);
      updateFeeSummary();
    }

    routesListEl.addEventListener('change', (e) => {
      if (e.target && e.target.name === 'route') {
        selectedRouteId = Number(e.target.value);
        updateFeeSummary();
      }
    });
  }

  function updateFeeSummary() {
    const r = routes.find(x => x.id === selectedRouteId) || { fee: 0, title:'—' };
    feePassEl.textContent = `₹${(r.fee || 0).toLocaleString()}`;
    feeProcEl.textContent = `₹${PROC_FEE.toLocaleString()}`;
    feeTotalEl.textContent = `₹${((r.fee || 0) + PROC_FEE).toLocaleString()}`;
    paymentPassEl.textContent = r.title;
    paymentTotalEl.textContent = `₹${((r.fee || 0) + PROC_FEE).toLocaleString()}`;
  }

  populateRoutes();

  // Step navigation helpers
  function showStep(index) {
    current = index;
    steps.forEach((s, i) => s.classList.toggle('active', i === index));
    stepperItems.forEach((it, i) => {
      it.classList.toggle('active', i === index);
      it.classList.toggle('completed', i < index);
    });
    window.scrollTo({ top: document.querySelector('.apply-card').offsetTop - 20, behavior: 'smooth' });
  }

  document.querySelectorAll('.next-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = Number(btn.getAttribute('data-next'));
      // validate current before moving
      if (!validateStep(current)) return;
      showStep(target);
    });
  });

  document.querySelectorAll('.prev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = Number(btn.getAttribute('data-prev'));
      showStep(target);
    });
  });

  // Payment button (simulated)
  document.getElementById('pay-btn').addEventListener('click', () => {
    // verify at least a route selected and docs (basic)
    if (!selectedRouteId) { alert('Please select a route'); return; }
    // Simulate payment
    const confirmed = confirm('Simulate payment: click OK to proceed (demo).');
    if (!confirmed) return;
    // On success, move to confirmation
    showStep(4);
  });

  // File input preview text
  function wireFileInput(idInput, idLabel) {
    const input = document.getElementById(idInput);
    const label = document.getElementById(idLabel);
    if (!input || !label) return;
    input.addEventListener('change', () => {
      if (input.files && input.files.length) {
        const names = Array.from(input.files).map(f => f.name).join(', ');
        label.textContent = names;
      } else label.textContent = 'No file chosen';
    });
  }
  wireFileInput('doc-id', 'file-id');
  wireFileInput('doc-photo', 'file-photo');
  wireFileInput('doc-other', 'file-other');

  // Simple step validation
  function validateStep(idx) {
    if (idx === 0) {
      // require fullname, enrollment, mobile (10 digits), email
      const name = document.getElementById('app-fullname').value.trim();
      const enroll = document.getElementById('app-enrollment').value.trim();
      const mobile = document.getElementById('app-mobile').value.trim();
      const email = document.getElementById('app-email').value.trim();
      if (!name) { alert('Full name required'); return false; }
      if (!enroll) { alert('Enrollment number required'); return false; }
      if (!/^\d{10}$/.test(mobile)) { alert('Enter a valid 10-digit mobile'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Enter a valid email'); return false; }
    }
    if (idx === 1) {
      if (!selectedRouteId) { alert('Select a route'); return false; }
    }
    if (idx === 2) {
      // documents are optional for demo; no strict validation
    }
    return true;
  }

  // Apply another action (reset)
  document.getElementById('apply-another').addEventListener('click', (e) => {
    e.preventDefault();
    // reset basic fields
    document.getElementById('app-fullname').value = '';
    document.getElementById('app-enrollment').value = '';
    document.getElementById('app-dob').value = '';
    document.getElementById('app-gender').value = '';
    document.getElementById('app-mobile').value = '';
    document.getElementById('app-email').value = '';
    document.getElementById('app-address').value = '';
    // clear files
    ['doc-id','doc-photo','doc-other'].forEach(id => {
      const f = document.getElementById(id);
      if (f) f.value = '';
    });
    ['file-id','file-photo','file-other'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'No file chosen';
    });
    // reset route to first
    const firstRadio = routesListEl.querySelector('input[type=radio]');
    if (firstRadio) {
      firstRadio.checked = true;
      selectedRouteId = Number(firstRadio.value);
      updateFeeSummary();
    }
    showStep(0);
  });

  // ensure fee summary shows on load
  updateFeeSummary();
  showStep(0);
});