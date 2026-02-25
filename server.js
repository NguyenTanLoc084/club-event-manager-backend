const express = require("express");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Sử dụng path.join và __dirname để cố định đường dẫn trên server
const DATA_DIR = path.join(__dirname, "data");
const EVENT_FILE = path.join(DATA_DIR, "events.json");
const PARTICIPANT_FILE = path.join(DATA_DIR, "participants.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

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
    console.error(`Lỗi đọc file ${file}:`, err);
    return defaultData; // Trả về mảng rỗng nếu file lỗi để app không bị sập
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

// 1. Tạo sự kiện
app.post("/api/event", (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tạo sự kiện" });
  }
});

// 2. Lấy danh sách sự kiện
app.get("/api/events", (req, res) => {
  res.json(readJSON(EVENT_FILE));
});

// 3. Đăng ký tham gia + Tạo mã QR
app.post("/api/register", async (req, res) => {
  try {
    const list = readJSON(PARTICIPANT_FILE);
    const ticket = "TICKET_" + Date.now();

    const participant = {
      fullname: req.body.fullname,
      gender: req.body.gender,
      course: req.body.course,
      email: req.body.email,
      eventId: req.body.eventId,
      ticket,
      checkedIn: false,
      registeredAt: new Date().toISOString()
    };

    list.push(participant);
    writeJSON(PARTICIPANT_FILE, list);

    // Tạo QR code từ mã vé
    const qr = await QRCode.toDataURL(ticket);
    
    console.log(`Đăng ký mới: ${participant.fullname} - Vé: ${ticket}`);
    res.json({ qr, ticket });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ message: "Không thể hoàn tất đăng ký" });
  }
});

// 4. Danh sách người tham gia
app.get("/api/participants", (req, res) => {
  res.json(readJSON(PARTICIPANT_FILE));
});

// 5. Check-in sự kiện
app.post("/api/checkin", (req, res) => {
  const list = readJSON(PARTICIPANT_FILE);
  const p = list.find(x => x.ticket === req.body.ticket);

  if (!p) {
    return res.status(404).json({ message: "Mã vé không hợp lệ" });
  }

  if (p.checkedIn) {
    return res.json({ message: "Vé này đã được check-in trước đó" });
  }

  p.checkedIn = true;
  writeJSON(PARTICIPANT_FILE, list);
  res.json({ message: "Check-in thành công!" });
});

// 6. Gửi Feedback
app.post("/api/feedback", (req, res) => {
  const list = readJSON(FEEDBACK_FILE);
  const newFeedback = {
    ...req.body,
    timestamp: new Date().toISOString()
  };
  list.push(newFeedback);
  writeJSON(FEEDBACK_FILE, list);
  res.json({ message: "Cảm ơn bạn đã gửi phản hồi!" });
});

/* ========== KHỞI CHẠY SERVER ========== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📁 Thư mục lưu trữ: ${DATA_DIR}`);
});