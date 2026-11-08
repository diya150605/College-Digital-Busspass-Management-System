document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'applicationData';

  function getCurrentUserEnrollment() {
    const raw = localStorage.getItem('guni_user');
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      return user.enrollment || null;
    } catch (err) {
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

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  if (!requireLogin()) return;

  let storedData = null;
  const storedKey = getApplicationDataStorageKey();
  try {
    const stored = localStorage.getItem(storedKey);
    if (stored) {
      storedData = JSON.parse(stored);
    }
  } catch (err) {
    console.warn('Unable to parse application data', err);
  }

  const fallback = {
    fullname: 'Student',
    enrollment: '23012021001',
    routeTitle: 'Ahmedabad - GUNI',
    validTill: '2025-06-30',
    passId: 'BP-2026-000001',
    issueDate: '2024-06-30'
  };

  const data = {
    ...fallback,
    ...(storedData || {})
  };

  const currentValid = parseDate(data.validTill) || parseDate(data.issueDate) || new Date();
  const currentValidText = formatDate(currentValid);

  const passIdEl = document.getElementById('renew-pass-id');
  const routeEl = document.getElementById('renew-pass-route');
  const validEl = document.getElementById('renew-pass-valid');
  const currentValidEl = document.getElementById('current-valid-display');
  const newValidEl = document.getElementById('new-valid-display');
  const summaryMonths = document.getElementById('summary-months');
  const summaryFee = document.getElementById('summary-fee');
  const summaryTotal = document.getElementById('summary-total');

  passIdEl.textContent = data.passId;
  routeEl.textContent = data.routeTitle || 'Route 1: Ahmedabad - GUNI';
  validEl.textContent = currentValidText;
  currentValidEl.textContent = currentValidText;

  const pricing = {
    6: 18000,
    12: 35000
  };

  function calculateNewValidity(months) {
    const nextDate = new Date(currentValid.getTime());
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate;
  }

  function updateSummary(months) {
    const amount = pricing[months];
    summaryMonths.textContent = months;
    summaryFee.textContent = `₹${amount.toLocaleString('en-IN')}`;
    summaryTotal.textContent = `₹${(amount + 200).toLocaleString('en-IN')}`;
    const newValidDate = calculateNewValidity(months);
    newValidEl.textContent = formatDate(newValidDate);
    return newValidDate;
  }

  let selectedMonths = 12;
  let newValidDate = updateSummary(selectedMonths);

  const planCards = document.querySelectorAll('.plan-card');
  planCards.forEach(card => {
    const months = Number(card.dataset.months);
    const input = card.querySelector('input');

    function selectPlan() {
      selectedMonths = months;
      newValidDate = updateSummary(months);
      planCards.forEach(item => item.classList.toggle('selected', item === card));
      input.checked = true;
    }

    card.addEventListener('click', selectPlan);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectPlan();
      }
    });
  });

  document.getElementById('cancel-renew').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });

  document.getElementById('proceed-payment').addEventListener('click', () => {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    const saved = storedData || {};
    saved.validTill = newValidDate.toISOString().split('T')[0];
    saved.paymentCompleted = true;
    saved.status = 'Renewed';
    saved.renewalPeriod = selectedMonths;
    localStorage.setItem(storedKey, JSON.stringify(saved));

    const toast = document.createElement('div');
    toast.className = 'renew-toast';
    toast.textContent = `Payment successful via ${paymentMethod ? paymentMethod.value.toUpperCase() : 'selected method'}. Your pass is renewed.`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
      window.location.href = 'dashboard.html';
    }, 1800);
  });
});
