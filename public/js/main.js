// public/js/main.js - دوال مشتركة لجميع الصفحات

// ==================== Socket.IO ====================
const socket = io();

// استقبال الردود
socket.on('response', (data) => {
  if (data && data.length >= 11 && data.length <= 12) {
    const weightDisplay = document.getElementById('response');
    if (weightDisplay) {
      weightDisplay.innerHTML = `${data} <span class="weight-unit">كجم</span>`;
    }
  } else {
    if (data && data.slice(-2).toUpperCase() === "NE") {
      const resp11 = document.getElementById('response11');
      if (resp11) {
        resp11.innerHTML = `<span class="badge bg-primary fs-6">${data}</span>`;
      }
    }
  }
  
  if (data && (data.toUpperCase() === "OK" || data.toUpperCase() === "??")) {
    sendCommand('p');
  }
});

// استقبال التذاكر الجديدة
socket.on('printer:new', (row) => {
  setTimeout(() => {
    const toastBody = document.getElementById("toastBody");
    const toastImg1 = document.getElementById("toastImg1");
    const toastImg2 = document.getElementById("toastImg2");
    const toastImg3 = document.getElementById("toastImg3");
    
    if (toastBody) toastBody.innerHTML = `تذكرة جديدة - رقم: ${row.number} - الوزن: ${row.net} كجم`;
    if (toastImg1) toastImg1.src = `images/print/${row.images}_cam1.jpg`;
    if (toastImg2) toastImg2.src = `images/print/${row.images}_cam2.jpg`;
    if (toastImg3) toastImg3.src = `images/print/${row.images}_cam3.jpg`;
    
    const toastEl = document.getElementById('liveToast');
    if (toastEl) {
      const toast = new bootstrap.Toast(toastEl, { delay: 10000 });
      toast.show();
    }
    
    // فتح التعديل بعد فترة قصيرة
    if (typeof window.openEdit === 'function') {
      setTimeout(() => window.openEdit(row), 800);
    }
  }, 500);
});

// استقبال بيانات السيارات الجديدة
socket.on('id:new', (row) => {
  if (row.NE) {
    setTimeout(() => {
      const toastBody = document.getElementById("toastBody");
      const toastImg1 = document.getElementById("toastImg1");
      const toastImg2 = document.getElementById("toastImg2");
      const toastImg3 = document.getElementById("toastImg3");
      
      if (toastBody) toastBody.innerHTML = `تم إضافة سيارة جديدة ${row.NE} (الوزن: ${row.gross})`;
      if (toastImg1) toastImg1.src = `images/sensor/${row.images}_cam1.jpg`;
      if (toastImg2) toastImg2.src = `images/sensor/${row.images}_cam2.jpg`;
      if (toastImg3) toastImg3.src = `images/sensor/${row.images}_cam3.jpg`;
      
      const toastEl = document.getElementById('liveToast');
      if (toastEl) {
        const toast = new bootstrap.Toast(toastEl, { delay: 10000 });
        toast.show();
      }
    }, 500);
  }
});

// استقبال الصوت
socket.on('play-audio', (fileName) => {
  const audioPlayer = document.getElementById('audioPlayer');
  if (audioPlayer) {
    audioPlayer.src = `/audio/${fileName}`;
    audioPlayer.play().catch(e => console.log('تشغيل الصوت:', e));
  }
});

// ==================== دوال مشتركة ====================
function sendCommand(command) {
  const type = document.getElementById('type')?.value || '';
  const customer = document.getElementById('customer')?.value || '';

  fetch(`/send-command?command=${command}&type=${encodeURIComponent(type)}&customer=${encodeURIComponent(customer)}`)
    .then(() => {
      if (command == 'Kid' || command == 'KPRINT') {
        if (document.getElementById('type')) document.getElementById('type').value = '';
        if (document.getElementById('customer')) document.getElementById('customer').value = '';
      }
    })
    .catch(error => console.error("Error sending command:", error));
}

function initClearButtons() {
  document.querySelectorAll("input.modern-input").forEach(input => {
    let wrapper = input.parentElement;
    if (!wrapper.classList.contains("input-wrapper")) {
      wrapper = document.createElement("div");
      wrapper.className = "input-wrapper";
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
    }

    let btn = wrapper.querySelector(".clear-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "clear-btn";
      btn.innerHTML = "✖";
      btn.onclick = () => {
        input.value = "";
        btn.style.display = "none";
        input.focus();
      };
      wrapper.appendChild(btn);
    }

    function toggleBtn() {
      btn.style.display = input.value ? "flex" : "none";
    }

    input.addEventListener("input", toggleBtn);
    toggleBtn();
  });
}