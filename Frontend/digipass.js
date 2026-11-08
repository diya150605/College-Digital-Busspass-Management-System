// Simple tab switching and validation + simulated OTP
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const forms = document.querySelectorAll('.form');

  // If the user is already logged in, do not show the student login page again.
  if (localStorage.getItem('guni_authenticated') === 'true') {
    window.location.href = 'homepage.html';
    return;
  }

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

  // Registration link click handler
  const regLink = document.querySelector('.reg-link');
  if (regLink) {
    regLink.addEventListener('click', (e) => {
      e.preventDefault();
      const registerTab = document.querySelector('.tab[data-target="register"]');
      if (registerTab) {
        registerTab.click();
      }
    });
  }

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

  const collegeEmailRegex = /^[^\s@]+@gnu\.ac\.in$/i;
  const onlyDigits = value => value.replace(/\D/g, '');

  // Login form
  document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      toast('College email is required', false);
      return;
    }
    if (!collegeEmailRegex.test(email)) {
      toast('Only @gnu.ac.in college email is accepted', false);
      return;
    }
    try {
      const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.success) {
        toast(data.message);
        // Prompt for OTP
        setTimeout(() => {
          const otp = prompt('Enter the OTP:');
          if (otp) {
            verifyOTP(email, otp);
          }
        }, 600);
      } else {
        toast(data.message, false);
      }
    } catch (error) {
      toast('Error connecting to server', false);
    }
  });

  // Register form
  document.getElementById('reg-mobile').addEventListener('input', (e) => {
    e.target.value = onlyDigits(e.target.value).slice(0, 10);
  });
  document.getElementById('enrollment').addEventListener('input', (e) => {
    e.target.value = onlyDigits(e.target.value);
  });

  document.getElementById('register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const enrollmentInput = document.getElementById('enrollment');
    const enrollment = enrollmentInput.value.trim();
    const name = document.getElementById('fullname').value.trim();
    const mobileField = document.getElementById('reg-mobile');
    const mobile = onlyDigits(mobileField.value.trim());
    const email = document.getElementById('email').value.trim();
    const dept = document.getElementById('department').value;

    if (!enrollment) { toast('Enrollment number required', false); return; }
    if (!/^\d+$/.test(enrollment)) { toast('Enrollment must contain only digits', false); return; }
    if (!name) { toast('Full name required', false); return; }
    if (!/^\d{10}$/.test(mobile)) { toast('Enter valid 10-digit mobile', false); return; }
    if (!collegeEmailRegex.test(email)) { toast('Only @gnu.ac.in college email is accepted', false); return; }
    if (!dept) { toast('Select department', false); return; }

    // Keep cleaned numeric values in the fields
    mobileField.value = mobile;
    enrollmentInput.value = enrollment;

    try {
      const response = await fetch('http://127.0.0.1:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollment, name, mobile, email, dept })
      });
      const data = await response.json();
      if (data.success) {
        toast(data.message);
        // Prompt for OTP
        setTimeout(() => {
          const otp = prompt('Enter the OTP:');
          if (otp) {
            verifyOTP(email, otp);
          }
        }, 600);
      } else {
        toast(data.message, false);
      }
    } catch (error) {
      toast('Error connecting to server', false);
    }
  });

  // Function to verify OTP
  async function verifyOTP(email, otp) {
    try {
      const response = await fetch('http://127.0.0.1:5000/verify_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json();
      if (data.success) {
        toast(data.message);
        // Store user data in localStorage
        console.log('[DigiPass] Storing user data:', data.user);
        localStorage.setItem('guni_user', JSON.stringify(data.user));
        localStorage.setItem('guni_authenticated', 'true');
        // Redirect to applypass page after successful login
        setTimeout(() => {
          window.location.href = 'applypass.html';
        }, 1500);
      } else {
        toast(data.message, false);
      }
    } catch (error) {
      toast('Error verifying OTP', false);
    }
  }

});