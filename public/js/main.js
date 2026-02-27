const BASE_URL = window.location.origin; 
function showLoader(show = true) {
    const loader = document.getElementById("loader");
    if (loader) {
        if (show) loader.classList.remove("loader-hidden");
        else loader.classList.add("loader-hidden");
    }
}
function handleCreateEvent() {
    const name = document.getElementById("eventName")?.value;
    const time = document.getElementById("eventTime")?.value;
    const location = document.getElementById("eventLocation")?.value;

    if (!name || !time || !location) {
        alert("Vui lòng nhập đầy đủ thông tin sự kiện nhé!");
        return;
    }

    showLoader(true);
    fetch(`${BASE_URL}/api/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, time, location })
    })
    .then(res => res.json())
    .then(data => {
        showLoader(false);
        alert("Tạo sự kiện thành công!");
        window.location.href = "admin.html"; 
    })
    .catch(err => {
        showLoader(false);
        alert("Lỗi server: " + err.message);
    });
}
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
            select.innerHTML = events.map(e => `<option value="${e.id}">${e.name} – ${e.location}</option>`).join("");
        });
}
function loadParticipants() {
    const list = document.getElementById("participantList"); 
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
                    <td class="fw-semibold">${p.fullname}</td>
                    <td>${p.course}</td>
                    <td>${p.email}</td>
                    <td>
                        <span class="badge ${p.checkedIn ? 'bg-success' : 'bg-warning text-dark'}">
                            ${p.checkedIn ? '✅ Đã Check-in' : '⏳ Chờ tham gia'}
                        </span>
                    </td>
                    <td class="small text-muted">${new Date(p.registeredAt).toLocaleDateString('vi-VN')}</td>
                </tr>
            `).reverse().join("");
        });
}

document.addEventListener("DOMContentLoaded", () => {
    loadEvents();
    loadParticipants();
});
function handleUserRegistration() { 
    const fullname = document.getElementById("fullname")?.value;
    const gender = document.getElementById("gender")?.value;
    const course = document.getElementById("course")?.value;
    const email = document.getElementById("email")?.value;
    const eventId = document.getElementById("eventId")?.value;

    if (!fullname || !email || !eventId) {
        alert("Vui lòng nhập đầy đủ thông tin đăng ký");
        return;
    }

    showLoader(true);
    fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname, gender, course, email, eventId })
    })
    .then(res => res.json())
    .then(data => {
        showLoader(false);
        const qrImg = document.getElementById("qr");
        const qrContainer = document.getElementById("qr-container");
        if (qrImg && qrContainer) {
            qrImg.src = data.qr;
            qrImg.style.display = "inline-block";
            qrContainer.style.display = "block";
        }
        alert("Đăng ký thành công! Hãy lưu lại mã QR nhé.");
    })
    .catch(() => {
        showLoader(false);
        alert("Lỗi kết nối server");
    });
}
function sendFeedback() {
    const name = document.getElementById("fbName")?.value;
    const content = document.getElementById("fbContent")?.value;

    if (!content) {
        alert("Bạn chưa nhập nội dung phản hồi");
        return;
    }

    showLoader(true);
    fetch(`${BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content })
    })
    .then(res => {
        showLoader(false);
        if(res.ok) {
            alert("Cảm ơn Team đã nhận được phản hồi!");
            window.location.href = "index.html";
        }
    })
    .catch(() => {
        showLoader(false);
        alert("Không thể gửi phản hồi");
    });
}

