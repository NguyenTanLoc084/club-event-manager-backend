const express = require("express");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Cấu hình đường dẫn dữ liệu
const DATA_DIR = path.join(__dirname, "data");
const EVENT_FILE = path.join(DATA_DIR, "events.json");
const PARTICIPANT_FILE = path.join(DATA_DIR, "participants.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

// Cấu hình Admin & Email
const ADMIN_EMAIL = "agileteam782@gmail.com";
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'agileteam782@gmail.com',
    pass: 'NHAP_MA_APP_PASSWORD_16_SO_TAI_DAY' // Lộc thay mã App Password vào đây
  }
});

/* ===== ĐẢM BẢO THƯ MỤC DATA TỒN TẠI ===== */
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/* ========== HÀM HỖ TRỢ (HELPERS) ========== */
function readJSON(file, defaultData = []) {
  if (!fs.existsSync(file)) return defaultData;
  try {
    const data = fs.readFileSync(file, "utf8");
    return data ? JSON.parse(data) : defaultData;
  } catch (err) {
    return defaultData;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Lỗi ghi file ${file}:`, err);
  }
}

/* ========== API ROUTES ========== */

// 1. Đăng nhập Admin
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  // Khớp với thông tin Admin bạn đã chọn
  if (email === ADMIN_EMAIL && password === "123456") {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
  }
});

// 2. Tạo sự kiện
app.post("/api/event", (req, res) => {
  const events = readJSON(EVENT_FILE);
  const event = {
    id: "EVT_" + Date.now(),
    name: req.body.name,
    time: req.body.time,
    location: req.body.location,
    createdAt: new Date().toISOString()
  };
  events.push(event);
  writeJSON(EVENT_FILE, events);
  res.json({ message: "Tạo sự kiện thành công", event });
});

// 3. Lấy danh sách sự kiện
app.get("/api/events", (req, res) => {
  res.json(readJSON(EVENT_FILE));
});

// 4. Đăng ký tham gia + Tạo mã QR
app.post("/api/register", async (req, res) => {
  try {
    const list = readJSON(PARTICIPANT_FILE);
    const ticket = "TICKET_" + Date.now();
    const participant = {
      ...req.body,
      ticket,
      checkedIn: false,
      registeredAt: new Date().toISOString()
    };
    list.push(participant);
    writeJSON(PARTICIPANT_FILE, list);

    const qr = await QRCode.toDataURL(ticket);
    res.json({ qr, ticket });
  } catch (error) {
    res.status(500).json({ message: "Lỗi đăng ký" });
  }
});

// 5. Check-in (Dành cho cả Admin và Khách tự check-in)
app.post("/api/checkin", (req, res) => {
  const list = readJSON(PARTICIPANT_FILE);
  const p = list.find(x => x.ticket === req.body.ticket);
  
  if (!p) return res.status(404).json({ message: "Mã vé không tồn tại hoặc không hợp lệ!" });
  if (p.checkedIn) return res.json({ message: "Vé này đã được check-in trước đó rồi." });
  
  p.checkedIn = true;
  p.checkInTime = new Date().toISOString();
  writeJSON(PARTICIPANT_FILE, list);
  res.json({ message: "Check-in thành công! Chào mừng bạn." });
});

// 6. Gửi Feedback + Gửi Email thông báo
app.post("/api/feedback", (req, res) => {
  const { name, content } = req.body;
  const list = readJSON(FEEDBACK_FILE);
  list.push({ ...req.body, timestamp: new Date().toISOString() });
  writeJSON(FEEDBACK_FILE, list);

  // Gửi Mail thông báo về agileteam782@gmail.com
  const mailOptions = {
    from: '"Hệ thống CLB" <agileteam782@gmail.com>',
    to: ADMIN_EMAIL,
    subject: `📩 Feedback mới từ ${name || 'Người dùng'}`,
    text: `Bạn có phản hồi mới từ hệ thống:\n\nNgười gửi: ${name}\nNội dung: ${content}`
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) console.log("Lỗi gửi mail:", err);
    else console.log("Đã gửi email thông báo feedback!");
  });

  res.json({ message: "Cảm ơn bạn đã phản hồi!" });
});

// 7. Lấy danh sách người tham gia (Chỉ dành cho trang Admin)
app.get("/api/participants", (req, res) => {
  res.json(readJSON(PARTICIPANT_FILE));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
