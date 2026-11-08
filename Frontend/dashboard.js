document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'applicationData';

  const fallback = {
    fullname: 'Student',
    enrollment: '23012021001',
    department: 'Computer Engineering',
    routeTitle: 'Ahmedabad - Ganpat University',
    mobile: '9876543210',
    email: 'student@guni.ac.in',
    passId: 'BP-2026-000001',
    issueDate: '3/20/2026',
    validFrom: '3/20/2026',
    validTill: '4/15/2027',
    photoDataUrl: null
  };

  function getCurrentUserEnrollment() {
    const raw = localStorage.getItem('guni_user');
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      const enrollment = user.enrollment || null;
      console.log('[Dashboard] Retrieved enrollment from localStorage:', enrollment);
      return enrollment;
    } catch (err) {
      console.warn('[Dashboard] Failed to parse user from localStorage:', err);
      return null;
    }
  }

  function requireLogin() {
    const user = localStorage.getItem('guni_user');
    if (!user) {
      window.location.href = 'digipass.html';
      return false;
    }
    return true;
  }

  function getApplicationDataStorageKey() {
    const enrollment = getCurrentUserEnrollment();
    return enrollment ? `applicationData_${enrollment}` : STORAGE_KEY;
  }

  const parseDate = value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = date => date ? date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : null;

  if (!requireLogin()) return;

  let data = fallback;
  const enrollment = getCurrentUserEnrollment();

  // Wrap async loading in IIFE
  (async () => {
    async function loadServerApplication() {
      if (!enrollment) {
        console.warn('[Dashboard] No enrollment found, skipping server fetch');
        return null;
      }
      try {
        const url = `http://127.0.0.1:5000/student/application?enrollment=${encodeURIComponent(enrollment)}`;
        console.log('[Dashboard] Fetching application from:', url);
        const response = await fetch(url);
        const result = await response.json();
        console.log('[Dashboard] Server response:', { status: response.status, ok: response.ok, result });
        if (response.ok && result.success && result.application) {
          console.log('[Dashboard] Found application data for enrollment:', enrollment);
          return {
            ...result.application,
            ...result.user
          };
        } else {
          console.log('[Dashboard] No application found on server for enrollment:', enrollment);
        }
      } catch (err) {
        console.warn('[Dashboard] Failed to load server application data:', err);
      }
      return null;
    }

    try {
      const serverData = await loadServerApplication();
      if (serverData) {
        const issueDateValue = parseDate(serverData.issueDate) || parseDate(serverData.appliedDate);
        const validTillValue = parseDate(serverData.validTill) || (issueDateValue ? (() => {
          const dt = new Date(issueDateValue);
          dt.setMonth(dt.getMonth() + 6);
          return dt;
        })() : null);

        data = {
          ...fallback,
          fullname: serverData.student_name || serverData.name || fallback.fullname,
          enrollment: serverData.enrollment || fallback.enrollment,
          department: serverData.dept || serverData.department || fallback.department,
          routeTitle: serverData.route_title || fallback.routeTitle,
          mobile: serverData.mobile || fallback.mobile,
          email: serverData.email || fallback.email,
          passId: serverData.pass_id || serverData.passId || fallback.passId,
          issueDate: issueDateValue ? formatDate(issueDateValue) : fallback.issueDate,
          validFrom: issueDateValue ? formatDate(issueDateValue) : fallback.validFrom,
          validTill: validTillValue ? formatDate(validTillValue) : fallback.validTill,
          photoDataUrl: serverData.photoDataUrl || null,
          status: serverData.status === 'approved' || serverData.pass_id ? 'PASS GENERATED' : (serverData.status === 'pending' ? 'PENDING' : 'ACTIVE')
        };
      } else {
        const storedKey = getApplicationDataStorageKey();
        const stored = localStorage.getItem(storedKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          const issueDateValue = parseDate(parsed.issueDate) || parseDate(parsed.appliedDate);
          const validTillValue = parseDate(parsed.validTill) || (issueDateValue ? (() => {
            const dt = new Date(issueDateValue);
            dt.setMonth(dt.getMonth() + 6);
            return dt;
          })() : null);

          data = {
            ...fallback,
            fullname: parsed.student_name || parsed.fullname || fallback.fullname,
            enrollment: parsed.enrollment || fallback.enrollment,
            department: parsed.dept || parsed.department || fallback.department,
            routeTitle: parsed.route_title || fallback.routeTitle,
            mobile: parsed.mobile || fallback.mobile,
            email: parsed.email || fallback.email,
            passId: parsed.pass_id || parsed.passId || fallback.passId,
            issueDate: issueDateValue ? formatDate(issueDateValue) : fallback.issueDate,
            validFrom: issueDateValue ? formatDate(issueDateValue) : fallback.validFrom,
            validTill: validTillValue ? formatDate(validTillValue) : fallback.validTill,
            photoDataUrl: parsed.photoDataUrl || null,
            status: parsed.paymentCompleted ? 'PASS GENERATED' : (parsed.status === 'pending' ? 'PENDING' : 'ACTIVE')
          };
        }
      }
    } catch (error) {
      console.warn('Unable to load dashboard data', error);
    }

    updateDashboard();
  })();

  function updateDashboard() {
    const isApproved = data.status === 'PASS GENERATED' || (data.passId && data.passId !== 'BP-2026-000001');
    
    document.getElementById('pass-user').textContent = data.fullname;
    document.getElementById('pass-enroll').textContent = data.enrollment;
    document.getElementById('pass-dept').textContent = data.department;
    
    // Only show pass ID if approved
    const passIdEl = document.getElementById('pass-id');
    if (isApproved) {
      passIdEl.textContent = data.passId;
      passIdEl.style.display = 'block';
    } else {
      passIdEl.textContent = 'Pending Approval';
      passIdEl.style.display = 'block';
      passIdEl.style.color = '#999';
    }
    
    document.getElementById('pass-valid').textContent = data.validTill;
    document.getElementById('pass-route').textContent = data.routeTitle;
    document.getElementById('pass-issue').textContent = data.issueDate;
    const statusEl = document.getElementById('pass-status');
    if (statusEl) {
      statusEl.textContent = data.status || 'Active';
      statusEl.classList.toggle('active', data.status === 'Pass Generated' || data.status === 'Active');
    }

    document.getElementById('info-name').textContent = data.fullname;
    document.getElementById('info-enroll').textContent = data.enrollment;
    document.getElementById('info-route').textContent = data.routeTitle;
    document.getElementById('info-valid').textContent = `${data.validFrom} — ${data.validTill}`;
    document.getElementById('info-mobile').textContent = data.mobile;
    document.getElementById('info-email').textContent = data.email;

    const avatar = document.querySelector('.profile-icon');
    if (data.photoDataUrl && avatar) {
      avatar.style.backgroundImage = `url(${data.photoDataUrl})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.textContent = '';
      avatar.classList.add('has-photo');
    }

    const qrImage = document.getElementById('pass-qrcode-img');
    const verifyUrl = `http://127.0.0.1:5000/verify_pass/${data.passId}`;
    if (qrImage) {
      if (isApproved) {
        qrImage.style.display = 'block';
        qrImage.src = `/qrcodes/${encodeURIComponent(data.passId)}.png`;
        qrImage.alt = `QR Code for ${data.passId}`;
        qrImage.onerror = () => {
          const qrContainer = document.createElement('div');
          qrContainer.className = 'pass-qr-box';
          qrContainer.style.width = '180px';
          qrContainer.style.height = '180px';
          qrContainer.style.display = 'flex';
          qrContainer.style.alignItems = 'center';
          qrContainer.style.justifyContent = 'center';
          if (window.QRCode) {
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
              text: verifyUrl,
              width: 180,
              height: 180,
              colorDark: "#1b4a90",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.H
            });
            qrImage.replaceWith(qrContainer);
          }
        };
      } else {
        qrImage.style.display = 'none';
      }
    }

    const showToast = message => {
      const toast = document.createElement('div');
      toast.className = 'dashboard-toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2800);
    };

    async function createQRCodeDataURL(text) {
      return new Promise((resolve) => {
        if (!window.QRCode) {
          resolve(null);
          return;
        }

        const temp = document.createElement('div');
        temp.style.position = 'fixed';
        temp.style.left = '-9999px';
        temp.style.top = '-9999px';
        document.body.appendChild(temp);

        new QRCode(temp, {
          text,
          width: 240,
          height: 240,
          colorDark: '#1b4a90',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });

        setTimeout(() => {
          const canvas = temp.querySelector('canvas');
          const img = temp.querySelector('img');
          const dataUrl = canvas ? canvas.toDataURL('image/png') : img ? img.src : null;
          document.body.removeChild(temp);
          resolve(dataUrl);
        }, 120);
      });
    }

    const downloadPass = async () => {
      const verifyUrl = `http://127.0.0.1:5000/verify_pass/${encodeURIComponent(data.passId)}`;
      const qrDataUrl = await createQRCodeDataURL(verifyUrl);
      const hasPhoto = Boolean(data.photoDataUrl);
      const photoSvg = hasPhoto ?
        `<clipPath id="photoClip"><rect x="520" y="140" width="200" height="200" rx="28" ry="28"/></clipPath>
         <image href="${data.photoDataUrl}" x="520" y="140" width="200" height="200" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
        :
        `<rect x="520" y="140" width="200" height="200" rx="28" fill="rgba(255,255,255,0.16)"/>
         <text x="620" y="250" font-family="Inter, sans-serif" font-size="18" fill="#dce6ff" text-anchor="middle">No Photo</text>`;
      const qrSvg = qrDataUrl ?
        `<image href="${qrDataUrl}" x="520" y="360" width="180" height="180"/>`
        :
        `<rect x="520" y="360" width="180" height="180" rx="24" fill="#fff"/>
         <text x="610" y="450" font-family="Inter, sans-serif" font-size="14" fill="#1b4a90" text-anchor="middle">QR not available</text>`;

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg" width="900" height="520">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1b4a90"/><stop offset="100%" stop-color="#2a72cc"/></linearGradient>
          </defs>
          <rect width="900" height="520" rx="40" fill="url(#bg)"/>
          <text x="50" y="70" font-family="Inter, sans-serif" font-size="28" fill="#fff" font-weight="800">GUNI</text>
          <text x="50" y="110" font-family="Inter, sans-serif" font-size="20" fill="#dce6ff">Bus Pass</text>
          <rect x="50" y="130" width="300" height="120" rx="24" fill="rgba(255,255,255,0.12)"/>
          <text x="70" y="170" font-family="Inter, sans-serif" font-size="24" fill="#fff" font-weight="700">${data.fullname}</text>
          <text x="70" y="205" font-family="Inter, sans-serif" font-size="16" fill="#ebf4ff">Enrollment No: ${data.enrollment}</text>
          <text x="70" y="235" font-family="Inter, sans-serif" font-size="16" fill="#ebf4ff">Department: ${data.department}</text>
          <text x="50" y="290" font-family="Inter, sans-serif" font-size="18" fill="#fff">Pass ID</text>
          <text x="50" y="325" font-family="Inter, sans-serif" font-size="28" fill="#fff" font-weight="700">${data.passId}</text>
          <text x="50" y="380" font-family="Inter, sans-serif" font-size="18" fill="#fff">Valid Until</text>
          <text x="50" y="415" font-family="Inter, sans-serif" font-size="26" fill="#fff" font-weight="700">${data.validTill}</text>
          <text x="520" y="120" font-family="Inter, sans-serif" font-size="16" fill="#dce6ff">Photo</text>
          ${photoSvg}
          <text x="520" y="345" font-family="Inter, sans-serif" font-size="16" fill="#dce6ff">Scan QR for verification</text>
          ${qrSvg}
          <text x="520" y="70" font-family="Inter, sans-serif" font-size="16" fill="#dce6ff">Route</text>
          <text x="520" y="100" font-family="Inter, sans-serif" font-size="20" fill="#fff" font-weight="700">${data.routeTitle}</text>
        </svg>`;

      const blob = new Blob([svg], {type:'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.fullname.replace(/\s+/g,'_')}_bus_pass.svg`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      showToast('Pass downloaded successfully');
    };

    const sharePass = async () => {
      const message = `GUNI Digital Bus Pass\nName: ${data.fullname}\nEnroll: ${data.enrollment}\nRoute: ${data.routeTitle}\nValid Till: ${data.validTill}`;
      if (navigator.share) {
        try {
          await navigator.share({ title:'GUNI Bus Pass', text: message });
          showToast('Pass shared successfully');
          return;
        } catch (err) {
          console.warn(err);
        }
      }
      try {
        await navigator.clipboard.writeText(message);
        showToast('Pass details copied to clipboard');
      } catch (err) {
        alert('Share not available. Here is your pass info:\n\n' + message);
      }
    };

    document.getElementById('download-pass').addEventListener('click', downloadPass);
    document.getElementById('share-pass').addEventListener('click', sharePass);

    const downloadBtn = document.getElementById('download-pass');
    const shareBtn = document.getElementById('share-pass');
    const renewBtn = document.getElementById('renew-pass');
    const renewSideBtn = document.getElementById('renew-pass-side');

    downloadBtn.style.display = 'inline-block';
    shareBtn.style.display = 'inline-block';
    renewBtn.style.display = 'inline-block';
    if (renewSideBtn) renewSideBtn.style.display = 'inline-block';

    const goToRenew = () => window.location.href = 'renewpass.html';
    if (renewBtn) {
      renewBtn.addEventListener('click', goToRenew);
    }
    if (renewSideBtn) {
      renewSideBtn.addEventListener('click', goToRenew);
    }
  }
});