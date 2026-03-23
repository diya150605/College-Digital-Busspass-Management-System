// Populate routes table and gallery to match screenshots
document.addEventListener('DOMContentLoaded', () => {
  const routes = [
    { id:1, title:'Ahmedabad - Ganpat University - Ahmedabad', fee:35000 },
    { id:2, title:'Gandhinagar - Ganpat University - Gandhinagar', fee:28000 },
    { id:3, title:'Mehsana - Ganpat University - Mehsana', fee:12000 },
    { id:4, title:'Palanpur - Ganpat University - Palanpur', fee:18000 },
    { id:5, title:'Patan - Ganpat University - Patan', fee:15000 },
    { id:6, title:'Visnagar - Ganpat University - Visnagar', fee:8000 },
    { id:7, title:'Unjha - Ganpat University - Unjha', fee:10000 },
    { id:8, title:'Siddhpur - Ganpat University - Siddhpur', fee:12000 },
    { id:9, title:'Kadi - Ganpat University - Kadi', fee:10000 },
    { id:10, title:'Kalol - Ganpat University - Kalol', fee:14000 },
    { id:11, title:'Himmatnagar - Ganpat University - Himmatnagar', fee:16000 },
    { id:12, title:'Idar - Ganpat University - Idar', fee:20000 },
    { id:13, title:'Modasa - Ganpat University - Modasa', fee:22000 },
    { id:14, title:'Vijapur - Ganpat University - Vijapur', fee:11000 },
    { id:15, title:'Kheralu - Ganpat University - Kheralu', fee:9000 },
    { id:16, title:'Chanasma - Ganpat University - Chanasma', fee:13000 },
    { id:17, title:'Satlasana - Ganpat University - Satlasana', fee:14000 },
    { id:18, title:'Radhanpur - Ganpat University - Radhanpur', fee:19000 },
    { id:19, title:'Deesa - Ganpat University - Deesa', fee:21000 },
    { id:20, title:'Dhanera - Ganpat University - Dhanera', fee:23000 },
    { id:21, title:'Vav - Ganpat University - Vav', fee:25000 },
    { id:22, title:'Tharad - Ganpat University - Tharad', fee:24000 },
    { id:23, title:'Danta - Ganpat University - Danta', fee:26000 },
  ];

  const tbody = document.getElementById('routes-body');
  routes.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="num"><div class="num-circle">${r.id}</div></td>
      <td>${r.title}</td>
      <td class="fee">₹${r.fee.toLocaleString()}</td>
    `;
    // row hover highlight for interactivity
    tr.addEventListener('click', () => {
      // briefly highlight row
      tbody.querySelectorAll('tr').forEach(row => row.classList.remove('selected'));
      tr.classList.add('selected');
      setTimeout(() => tr.classList.remove('selected'), 1200);
    });
    tbody.appendChild(tr);
  });

  // Populate gallery with local bus images
  const gallery = document.getElementById('gallery-row');
  const images = ['bus1.jpg','bus2.jpg','bus3.jpg','bus4.jpg','bus5.jpg'];
  images.forEach((img,i) => {
    const imgEl = document.createElement('img');
    imgEl.src = img;
    imgEl.alt = `bus-${i+1}`;
    gallery.appendChild(imgEl);
  });
});