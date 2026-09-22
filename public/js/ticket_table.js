
// متغيرات المعرض
let currentImages = [];
let currentImageIndex = 0;

// دالة فتح الصور المحسنة للجوال
function openGallery(images, title) {
  currentImages = images;
  currentImageIndex = 0;
  document.getElementById('galleryHead').innerHTML = title || '';
  updateGalleryImage();
  document.getElementById('imgGallery').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function updateGalleryImage() {
  if (currentImages.length > 0) {
    document.getElementById('galleryImg').src = currentImages[currentImageIndex];
  }
}

function changeImage(direction) {
  currentImageIndex += direction;
  if (currentImageIndex < 0) currentImageIndex = currentImages.length - 1;
  if (currentImageIndex >= currentImages.length) currentImageIndex = 0;
  updateGalleryImage();
}

function closeGallery(event) {
  if (!event || event.target === document.getElementById('imgGallery')) {
    document.getElementById('imgGallery').style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

// إنشاء صف الجدول المحسن
function createTableRow(row) {
  const images = [
    `../images/print/${row.images}_cam1.jpg`,
    `../images/print/${row.images}_cam2.jpg`,
    `../images/print/${row.images}_cam3.jpg`
  ];

  const gross = row.gross && !isNaN(parseFloat(row.gross)) ? parseFloat(row.gross).toLocaleString() : '0';
  const tare = row.tare && !isNaN(parseFloat(row.tare)) ? parseFloat(row.tare).toLocaleString() : '0';
  const net = row.net && !isNaN(parseFloat(row.net)) ? parseFloat(row.net).toLocaleString() : '0';
  // ✅ إضافة تنسيق للمبلغ المدفوع
  const paidAmount = row.paid_amount ? parseFloat(row.paid_amount).toLocaleString() : '0';

  return `
        <tr>
          <td>
            <div class="image-card" onclick='openGallery(${JSON.stringify(images)}, "صور التذكرة - ${row.number || ''}")'>
              <img src="${images[0]}" alt="صورة التذكرة" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2270%22 height=%2270%22 viewBox=%220 0 70 70%22><rect width=%2270%22 height=%2270%22 fill=%22%23f0f0f0%22/><text x=%2235%22 y=%2235%22 font-size=%2210%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22>لا توجد</text></svg>'">
            </div>
          </td>
          <td>
            <strong>${row.customer || 'غير محدد'}</strong>
            <br>
            <span class="badge bg-info mt-1">${row.type || 'غير محدد'}</span>
          </td>
          <td>
            <i class="fas fa-calendar"></i> ${row.date || '----/--/--'}
            <br>
            <i class="fas fa-clock"></i> ${row.time || '--:--'}
          </td>
          <td hidden>${row.sn || ''}</td>
          <td style="font-size: x-large;"><span class="badge bg-dark">${row.number || 'غير محدد'}</span></td>
          <td style="font-size: x-large;">${gross}</td>
          <td style="font-size: x-large;">${tare}</td>
          <td style="font-size: x-large;"><span class="">${net}</span></td>
          <td class="multi-line">
          ${row.note === 'معلق'
            ? `<span style="font-size: large;" class="badge bg-warning text-dark">${row.note}</span> ${row.tare2 || '-'}`
            : `${row.note || '-'} ${row.tare2 || '-'}`
          }
          </td>
<td style="font-size: x-large;">
  <span style="color: ${Number(row.paid_amount) < 30 ? 'red' : 'inherit'}; font-weight: ${Number(row.paid_amount) < 30 ? 'bold' : 'normal'};">
    ${Number(row.paid_amount) || 0} ج.م
  </span>
</td>          <td>
            <div class="action-buttons">
              ${row.note !== 'معلق'
      ? `<button class="action-btn btn-print" onclick='printTicket(${JSON.stringify(row).replace(/'/g, "&#39;")})'>
                    <i class="fas fa-print"></i>
                  </button>`
      : ''
    }
              <button class="action-btn btn-edit" onclick='openEdit(${JSON.stringify(row).replace(/'/g, "&#39;")})'>
                <i class="fas fa-edit"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
}

// متغيرات التحميل
let offset2 = 0;
const limit2 = 50;

async function fetchData2() {
  const searchValue = document.getElementById('searchValue').value;
  if (searchValue != '') {
    fetchData3();
    return;
  }
  try {
    const response = await fetch(`/get-data2?limit=${limit2}&offset=${offset2}`);
    const data = await response.json();
    const tableBody = document.querySelector('#data-table2 tbody');

    if (data.length === 0) {
      document.getElementById('load-more-btn2').style.display = 'none';
      return;
    }

    data.forEach(row => {
      tableBody.innerHTML += createTableRow(row);
    });

    offset2 += limit2;
    updateStats(data);
  } catch (error) {
    console.error('خطأ:', error);
  }
}

// تحديث الإحصائيات
function updateStats(data) {
  // document.getElementById('totalTickets').textContent = offset2;

  // const today = new Date();
  // const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  // const todayTickets = data.filter(row => row.date === todayStr).length;
  // document.getElementById('todayTickets').textContent = todayTickets;
   // تحديث إجمالي التذاكر المحملة
  document.getElementById('totalTickets').textContent = offset2;

  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  
  // تصفية البيانات لجلب تذاكر اليوم فقط (لضمان الدقة في الحساب)
  const todayTicketsData = data.filter(row => row.date === todayStr);
  
  // 1️⃣ تحديث عدد تذاكر اليوم
  document.getElementById('todayTickets').textContent = todayTicketsData.length;

  // 2️⃣ حساب إجمالي المبلغ المدفوع اليوم باستخدام reduce
  const totalPaid = todayTicketsData.reduce((sum, row) => {
      return sum + (parseFloat(row.paid_amount) || 0);
  }, 0);

  // 3️⃣ عرض الإجمالي منسقاً مع إضافة "ج.م"
  document.getElementById('todayTotalPaid').textContent = totalPaid.toLocaleString() + ' ج.م';
}
  

let offset3 = 0;
const limit3 = 10;
let searchValueOld = '';

async function fetchData3() {
  const searchType = document.getElementById('searchType').value;
  const searchValue = document.getElementById('searchValue').value.trim();
  const tableBody = document.querySelector('#data-table2 tbody');

  if (!searchValue) {
    alert('الرجاء إدخال قيمة للبحث');
    return;
  }

  try {
    // 🔹 لو بحث جديد → تصفير offset + الجدول
    if (searchValue !== searchValueOld) {
      offset3 = 0;
      tableBody.innerHTML = "";
    }

    const response = await fetch(`/get-data3?type=${encodeURIComponent(searchType)}&value=${encodeURIComponent(searchValue)}&limit=${limit3}&offset=${offset3}`);
    const data = await response.json();

    searchValueOld = searchValue;

    if (data.length === 0 && offset3 === 0) {
      document.getElementById('load-more-btn2').style.display = 'none';
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center text-danger p-4">
            <i class="fas fa-exclamation-circle fa-2x"></i>
            <br>لا توجد نتائج للبحث
          </td>
        </tr>`;
      return;
    }

    // 🔹 تحسين الأداء
    let rowsHTML = "";
    data.forEach(row => {
      rowsHTML += createTableRow(row);
    });
    tableBody.insertAdjacentHTML('beforeend', rowsHTML);

    offset3 += limit3;

    // 🔹 التحكم في زر تحميل المزيد
    const loadBtn = document.getElementById('load-more-btn2');
    if (data.length < limit3) {
      loadBtn.style.display = 'none';
    } else {
      loadBtn.style.display = 'block';
    }

    updateStats(data);

  } catch (error) {
    console.error('خطأ:', error);
  }
}
// دالة الطباعة المحسنة
function printTicket(row) {
  localStorage.setItem("ticketData", JSON.stringify(row));
  window.open("../ticket.html", "_blank", "width=650,height=650,scrollbars=yes");
  // location.reload();
}
function printTicket2(row) {
  localStorage.setItem("ticketData", JSON.stringify(row));
  window.open("../ticket2.html", "_blank", "width=650,height=650,scrollbars=yes");
  // location.reload();
}

// فتح التعديل
function openEdit(row) {
  loadCustomerList();
  //  extraWeightsTable = document.getElementById('extraWeightsTable');
  toggleExtraWeightTable(false);

  document.getElementById('editDate').value = row.date;
  document.getElementById('editTime').value = row.time;
  document.getElementById('editSn').value = row.sn;
  document.getElementById('editPrice').value = '';
  document.getElementById("totalTableBody").innerHTML = `<tr><td colspan="5" class="text-center text-muted">لا توجد بيانات</td></tr>`;
  document.getElementById('editId').value = row.id;
  document.getElementById('editNumber').value = row.number;
  // document.getElementById('editCustomer').value = row.customer;
    // 1️⃣ تعيين رقم السيارة أولاً
  const carNumber = row.number ? row.number.toString().trim() : '';
  document.getElementById('editNumber').value = carNumber;

  // 2️⃣ ✅ الكود الجديد: البحث عن العميل بناءً على رقم السيارة (n_car)
  const customerDatalist = document.getElementById('customers');
  const options = customerDatalist.querySelectorAll('option');
  let matchedCustomerName = '';

  for (let option of options) {
    const nCarValue = option.getAttribute('data-n-car') ? option.getAttribute('data-n-car').toString().trim() : '';
    if (nCarValue === carNumber && carNumber !== '') {
      matchedCustomerName = option.value;
      break; // إيقاف البحث عند إيجاد أول تطابق
    }
  }

  // 3️⃣ تعيين اسم العميل: إذا وجدنا تطابق نستخدمه، وإلا نستخدم الاسم الموجود في الصف (أو نتركه فارغاً)
  document.getElementById('editCustomer').value = matchedCustomerName || row.customer || '';

  document.getElementById('editType').value = row.type;
  document.getElementById('editGross').value = row.gross;
  document.getElementById('editTare').value = row.tare;
  document.getElementById('thirdWeight').value = row.tare2 || '';
  document.getElementById('editNet').value = row.net;
  document.getElementById('editNote').value = row.note || '';
  document.getElementById("modalImg2").src = `../images/print/${row.images}_cam1.jpg`;

    // ✅ أضف هذا السطر لملء حقل المبلغ المدفوع
  document.getElementById('edit_paid_amount').value = row.paid_amount || 0;


  document.getElementById('editTare2').innerText = document.getElementById('response').innerText;

  const modal = new bootstrap.Modal(document.getElementById('editModal'));
  modal.show();

  const noteInput = document.getElementById('editNote');
  const thirdWeight = document.getElementById('thirdWeight').value;
  const value = noteInput.value.trim();
  if (value === 'معلق') {
    checkbox.click();
  }
  if (thirdWeight > 0) {
    checkbox.click();
    document.getElementById('thirdWeight').value = thirdWeight;
    calculateFinalNet()
  }

}

// // تحديث البيانات
// async function updateData() {
//   // if (!confirm('هل أنت متأكد من حفظ التغييرات؟')) return;

//   const id = document.getElementById('editId').value;
//   const updatedData = {
//     number: document.getElementById('editNumber').value,
//     customer: document.getElementById('editCustomer').value,
//     type: document.getElementById('editType').value,
//     gross: document.getElementById('editGross').value,
//     tare: document.getElementById('editTare').value,
//     net: document.getElementById('editNet').value,
//     note: document.getElementById('editNote').value
//   };

//   try {
//     const response = await fetch(`/update-ticket/${id}`, {
//       method: 'PUT',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(updatedData)
//     });

//     if (response.ok) {
//       alert('✅ تم تحديث التذكرة بنجاح');
//       location.reload();
//     } else {
//       alert('❌ حدث خطأ أثناء التحديث');
//     }
//   } catch (error) {
//     console.error('خطأ:', error);
//     alert('❌ فشل الاتصال بالخادم');
//   }



//   if (print) {


//     if (response.ok) {
//       printTicket(updatedData);
//       const modalEl = document.getElementById('editModal');
//       const modal = bootstrap.Modal.getInstance(modalEl);
//       modal.hide();
//     }

//   }
// }


// تحديث وطباعة
async function updateAndPrint(toPrint = false ,printdir =false) {
  // ✅ أهم سطر
  document.activeElement.blur();
  const id = document.getElementById('editId').value;
  const noteInput = document.getElementById('editNote');
  const value = noteInput.value.trim();


  const updatedData = {
    date: document.getElementById('editDate').value,
    time: document.getElementById('editTime').value,
    sn: document.getElementById('editSn').value,
    number: document.getElementById('editNumber').value,
    customer: document.getElementById('editCustomer').value,
    type: document.getElementById('editType').value,
    gross: document.getElementById('editGross').value,
    tare: document.getElementById('editTare').value,
    tare2: document.getElementById('thirdWeight').value || '',
    net: document.getElementById('editNet').value,
    note: toPrint ? (value === 'معلق' ? '' : value) : 'معلق',    // note: (toPrint) ? (document.getElementById('editNote').value == 'معلق') ? '' : document.getElementById('editNote').value : 'معلق',
    price: document.getElementById('editPrice').value,
    unitWeight: getUnitWeight(document.getElementById('editType').value),
     // ✅ أضف هذا السطر لإرسال المبلغ المدفوع
    paid_amount: parseFloat(document.getElementById('edit_paid_amount').value) || 0
  
  };
  if (checkbox.checked && document.getElementById('thirdWeight').value > 0) {
    // if (document.getElementById('extraEditType').value=="") {
    //    alert('يجب ادخال النوع للوزن الثاني');
    //    return;
    // }
    updatedData.extraWeightsTable = {
      secondWeight: secondWeight,
      extraEditType: document.getElementById('extraEditType').value,
      thirdWeight: document.getElementById('thirdWeight').value,
      finalNetWeight: document.getElementById('finalNetWeight').innerText,
      totalNetWeight: document.getElementById('totalNetWeight').innerText
    };



  }
  try {
    const response = await fetch(`/update-ticket/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });

    if (response.ok) {
      if (toPrint) {
      if (printdir) { printTicket2(updatedData);}else{  printTicket(updatedData);}

      
        const modalEl = document.getElementById('editModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        location.reload();
      } else {

        // alert('✅ تم تحديث التذكرة بنجاح');
        location.reload();

      }
    } else {
      alert('❌ حدث خطأ أثناء التحديث');
    }

  } catch (error) {
    console.error(error);
    alert('❌ خطأ في الاتصال بالسيرفر');
  }
}

// مسح البحث
function clearSearch() {
  document.getElementById('searchValue').value = "";
  document.querySelector('#data-table2 tbody').innerHTML = "";
  offset2 = 0;
  fetchData2();
}

// دوال مساعدة
function getUnitWeight(typeName) {
  const typesList = document.getElementById("types");
  const option = Array.from(typesList.options).find(o => o.value === typeName);
  return option ? parseFloat(option.dataset.unit) : 0;
}

// حساب الإجمالي
const typeInput = document.getElementById("editType");
const priceInput = document.getElementById("editPrice");
const netInput = document.getElementById("editNet");

function calculateTotal() {
  const net = parseFloat(netInput?.value);
  const price = parseFloat(priceInput?.value);
  const unitWeight = getUnitWeight(typeInput?.value);

  if (!net || !price || !unitWeight) {
    document.getElementById("totalTableBody").innerHTML = `<tr><td colspan="5" class="text-center text-muted">لا توجد بيانات</td></tr>`;
    return;
  }

  const units = Math.floor(net / unitWeight);
  const remain = net % unitWeight;
  const total = (net * price) / unitWeight;

  document.getElementById("totalTableBody").innerHTML = `
        <tr>
          <td>${price}</td>
          <td>${unitWeight}</td>
          <td>${units}</td>
          <td>${remain.toFixed(2)}</td>
          <td class="fw-bold text-success">${total.toFixed(2)} جنيه</td>
        </tr>
      `;
}

typeInput?.addEventListener("input", calculateTotal);
priceInput?.addEventListener("input", calculateTotal);
netInput?.addEventListener("input", calculateTotal);

// أحداث Socket.IO
const socket = io();

socket.on('printer:new', (row) => {
  console.log('🆕 تذكرة جديدة:', row);

  setTimeout(() => {
    const tableBody = document.querySelector('#data-table2 tbody');
    const newRowHtml = createTableRow(row);
    tableBody.insertAdjacentHTML('afterbegin', newRowHtml);

    setTimeout(() => {
      openEdit(row);
         // إخفاء الإشعار بعد 10 ثواني
      document.getElementById('idToast').innerHTML ='';
    }, 300);


  console.log('a2');

      // إخفاء الإشعار بعد 10 ثواني
      setTimeout(() => {
        const toast = document.getElementById(toastId);
        if (toast) {
          toast.style.animation = 'fadeOut 0.3s ease';
          setTimeout(() => {
            if (toast.parentNode) toast.remove();
          }, 300);
        }
      }, 500);
      }, 500);
});




    socket.on('id:new', (row) => {
      setTimeout(() => {

        showIdNotification(row);

      }, 500);
    });

    // دالة عرض الإشعار
    function showIdNotification(row) {
      // التحقق من وجود عنصر toast في الصفحة
      let toastEl = document.getElementById('idToast');

      // إذا لم يكن موجوداً، قم بإنشائه
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'idToast';
        toastEl.className = 'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
        toastEl.style.zIndex = '200';
        document.body.appendChild(toastEl);
      }

      // إنشاء محتوى الإشعار
      const toastId = 'liveToast_' + Date.now();
      const toastHtml = `
            <div id="${toastId}" class="toast show" role="alert" aria-live="assertive" aria-atomic="true" style="min-width: 350px; background: white; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border-right: 5px solid #17a2b8;">
                <div class="toast-header" style="background: linear-gradient(45deg, #17a2b8, #0d6efd); color: white; border-radius: 15px 15px 0 0; padding: 12px;">
                    <i class="fas fa-truck me-2"></i>
                    <strong class="me-auto">🚛 سيارة جديدة على الميزان</strong>
                    <small>الآن</small>
                    <button type="button" class="btn-close btn-close-white" onclick="this.closest('.toast').remove()" aria-label="Close"></button>
                </div>
                <div class="toast-body" style="padding: 15px;">
                    <div class="row g-2">
                        <div class="col-6">
                            <img src="../images/sensor/${row.images}_cam1.jpg" 
                                 style="width: 100%; height: 130px; border-radius: 10px; object-fit: cover; border: 3px solid #17a2b8; cursor: pointer;"
                                 onclick="openImg(this.src, 'رقم: ${row.NE} - الوزن: ${row.gross} كجم')">
                        </div>
                        <div class="col-6">
                            <div class="mb-2">
                                <span class="badge bg-info fs-6 p-2 w-100">رقم: ${row.NE}</span>
                            </div>
                            <div class="mb-2">
                                <span class="badge bg-warning fs-6 p-2 w-100">الوزن: ${row.gross} كجم</span>
                            </div>
                            <div class="d-flex gap-1">
                                <img src="../images/sensor/${row.images}_cam2.jpg" 
                                     style="width: 45px; height: 45px; border-radius: 8px; object-fit: cover; border: 2px solid #17a2b8; cursor: pointer;"
                                     onclick="openImg(this.src, 'رقم: ${row.NE} - الوزن: ${row.gross} كجم')">
                                <img src="../images/sensor/${row.images}_cam3.jpg" 
                                     style="width: 45px; height: 45px; border-radius: 8px; object-fit: cover; border: 2px solid #17a2b8; cursor: pointer;"
                                     onclick="openImg(this.src, 'رقم: ${row.NE} - الوزن: ${row.gross} كجم')">
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 d-flex gap-2">
                        <button class="btn btn-sm btn-primary flex-grow-1" onclick="openImg('images/sensor/${row.images}_cam1.jpg', 'رقم: ${row.NE} - الوزن: ${row.gross} كجم'); this.closest('.toast').remove()">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button class="btn btn-sm btn-secondary flex-grow-1" onclick="this.closest('.toast').remove()">
                            <i class="fas fa-times"></i> إغلاق
                        </button>
                    </div>
                </div>
            </div>
        `;

      toastEl.innerHTML = toastHtml;
console.log('a1');

      // إخفاء الإشعار بعد 10 ثواني
      setTimeout(() => {
        const toast = document.getElementById(toastId);
        if (toast) {
          toast.style.animation = 'fadeOut 0.3s ease';
          setTimeout(() => {
            if (toast.parentNode) toast.remove();
          }, 300);
        }
      }, 10000);
    }
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


socket.on('play-audio', (fileName) => {
  const audioPlayer = document.getElementById('audioPlayer');
  audioPlayer.src = `/audio/${fileName}`;
  audioPlayer.play().catch(e => console.log('تشغيل الصوت:', e));
});

socket.on('response', (data) => {
  if (data && data.toUpperCase() === "OK") {
    sendCommand('p');
  }
  if (data && data.toUpperCase() === "??") {
    sendCommand('p');
  }
  if (data && data.length >= 11 && data.length <= 12) {
    let cleanData = data
      .replace(/\x02/g, '')   // حذف رمز البداية
      // .replace(/KG/g, '')     // حذف KG
      .trim();                // حذف المسافات

    document.getElementById('response').innerHTML = cleanData;
    // document.getElementById('response').innerHTML = `${data}`;
  } else {
    if (data && data.slice(-2).toUpperCase() === "NE") {
      document.getElementById('response11').innerHTML = `<span class="badge bg-primary">${data}</span>`;
    }
    else {

      // else {
      // document.getElementById('response11').innerHTML = `<span class="badge bg-primary">---</span>`;
      // }
    }

  }
});
// إرسال أمر
function sendCommand(command) {
  const type = document.getElementById('type').value;
  const customer = document.getElementById('customer').value;

  fetch(`/send-command?command=${command}&type=${encodeURIComponent(type)}&customer=${encodeURIComponent(customer)}`)
    .then(() => {
      if (command == 'Kid' || command == 'KPRINT') {
        document.getElementById('type').value = '';
        document.getElementById('customer').value = '';
      }
    })
    .catch(error => console.error("Error sending command:", error));
}
// اختصار لوحة المفاتيح للمودال
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;

  const modalEl = document.getElementById('editModal');
  if (!modalEl.classList.contains('show')) return;
  if (e.target.tagName === 'TEXTAREA') return;

  e.preventDefault();
  updateAndPrint(true);
});

// تحميل البيانات عند بدء التشغيل
window.onload = function () {
  fetchData2();

  // منع التكبير التلقائي في iOS
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('touchstart', function () {
      this.style.fontSize = '16px';
    });
  });
};

document.getElementById('load-more-btn2')?.addEventListener('click', fetchData2);

//////////////////////////////////////////////////////


// متغيرات لتخزين الأوزان
let firstWeight = 0;
let secondWeight = 0;
let netWeight = 0;
const checkbox = document.getElementById('addExtraWeight');
const extraWeightsTable = document.getElementById('extraWeightsTable');
// دالة لإظهار/إخفاء جدول الأوزان الإضافية
function toggleExtraWeightTable(command = true) {

  if (checkbox.checked) {
    // تحديث الأوزان المعروضة
    if (!command) { checkbox.click() } else {
      updateDisplayWeights();
      extraWeightsTable.style.display = 'block';

      // إضافة تأثير حركي
      extraWeightsTable.style.animation = 'slideDown 0.3s ease';
    }


  } else {

    extraWeightsTable.style.display = 'none';

  }

}

// دالة تحديث عرض الأوزان
function updateDisplayWeights() {
  // الحصول على الأوزان من حقول التعديل
  firstWeight = parseFloat(document.getElementById('editGross')?.value) || 0;
  secondWeight = parseFloat(document.getElementById('editTare')?.value) || 0;
  netWeight = parseFloat(document.getElementById('editNet')?.value) || 0;

  // عرض الأوزان في الجدول
  document.getElementById('displayFirstWeight').textContent = firstWeight ? firstWeight.toLocaleString() + ' كجم' : '---';
  document.getElementById('displaySecondWeight').textContent = secondWeight ? secondWeight.toLocaleString() + ' كجم' : '---';
  document.getElementById('displayNetWeight').textContent = netWeight ? netWeight.toLocaleString() + ' كجم' : '---';

  let text = document.getElementById('editTare2')?.innerText || "";

  // إزالة أي شيء ليس رقم أو نقطة
  let cleanText = text.replace(/[^\d.]/g, '');

  let editTare2Value = parseFloat(cleanText) || 0;

  document.getElementById('thirdWeight').value = editTare2Value;

  document.getElementById('finalNetWeight').textContent = '---';
  document.getElementById('totalNetWeight').textContent = '---';

  calculateFinalNet()
}

// دالة حساب الصافي النهائي
function calculateFinalNet() {
  const third = parseFloat(document.getElementById('thirdWeight').value) || 0;

  // حساب الصافي النهائي (يمكن تعديل المعادلة حسب احتياجك)
  // هنا نفترض أن الوزن الثالث والرابع هما أوزان إضافية تطرح من الصافي الأصلي
  const finalNet = third > 0 ? secondWeight - third : 0;
  const finalTotal = netWeight + finalNet;

  document.getElementById('finalNetWeight').textContent = finalNet ? finalNet.toLocaleString() + ' كجم' : '---';
  document.getElementById('totalNetWeight').textContent = finalTotal ? finalTotal.toLocaleString() + ' كجم' : '---';
}


// دالة مساعدة لإظهار الإشعارات
function showToast(message, type = 'info') {
  // يمكنك استخدام دالة toast الموجودة في مشروعك
  alert(message); // استبدلها بدالة toast الخاصة بك
}

// إضافة CSS للحركة
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .table-sm td, .table-sm th {
    padding: 0.5rem;
    vertical-align: middle;
  }
  
  .form-control-sm {
    height: 35px;
    font-size: 0.9rem;
  }
`;
document.head.appendChild(style);

//////////////////////////////////////////////////////
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

    // if (!btn) {

    //   btn = document.createElement("button");
    //   btn.type = "button";
    //   btn.className = "clear-btn";
    //   btn.innerHTML = "✖";

    //   btn.onclick = () => {
    //     input.value = "";
    //     btn.style.display = "none";
    //     input.focus();
    //   };

    //   wrapper.appendChild(btn);
    // }

    // function toggleBtn() {
    //   // btn.style.display = input.value ? "flex" : "none";
    // }

    // input.addEventListener("input", toggleBtn);

    // /* مهم: يظهر الزر إذا كان الحقل يحتوي نص مسبقاً */
    // toggleBtn();

  });

}

/* عند تحميل الصفحة */
document.addEventListener("DOMContentLoaded", initClearButtons);

/* عند فتح المودال */
document.getElementById("editModal")
  .addEventListener("shown.bs.modal", initClearButtons);
//////////////////////////////////////////////////////


// ==================== تحميل العملاء والأنواع ====================

// تحميل قائمة العملاء
async function loadCustomerList() {
  try {
    const response = await fetch('/api/customers');
    if (!response.ok) throw new Error('فشل في تحميل العملاء');

    const data = await response.json();
    console.log('✅ تم تحميل العملاء:', data.length);

    const datalist = document.getElementById('customers');
    if (datalist) {
      if (data.length > 0) {
             datalist.innerHTML = data.map(c => `<option value="${c.name}" data-n-car="${c.n_car || ''}">`).join('');

        // datalist.innerHTML = data.map(c => `<option value="${c.name}--${c.n_car}-">`).join('');
      } else {
        // بيانات افتراضية
        datalist.innerHTML = `
                        <option value="الحاج خالد عبد السلام">
                        <option value="عماد نوح">
                        <option value="محمد الصندفاوي">
                        <option value="محمد منصور">
                        <option value="محمود نصير">
                    `;
      }
    }
  } catch (error) {
    console.error('❌ خطأ في تحميل العملاء:', error);
    // بيانات افتراضية في حالة الخطأ
    const datalist = document.getElementById('customers');
    if (datalist) {
      datalist.innerHTML = `
                  <option value="الحاج خالد عبد السلام">
                      <option value="عماد نوح">
                      <option value="محمد الصندفاوي">
                      <option value="محمد منصور">
                      <option value="محمود نصير">
                      <option value="هاني عبد الباعث">
                      <option value="الشحات عبد الباعث">
                      <option value="احمد علي">
                      <option value="علي محروس">
                   
                `;
    }
  }
}
//  window.onload = function () {
//     console.log('🚀 بدء تحميل الصفحة...');

//     // تحميل العملاء والأنواع
//     loadCustomerList();
//   }








function printTicketDir() {
  const row = {
    date: document.getElementById('editDate').value,
    time: document.getElementById('editTime').value,
    sn: document.getElementById('editSn').value,
    number: document.getElementById('editNumber').value,
    customer: document.getElementById('editCustomer').value,
    type: document.getElementById('editType').value,
    gross: document.getElementById('editGross').value,
    tare: document.getElementById('editTare').value,
    tare2: document.getElementById('thirdWeight').value || '',
    net: document.getElementById('editNet').value,
    price: document.getElementById('editPrice').value,
    unitWeight: getUnitWeight(document.getElementById('editType').value)
  };
  localStorage.setItem("ticketData", JSON.stringify(row));
  const data = JSON.parse(localStorage.getItem("ticketData"));
  console.log(data);

  fetch('/print-ticket', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(res => {
      alert("تمت الطباعة ✅");
    })
    .catch(err => {
      alert("خطأ في الطباعة ❌");
      console.error(err);
    });
}




// دالة تعيين المبلغ المدفوع
function setPaidAmount(amount) {
    document.getElementById('edit_paid_amount').value = amount;
    // تأثير بصري عند الضغط
    showToast(`تم تعيين المبلغ المدفوع: ${amount} جنيه`, 'success');
}

// // دالة تعيين الملحوظة والوزن الإضافي
// function setNote(noteText, tareValue) {
//     document.getElementById('editNote').value = noteText;
//     document.getElementById('thirdWeight').value = tareValue;
    
//     // تفعيل checkbox الأوزان الإضافية إذا لم يكن مفعل
//     if (!checkbox.checked) {
//         checkbox.checked = true;
//         toggleExtraWeightTable(true);
//     }
    
//     // تحديث الحسابات
//     calculateFinalNet();
//     updateDisplayWeights();
    
//     // تأثير بصري
//     showToast(`تم تعيين: ${noteText} - الوزن الإضافي: ${tareValue} كجم`, 'success');
// }

// دالة عرض الإشعارات (إذا لم تكن موجودة)
function showToast(message, type = 'info') {
    // يمكنك استخدام bootstrap toast أو alert بسيط
    const toastBody = document.getElementById('toastBody');
    if (toastBody) {
        toastBody.innerHTML = message;
        const toastEl = document.getElementById('liveToast');
        const toast = new bootstrap.Toast(toastEl, { delay: 2000 });
        toast.show();
    } else {
        // fallback
        console.log(message);
    }
}




// دالة إضافة عميل جديد بسرعة من نافذة التعديل
async function addNewCustomer(editNumber) {
  const customerName = prompt("أدخل اسم العميل الجديد:");
  const n_car = prompt("أدخل رقم السياره  :",editNumber);
  
  // التحقق من أن المستخدم أدخل اسماً وليس إلغاء
  if (!customerName || customerName.trim() === "") return;

  try {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: customerName.trim(), 
        phone: '', 
        n_car: n_car, 
        notes: '' 
      })
    });

    if (response.ok) {
      const result = await response.json();
      
      // إشعار نجاح (يمكنك استبداله بـ Toast إذا كنت تفضله)
      const toastBody = document.getElementById('toastBody');
      if (toastBody) {
        toastBody.innerHTML = `✅ تم إضافة العميل: ${customerName.trim()} بنجاح`;
        const toastEl = document.getElementById('liveToast');
        const toast = new bootstrap.Toast(toastEl, { delay: 2000 });
        toast.show();
      } else {
        alert('✅ تم إضافة العميل بنجاح');
      }
      
      // 1️⃣ إعادة تحميل قائمة العملاء لتحديث الـ datalist
      await loadCustomerList();
      
      // 2️⃣ تعيين العميل الجديد تلقائياً في حقل العميل
      document.getElementById('editCustomer').value = customerName.trim();
      
    } else {
      const err = await response.json();
      alert('❌ فشل في إضافة العميل: ' + (err.error || 'خطأ غير معروف'));
    }
  } catch (error) {
    console.error('خطأ:', error);
    alert('❌ حدث خطأ أثناء الاتصال بالخادم');
  }
}

















