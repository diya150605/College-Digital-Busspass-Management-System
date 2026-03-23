// Simple tab switching and validation + simulated OTP
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const forms = document.querySelectorAll('.form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-target');
      forms.forEach(f => {
        if (f.id === target) f.classList.add('active');
        else f.classList.remove('active');
      });
      window.scrollTo({ top: document.querySelector('.card').offsetTop - 20, behavior: 'smooth' });
    });
  });

  // Helper: show simple toast
  function toast(msg, ok = true) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.position = 'fixed';
    el.style.right = '18px';
    el.style.bottom = '18px';
    el.style.background = ok ? '#1f8b4f' : '#c23d3d';
    el.style.color = '#fff';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.18)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  // Login form
  document.getElementById('login').addEventListener('submit', (e) => {
    e.preventDefault();
    const mobile = document.getElementById('login-mobile').value.trim();
    if (!/^\d{10}$/.test(mobile)) {
      toast('Enter a valid 10-digit mobile number', false);
      return;
    }
    // Simulate OTP send
    toast('OTP sent to ' + mobile);
    // for demo, show prompt for OTP (not secure; demo only)
    setTimeout(() => {
      const otp = prompt('Enter the OTP (demo):\n(enter 1234 to simulate success)');
      if (otp === '1234') {
        toast('Login successful');
      } else {
        toast('Invalid OTP', false);
      }
    }, 600);
  });

  // Register form
  document.getElementById('register').addEventListener('submit', (e) => {
    e.preventDefault();
    const enrollment = document.getElementById('enrollment').value.trim();
    const name = document.getElementById('fullname').value.trim();
    const mobile = document.getElementById('reg-mobile').value.trim();
    const email = document.getElementById('email').value.trim();
    const aadhaar = document.getElementById('aadhaar').value.trim();
    const dept = document.getElementById('department').value;

    if (!enrollment) { toast('Enrollment number required', false); return; }
    if (!name) { toast('Full name required', false); return; }
    if (!/^\d{10}$/.test(mobile)) { toast('Enter valid 10-digit mobile', false); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Enter valid email', false); return; }
    if (!/^\d{12}$/.test(aadhaar)) { toast('Enter valid 12-digit Aadhaar', false); return; }
    if (!dept) { toast('Select department', false); return; }

    // Simulate register & OTP
    toast('Registration saved. OTP sent to ' + mobile);
    setTimeout(() => {
      const otp = prompt('Enter the OTP (demo):\n(enter 1234 to simulate success)');
      if (otp === '1234') {
        toast('Registration confirmed');
      } else {
        toast('Invalid OTP', false);
      }
    }, 600);
  });

});