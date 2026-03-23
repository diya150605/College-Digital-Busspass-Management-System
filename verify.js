// verify.js — scan simulation + manual verify + result rendering
document.addEventListener('DOMContentLoaded', () => {
  const KEY = 'guni_app_data_v1';

  // UI elements
  const btnScan = document.getElementById('btn-scan');
  const btnManual = document.getElementById('btn-manual');
  const modeScan = document.getElementById('mode-scan');
  const modeManual = document.getElementById('mode-manual');
  const qrFrame = document.getElementById('qr-frame');
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

  // helper: switch mode
  function switchMode(mode) {
    btnScan.classList.toggle('active', mode === 'scan');
    btnManual.classList.toggle('active', mode === 'manual');
    modeScan.classList.toggle('active', mode === 'scan');
    modeManual.classList.toggle('active', mode === 'manual');
    // hide results when switching
    hideResult();
  }
  btnScan.addEventListener('click', () => switchMode('scan'));
  btnManual.addEventListener('click', () => switchMode('manual'));

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
    validTill: '30 June 2025'
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

  // simulate scanning: prompt for pass id
  qrFrame.addEventListener('click', () => {
    // In production: replace with camera & scan library
    const scanned = prompt('Simulate QR scan (paste scanned pass id):\nExample: BP-2026-012345');
    if (scanned !== null) {
      verifyPass(scanned.trim());
    }
  });

  // manual verify
  manualVerify.addEventListener('click', () => {
    const val = manualInput.value.trim();
    verifyPass(val);
  });

  // quick actions in error card
  retryScan.addEventListener('click', () => {
    switchMode('scan');
  });
  retryManual.addEventListener('click', () => {
    switchMode('manual');
  });

  // close result
  resultClose.addEventListener('click', hideResult);

  // On load set default mode
  switchMode('scan');
});