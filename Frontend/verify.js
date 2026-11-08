// Check authentication - redirect to login if not authenticated
function checkVerifyAuthentication() {
  const isAuthenticated = localStorage.getItem('guni_authenticated');
  if (!isAuthenticated) {
    alert('Please login first to verify a pass.');
    window.location.href = 'digipass.html';
    return false;
  }
  return true;
}

// verify.js — camera QR scan + manual verify + result rendering
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is authenticated
  if (!checkVerifyAuthentication()) {
    return;
  }

  const KEY = 'guni_app_data_v1';
  let html5QrcodeScanner = null;

  // UI elements
  const btnScan = document.getElementById('btn-scan');
  const btnManual = document.getElementById('btn-manual');
  const modeScan = document.getElementById('mode-scan');
  const modeManual = document.getElementById('mode-manual');
  const qrScannerContainer = document.getElementById('qr-scanner');
  const startCameraBtn = document.getElementById('start-camera');
  const stopCameraBtn = document.getElementById('stop-camera');
  const manualInput = document.getElementById('manual-pass');
  const manualVerify = document.getElementById('manual-verify');

  const resultCard = document.getElementById('verify-result');
  const errorCard = document.getElementById('verify-error');

  const rName = document.getElementById('r-name');
  const rSub = document.getElementById('r-sub');
  const rPassId = document.getElementById('r-passid');
  const rRoute = document.getElementById('r-route');
  const rIssue = document.getElementById('r-issue');
  const rValid = document.getElementById('r-valid');
  const rQr = document.getElementById('r-qr');
  const resultStatus = document.getElementById('result-status');
  const resultClose = document.getElementById('result-close');

  const retryScan = document.getElementById('retry-scan');
  const retryManual = document.getElementById('retry-manual');

  // Initialize QR Scanner
  function initializeQRScanner() {
    if (html5QrcodeScanner) {
      return; // Already initialized
    }
    
    html5QrcodeScanner = new Html5Qrcode('qr-scanner');
  }

  // Start camera
  function startCamera() {
    if (!html5QrcodeScanner) {
      initializeQRScanner();
    }

    html5QrcodeScanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 350, height: 350 }
      },
      (decodedText, decodedResult) => {
        // QR code detected
        console.log('QR Code detected:', decodedText);
        verifyPass(decodedText.trim());
        stopCamera(); // Stop after detecting a QR
      },
      (errorMessage) => {
        // Error - but continue scanning
      }
    ).catch(err => {
      console.error('Error starting camera:', err);
      alert('Unable to access camera. Please check permissions.');
    });

    startCameraBtn.style.display = 'none';
    stopCameraBtn.style.display = 'inline-block';
  }

  // Stop camera
  function stopCamera() {
    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
      html5QrcodeScanner.stop().then(() => {
        startCameraBtn.style.display = 'inline-block';
        stopCameraBtn.style.display = 'none';
      }).catch(err => console.error('Error stopping scanner:', err));
    }
  }

  // helper: switch mode
  function switchMode(mode) {
    btnScan.classList.toggle('active', mode === 'scan');
    btnManual.classList.toggle('active', mode === 'manual');
    modeScan.classList.toggle('active', mode === 'scan');
    modeManual.classList.toggle('active', mode === 'manual');
    
    // Stop camera when switching away from scan mode
    if (mode !== 'scan') {
      stopCamera();
    } else {
      // Start camera when switching to scan mode
      setTimeout(startCamera, 300);
    }
    
    // hide results when switching
    hideResult();
  }

  btnScan.addEventListener('click', () => switchMode('scan'));
  btnManual.addEventListener('click', () => switchMode('manual'));

  // Camera button events
  startCameraBtn.addEventListener('click', startCamera);
  stopCameraBtn.addEventListener('click', stopCamera);

  // hide result/error
  function hideResult() {
    resultCard.hidden = true;
    errorCard.hidden = true;
  }

  // Load stored application(s) from localStorage
  function loadStoredRecords() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      // application can be object or array (handle both)
      if (Array.isArray(obj)) return obj;
      return [obj];
    } catch (e) {
      console.warn('Failed to parse stored app data', e);
      return null;
    }
  }

  // Demo fallback record if nothing in storage
  const demoRecord = {
    fullname: 'Rahul Sharma',
    enrollment: '21012345',
    department: 'Computer Engineering',
    routeTitle: 'Ahmedabad - Ganpat University',
    fee: 35000,
    passId: 'BP-2026-012345',
    issueDate: '01 July 2026',
    validTill: '30 June 2027'
  };

  // Verify a pass id against stored records or demo
  function verifyPass(passId) {
    hideResult();
    if (!passId) {
      showError('Please provide a pass id.');
      return;
    }
    const stored = loadStoredRecords();
    let record = null;
    if (stored && stored.length) {
      record = stored.find(r => (r.passId && r.passId.toString().toLowerCase() === passId.toLowerCase())
        || (r.passID && r.passID.toString().toLowerCase() === passId.toLowerCase()));
    }
    // Accept demo pass id as fallback
    if (!record && passId.toLowerCase() === demoRecord.passId.toLowerCase()) record = demoRecord;

    if (record) {
      showResult(record);
    } else {
      showError();
    }
  }

  // render result
  function showResult(rec) {
    resultCard.hidden = false;
    errorCard.hidden = true;
    resultStatus.textContent = 'Valid';
    rName.textContent = rec.fullname || 'Student';
    rSub.textContent = `Enrollment No: ${rec.enrollment || '—'} | ${rec.department || ''}`;
    rPassId.textContent = rec.passId || rec.passID || '—';
    rRoute.textContent = rec.routeTitle || '—';
    rIssue.textContent = rec.issueDate || '—';
    rValid.textContent = rec.validTill || '—';
    rQr.textContent = (rec.passId || rec.passID || '').slice(0,6) || 'QR';
  }

  function showError(message) {
    errorCard.hidden = false;
    resultCard.hidden = true;
    if (message) errorCard.querySelector('.error-text strong').textContent = message;
  }

  // manual verify
  manualVerify.addEventListener('click', () => {
    const val = manualInput.value.trim();
    verifyPass(val);
  });

  // Allow Enter key in manual input
  manualInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      manualVerify.click();
    }
  });

  // quick actions in error card
  retryScan.addEventListener('click', () => {
    switchMode('scan');
  });
  retryManual.addEventListener('click', () => {
    switchMode('manual');
  });

  // close result
  resultClose.addEventListener('click', () => {
    hideResult();
    switchMode('scan');
  });

  // On load set default mode and start camera
  switchMode('scan');
});