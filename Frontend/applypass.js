// Check authentication - redirect to login if not authenticated
function checkAuthentication() {
  const isAuthenticated = localStorage.getItem('guni_authenticated');
  if (!isAuthenticated) {
    alert('Please login first to apply for a pass.');
    window.location.href = 'digipass.html';
    return false;
  }
  return true;
}

// apply.js: stepper logic, route population, validation and simulated payment
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is authenticated
  if (!checkAuthentication()) {
    return;
  }

  const steps = Array.from(document.querySelectorAll('.step'));
  const stepperItems = Array.from(document.querySelectorAll('.step-item'));
  let current = 0;

  // Routes data (23 routes)
  const routes = [
    { id:1, title:'Ahmedabad - Ganpat University', desc:'Daily service', fee:35000 },
    { id:2, title:'Gandhinagar - Ganpat University', desc:'Daily service', fee:28000 },
    { id:3, title:'Mehsana - Ganpat University', desc:'Daily service', fee:12000 },
    { id:4, title:'Palanpur - Ganpat University', desc:'Daily service', fee:18000 },
    { id:5, title:'Patan - Ganpat University', desc:'Daily service', fee:15000 },
    { id:6, title:'Visnagar - Ganpat University', desc:'Daily service', fee:8000 },
    { id:7, title:'Unjha - Ganpat University', desc:'Daily service', fee:10000 },
    { id:8, title:'Siddhpur - Ganpat University', desc:'Daily service', fee:12000 },
    { id:9, title:'Kadi - Ganpat University', desc:'Daily service', fee:10000 },
    { id:10, title:'Kalol - Ganpat University', desc:'Daily service', fee:14000 },
    { id:11, title:'Himmatnagar - Ganpat University', desc:'Daily service', fee:16000 },
    { id:12, title:'Idar - Ganpat University', desc:'Daily service', fee:20000 },
    { id:13, title:'Modasa - Ganpat University', desc:'Daily service', fee:22000 },
    { id:14, title:'Vijapur - Ganpat University', desc:'Daily service', fee:11000 },
    { id:15, title:'Kheralu - Ganpat University', desc:'Daily service', fee:9000 },
    { id:16, title:'Chanasma - Ganpat University', desc:'Daily service', fee:13000 },
    { id:17, title:'Satlasana - Ganpat University', desc:'Daily service', fee:14000 },
    { id:18, title:'Radhanpur - Ganpat University', desc:'Daily service', fee:19000 },
    { id:19, title:'Deesa - Ganpat University', desc:'Daily service', fee:21000 },
    { id:20, title:'Dhanera - Ganpat University', desc:'Daily service', fee:23000 },
    { id:21, title:'Vav - Ganpat University', desc:'Daily service', fee:25000 },
    { id:22, title:'Tharad - Ganpat University', desc:'Daily service', fee:24000 },
    { id:23, title:'Danta - Ganpat University', desc:'Daily service', fee:26000 },
  ];

  const PROC_FEE = 0;
  let selectedRouteId = null;
  let selectedPaymentMethod = 'upi';

  const routesListEl = document.getElementById('routes-list');
  const feeTotalEl = document.getElementById('fee-total');
  const paymentTotalEl = document.getElementById('payment-total');
  const paymentModal = document.getElementById('payment-modal');
  const paymentQr = document.getElementById('payment-qr');
  const paymentModalTitle = document.getElementById('payment-modal-title');
  const paymentModalMethod = document.getElementById('payment-modal-method');
  const paymentConfirmBtn = document.getElementById('payment-confirm');
  const paymentCancelBtns = document.querySelectorAll('#payment-modal-close, .modal-cancel');
  const paymentQrSrc = 'qr-code.png';
  let pendingApplicationData = null;

  // Form data persistence - save form data to localStorage
  const formFields = ['app-fullname', 'app-enrollment', 'app-dob', 'app-gender', 'app-mobile', 'app-email', 'app-dept', 'app-address'];
  const storageKeyBase = 'guni_form_data';
  const sessionKeyBase = 'guni_session_data';

  function getCurrentUser() {
    const userData = localStorage.getItem('guni_user');
    if (!userData) return null;
    try {
      return JSON.parse(userData);
    } catch (err) {
      return null;
    }
  }

  function getUserStorageKey(baseKey) {
    const user = getCurrentUser();
    return user && user.enrollment ? `${baseKey}_${user.enrollment}` : baseKey;
  }

  function getApplicationStorageKey(enrollment) {
    return enrollment ? `applicationData_${enrollment}` : 'applicationData';
  }

  function getCurrentUserApplicationKey() {
    const user = getCurrentUser();
    if (user && user.enrollment) {
      return getApplicationStorageKey(user.enrollment);
    }
    return 'applicationData';
  }

  function applyCurrentUserToForm() {
    const user = getCurrentUser();
    if (!user) return;

    const map = {
      'app-fullname': user.name || '',
      'app-enrollment': user.enrollment || '',
      'app-mobile': user.mobile || '',
      'app-email': user.email || '',
      'app-dept': user.dept || ''
    };

    Object.entries(map).forEach(([fieldId, value]) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = value;
        if (fieldId === 'app-enrollment') {
          field.readOnly = true;
          field.style.backgroundColor = '#f5f7fb';
          field.title = 'Enrollment cannot be changed for the logged-in user';
        }
      }
    });
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function generatePassId() {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `BP-${year}-${random}`;
  }

  function saveFormData() {
    const data = {};
    formFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        data[fieldId] = field.value;
      }
    });
    // Also save route and current step
    const sessionData = {
      selectedRoute: selectedRouteId,
      currentStep: current,
      formData: data
    };
    const userStorageKey = getUserStorageKey(storageKeyBase);
    const userSessionKey = getUserStorageKey(sessionKeyBase);
    localStorage.setItem(userStorageKey, JSON.stringify(data));
    localStorage.setItem(userSessionKey, JSON.stringify(sessionData));
  }

  function loadFormData() {
    const savedData = localStorage.getItem(getUserStorageKey(storageKeyBase));
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        formFields.forEach(fieldId => {
          const field = document.getElementById(fieldId);
          if (field && data[fieldId]) {
            field.value = data[fieldId];
          }
        });
      } catch (e) {
        console.warn('Could not restore form data', e);
      }
    }
  }

  function loadSessionData() {
    const sessionData = localStorage.getItem(getUserStorageKey(sessionKeyBase));
    if (sessionData) {
      try {
        const data = JSON.parse(sessionData);
        // Will restore route after routes are populated
        return data;
      } catch (e) {
        console.warn('Could not restore session data', e);
        return null;
      }
    }
    return null;
  }

  function clearFormData() {
    localStorage.removeItem(getUserStorageKey(storageKeyBase));
    localStorage.removeItem(getUserStorageKey(sessionKeyBase));
  }

  // Load saved form data on page load
  loadFormData();
  applyCurrentUserToForm();
  let restoredSessionData = loadSessionData();

  // Save form data whenever a field changes
  formFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('blur', saveFormData);
      field.addEventListener('change', saveFormData);
    }
  });

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

    // Restore previously selected route if available
    if (restoredSessionData && restoredSessionData.selectedRoute) {
      const savedRouteRadio = routesListEl.querySelector(`input[type=radio][value="${restoredSessionData.selectedRoute}"]`);
      if (savedRouteRadio) {
        savedRouteRadio.checked = true;
        selectedRouteId = restoredSessionData.selectedRoute;
        updateFeeSummary();
      } else {
        // default select first route if saved route not found
        const firstRadio = routesListEl.querySelector('input[type=radio]');
        if (firstRadio) {
          firstRadio.checked = true;
          selectedRouteId = Number(firstRadio.value);
          updateFeeSummary();
        }
      }
    } else {
      // default select first route if no saved data
      const firstRadio = routesListEl.querySelector('input[type=radio]');
      if (firstRadio) {
        firstRadio.checked = true;
        selectedRouteId = Number(firstRadio.value);
        updateFeeSummary();
      }
    }

    routesListEl.addEventListener('change', (e) => {
      if (e.target && e.target.name === 'route') {
        selectedRouteId = Number(e.target.value);
        updateFeeSummary();
        saveFormData();
      }
    });
  }

  function updateFeeSummary() {
    const r = routes.find(x => x.id === selectedRouteId) || { fee: 0, title:'—' };
    const busPassFee = r.fee || 0;
    const totalFee = busPassFee + PROC_FEE;
    
    feeTotalEl.textContent = `₹${totalFee.toLocaleString()}`;
    paymentTotalEl.textContent = `₹${totalFee.toLocaleString()}`;
  }

  populateRoutes();

  // Payment method selection with sub-options
  const upiOptionsEl = document.getElementById('upi-options');
  const cardOptionsEl = document.getElementById('card-options');
  
  document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedPaymentMethod = e.target.value;
      if (selectedPaymentMethod === 'upi') {
        upiOptionsEl.classList.add('active');
        cardOptionsEl.classList.remove('active');
      } else if (selectedPaymentMethod === 'card') {
        cardOptionsEl.classList.add('active');
        upiOptionsEl.classList.remove('active');
      }
    });
  });

  function closePaymentModal() {
    paymentModal.classList.remove('active');
  }

  function openPaymentModal() {
    const activeUpi = document.querySelector('input[name="upi-provider"]:checked');
    const provider = activeUpi ? activeUpi.value : 'upi';
    const displayName = provider.charAt(0).toUpperCase() + provider.slice(1);

    paymentQr.src = paymentQrSrc;
    paymentModalTitle.textContent = selectedPaymentMethod === 'card' ? 'Scan to pay using UPI' : `Scan to pay with ${displayName}`;
    paymentModalMethod.textContent = selectedPaymentMethod === 'card'
      ? 'Card payment is selected; scan this QR code in your UPI app to complete payment.'
      : `Open ${displayName} and scan this QR code to complete payment.`;
    paymentModal.classList.add('active');
  }

  paymentCancelBtns.forEach(btn => btn.addEventListener('click', closePaymentModal));

  paymentConfirmBtn.addEventListener('click', async () => {
    if (!pendingApplicationData) return;
    paymentConfirmBtn.disabled = true;
    paymentConfirmBtn.textContent = 'Processing...';
    
    // Simulate payment processing for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mark payment as completed
    pendingApplicationData.paymentCompleted = true;
    pendingApplicationData.paymentDate = new Date().toISOString();
    
    closePaymentModal();
    await submitApplication(pendingApplicationData);
    pendingApplicationData = null;
    paymentConfirmBtn.disabled = false;
    paymentConfirmBtn.textContent = 'Payment Completed';
  });

  async function submitApplication(applicationData) {
    try {
      const response = await fetch('http://127.0.0.1:5000/submit_application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(applicationData)
      });

      const result = await response.json();

      if (result.success) {
        clearFormData();
        const appData = {
          ...applicationData,
          id: Date.now(),
          status: 'pending',
          appliedDate: new Date().toISOString(),
          passId: 'PENDING'
        };
        const appStorageKey = getApplicationStorageKey(appData.enrollment);
        localStorage.setItem(appStorageKey, JSON.stringify(appData));
        
        // Send confirmation email
        try {
          await fetch('http://127.0.0.1:5000/send_confirmation_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: applicationData.email,
              student_name: applicationData.student_name,
              pass_id: 'Pending'
            })
          }).catch(e => console.warn('Email sending skipped:', e));
        } catch (e) {
          console.warn('Could not send confirmation email:', e);
        }
        
        displayConfirmation(appData);
        showStep(4);
      } else {
        alert('Failed to submit application: ' + result.message);
      }
    } catch (error) {
      // Backend not available - proceed locally
      console.warn('Backend unavailable, proceeding with local storage:', error);
      clearFormData();
      const appData = {
        ...applicationData,
        id: Date.now(),
        status: 'pending',
        appliedDate: new Date().toISOString(),
        passId: 'PENDING'
      };
      const appStorageKey = getApplicationStorageKey(appData.enrollment);
      localStorage.setItem(appStorageKey, JSON.stringify(appData));
      displayConfirmation(appData);
      showStep(4);
    }
  }

  // Step navigation helpers
  function showStep(index) {
    current = index;
    steps.forEach((s, i) => s.classList.toggle('active', i === index));
    stepperItems.forEach((it, i) => {
      it.classList.toggle('active', i === index);
      it.classList.toggle('completed', i < index);
    });
    saveFormData(); // Save current step to localStorage
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
  document.getElementById('pay-btn').addEventListener('click', async () => {
    // verify all required personal details and route selection before paying
    if (!validateStep(0)) return;
    if (!validateStep(1)) return;

    // Collect application data
    const applicationData = {
      student_name: document.getElementById('app-fullname').value.trim(),
      enrollment: document.getElementById('app-enrollment').value.trim(),
      dob: document.getElementById('app-dob').value,
      gender: document.getElementById('app-gender').value,

      mobile: document.getElementById('app-mobile').value.trim(),
      email: document.getElementById('app-email').value.trim(),
      dept: document.getElementById('app-dept').value,
      address: document.getElementById('app-address').value.trim(),
      route_id: selectedRouteId,
      route_title: routes.find(r => r.id === selectedRouteId)?.title || '',
      fee: routes.find(r => r.id === selectedRouteId)?.fee || 0
    };

    // Validate required fields before payment
    const required = ['student_name', 'enrollment', 'dob', 'gender', 'mobile', 'email', 'dept', 'address'];
    for (const field of required) {
      if (!applicationData[field]) {
        alert(`Please fill in ${field.replace('_', ' ')}`);
        return;
      }
    }

    const photoInput = document.getElementById('doc-photo');
    if (photoInput && photoInput.files && photoInput.files.length > 0) {
      try {
        applicationData.photoDataUrl = await fileToDataURL(photoInput.files[0]);
      } catch (err) {
        console.warn('Unable to read photo file', err);
      }
    }

    applicationData.passId = generatePassId();
    applicationData.registrationDate = new Date().toISOString();
    applicationData.issueDate = applicationData.registrationDate;
    const issue = new Date(applicationData.issueDate);
    const validDate = new Date(issue);
    validDate.setMonth(validDate.getMonth() + 6);
    applicationData.validTill = validDate.toISOString();

    pendingApplicationData = applicationData;
    openPaymentModal();
  });

  function displayConfirmation(appData) {
    const confirmBox = document.querySelector('.confirm-box');
    if (!confirmBox) return;
    
    const routeTitle = appData.route_title || '—';
    const fee = appData.fee || 0;
    const studentName = appData.student_name || '—';
    const enrollment = appData.enrollment || '—';
    const applicationId = appData.id || Date.now();
    
    confirmBox.innerHTML = `
      <div class="confirm-icon">✓</div>
      <h3>Application Submitted Successfully</h3>
      <p>Your bus pass application has been received and payment has been processed.</p>
      
      <div class="confirmation-details card" style="margin: 20px 0; padding: 20px; background: #f5f9f8; border-radius: 8px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div style="font-size: 12px; color: #7b8590; margin-bottom: 4px;">Application ID</div>
            <div style="font-size: 16px; font-weight: 600; color: #1a202c;">${applicationId}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #7b8590; margin-bottom: 4px;">Student Name</div>
            <div style="font-size: 16px; font-weight: 600; color: #1a202c;">${studentName}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #7b8590; margin-bottom: 4px;">Enrollment Number</div>
            <div style="font-size: 16px; font-weight: 600; color: #1a202c;">${enrollment}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #7b8590; margin-bottom: 4px;">Route</div>
            <div style="font-size: 16px; font-weight: 600; color: #1a202c;">${routeTitle}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #7b8590; margin-bottom: 4px;">Payment Amount</div>
            <div style="font-size: 16px; font-weight: 600; color: #1b8c77;">₹${fee.toLocaleString()}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #7b8590; margin-bottom: 4px;">Status</div>
            <div style="font-size: 16px; font-weight: 600; color: #1b8c77;">Submitted</div>
          </div>
        </div>
      </div>
      
      <p style="font-size: 14px; color: #7b8590; margin: 20px 0;">A confirmation email and SMS have been sent to your registered mobile number and email address. Your pass will be processed within 2-3 business days.</p>
      
      <div class="actions-row" style="margin-top: 30px;">
        <a href="dashboard.html" class="btn primary">Go to Dashboard</a>
        <button class="btn ghost" id="apply-another-new">Apply Another Pass</button>
      </div>
    `;
    
    // Re-attach event listener to apply-another button
    const applyAnotherBtn = document.getElementById('apply-another-new');
    if (applyAnotherBtn) {
      applyAnotherBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetApplication();
      });
    }
  }

  function resetApplication() {
    // reset basic fields
    document.getElementById('app-fullname').value = '';
    document.getElementById('app-enrollment').value = '';
    document.getElementById('app-dob').value = '';
    document.getElementById('app-gender').value = '';
    document.getElementById('app-mobile').value = '';
    document.getElementById('app-email').value = '';
    document.getElementById('app-address').value = '';
    // clear saved form data
    clearFormData();
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
    // reset payment method
    const upiRadio = document.querySelector('input[name="payment-method"][value="upi"]');
    if (upiRadio) upiRadio.checked = true;
    upiOptionsEl.classList.add('active');
    cardOptionsEl.classList.remove('active');
    
    showStep(0);
  }

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
      const name = document.getElementById('app-fullname').value.trim();
      const enroll = document.getElementById('app-enrollment').value.trim();
      const dob = document.getElementById('app-dob').value;
      const gender = document.getElementById('app-gender').value;
      const mobile = document.getElementById('app-mobile').value.trim();
      const email = document.getElementById('app-email').value.trim();
      const dept = document.getElementById('app-dept').value;
      const address = document.getElementById('app-address').value.trim();

      if (!name) { alert('Full name required'); return false; }
      if (!enroll) { alert('Enrollment number required'); return false; }
      if (!dob) { alert('Date of birth required'); return false; }
      if (!gender) { alert('Gender selection required'); return false; }
      if (!/^[0-9]{10}$/.test(mobile)) { alert('Enter a valid 10-digit mobile number'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Enter a valid email address'); return false; }
      if (!dept) { alert('Department selection required'); return false; }
      if (!address) { alert('Permanent address required'); return false; }
    }
    if (idx === 1) {
      if (!selectedRouteId) { alert('Select a route'); return false; }
    }
    if (idx === 2) {
      const idFile = document.getElementById('doc-id').files;
      const photoFile = document.getElementById('doc-photo').files;
      if (!idFile || idFile.length === 0) { alert('Please upload your student ID card'); return false; }
      if (!photoFile || photoFile.length === 0) { alert('Please upload your passport-size photo'); return false; }
    }
    return true;
  }

  // ensure fee summary shows on load
  updateFeeSummary();
  
  // Restore to the step where user left off
  if (restoredSessionData && restoredSessionData.currentStep !== undefined) {
    showStep(restoredSessionData.currentStep);
    // Show restoration notice
    const notice = document.getElementById('restoration-notice');
    if (notice) {
      notice.style.display = 'flex';
      setTimeout(() => {
        notice.style.opacity = '0';
        notice.style.transition = 'opacity 0.5s ease-in-out';
      }, 5000);
    }
  } else {
    showStep(0);
  }
});