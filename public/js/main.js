/* ======================================
   CONFIG
====================================== */
// Tự động nhận diện URL: Nếu chạy local thì dùng localhost, 
// nếu chạy trên server thì tự lấy domain của server đó.
const BASE_URL = window.location.origin; 

/* ======================================
   CREATE EVENT
====================================== */
function handleCreateEvent() {
  const name = document.getElementById("name")?.value;
  const time = document.getElementById("time")?.value;
  const location = document.getElementById("location")?.value;

  if (!name || !time || !location) {
    alert("Vui lòng nhập đầy đủ thông tin sự kiện");
    return;
  }

  fetch(`${BASE_URL}/api/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, time, location })
  })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi server");
      return data;
    })
    .then(data => {
      alert(data.message);
      // Reset form
      ["name", "time", "location"].forEach(id => {
          const el = document.getElementById(id);
          if(el) el.value = "";
      });
    })
    .catch((err) => {
      console.error(err);
      alert("Lỗi: " + err.message);
    });
}

/* ======================================
   LOAD EVENTS (REGISTER PAGE)
====================================== */
function loadEvents() {
  const select = document.getElementById("eventId");
  if (!select) return;

  fetch(`${BASE_URL}/api/events`)
    .then(res => res.json())
    .then(events => {
      if (!events || !events.length) {
        select.innerHTML = `<option value="">Chưa có sự kiện nào</option>`;
        return;
      }

      select.innerHTML = events.map(e =>
        `<option value="${e.id}">
          ${e.name} – ${e.location}
        </option>`
      ).join("");
    })
    .catch(err => console.error("Không thể tải danh sách sự kiện:", err));
}

// Chỉ load khi script chạy
loadEvents();

/* ======================================
   REGISTER PARTICIPANT
====================================== */
/* Tìm đúng đoạn này và sửa tên hàm cho khớp */
function handleUserRegistration() { 
  const qrImg = document.getElementById("qr");
  const fullname = document.getElementById("fullname")?.value;
  const gender = document.getElementById("gender")?.value;
  const course = document.getElementById("course")?.value;
  const email = document.getElementById("email")?.value;
  const eventId = document.getElementById("eventId")?.value;

  if (!fullname || !gender || !course || !email || !eventId) {
    alert("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  fetch(`${BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullname, gender, course, email, eventId })
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("qr").src = data.qr;
      document.getElementById("qr-container").style.display = "block"; // Hiện vùng chứa QR
      alert("Đăng ký thành công!");
    })
    .catch(err => alert("Lỗi kết nối server"));
    fetch(`${BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullname, gender, course, email, eventId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.qr) {
        qrImg.src = data.qr; // Gán dữ liệu Base64 vào ảnh
        qrImg.style.display = "block"; // Hiển thị ảnh lên
        alert("Đăng ký thành công!");
      }
    })
    .catch(err => {
      console.error("Lỗi hiện QR:", err);
    });
}

/* ======================================
   LOAD PARTICIPANTS (ADMIN)
====================================== */
function loadParticipants() {
  const list = document.getElementById("list");
  if (!list) return;

  fetch(`${BASE_URL}/api/participants`)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.length) {
        list.innerHTML = `<tr><td colspan="5" class="text-center">Chưa có người đăng ký</td></tr>`;
        return;
      }

      list.innerHTML = data.map(p => `
        <tr>
          <td>${p.fullname}</td>
          <td>${p.gender}</td>
          <td>${p.course}</td>
          <td><code>${p.ticket}</code></td>
          <td>
            ${p.checkedIn
              ? '<span class="badge bg-success">Đã check-in</span>'
              : '<span class="badge bg-secondary">Chưa check-in</span>'}
          </td>
        </tr>
      `).join("");
    })
    .catch(err => console.error("Lỗi tải danh sách người tham gia:", err));
}

// Tự động load nếu đang ở trang admin
if(document.getElementById("list")) {
    loadParticipants();
}

/* ======================================
   CHECK-IN
====================================== */
function checkin() {
  const ticket = document.getElementById("ticket")?.value;
  if (!ticket) {
    alert("Vui lòng nhập hoặc quét mã vé");
    return;
  }

  fetch(`${BASE_URL}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      document.getElementById("ticket").value = "";
      loadParticipants(); // Refresh danh sách
    })
    .catch(err => alert("Lỗi kết nối check-in"));
}

/* ======================================
   FEEDBACK
====================================== */
function sendFeedback() {
  const name = document.getElementById("name")?.value;
  const content = document.getElementById("content")?.value;

  if (!content) {
    alert("Vui lòng nhập nội dung phản hồi");
    return;
  }

  fetch(`${BASE_URL}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, content })
  })
    .then(res => {
      if(res.ok) {
          alert("Cảm ơn bạn đã gửi feedback!");
          document.getElementById("name").value = "";
          document.getElementById("content").value = "";
      }
    })
    .catch(err => alert("Không thể gửi feedback"));
}