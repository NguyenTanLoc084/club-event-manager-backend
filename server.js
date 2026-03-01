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

const DATA_DIR = path.join(__dirname, "data");
const EVENT_FILE = path.join(DATA_DIR, "events.json");
const PARTICIPANT_FILE = path.join(DATA_DIR, "participants.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

const ADMIN_EMAIL = "agileteam782@gmail.com";
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'agileteam782@gmail.com',
    pass: 'rhgbdsqxmuczfqin' 
  }
});

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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

// --- API HỆ THỐNG ---

// 1. Admin Login
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === "123456") {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
  }
});

// 2. Tạo sự kiện mới
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

// 4. Cập nhật thông tin sự kiện
app.post("/api/event/update/:id", (req, res) => {
    const events = readJSON(EVENT_FILE);
    const index = events.findIndex(ev => ev.id === req.params.id);
    if (index !== -1) {
        events[index] = { ...events[index], ...req.body };
        writeJSON(EVENT_FILE, events);
        res.json({ message: "Cập nhật thành công!" });
    } else {
        res.status(404).json({ message: "Không tìm thấy sự kiện" });
    }
});

// 5. Xóa sự kiện
app.post("/api/event/delete/:id", (req, res) => {
    let events = readJSON(EVENT_FILE);
    const originalLength = events.length;
    events = events.filter(ev => ev.id !== req.params.id);
    
    if (events.length < originalLength) {
        writeJSON(EVENT_FILE, events);
        res.json({ message: "Đã xóa sự kiện thành công" });
    } else {
        res.status(404).json({ message: "Không tìm thấy sự kiện để xóa" });
    }
});

// 6. Đăng ký tham gia & Gửi Email vé QR
app.post("/api/register", async (req, res) => {
  try {
    const list = readJSON(PARTICIPANT_FILE);
    const { fullname, email, eventId, gender, course } = req.body;
    
    const ticket = "TICKET_" + Date.now();
    const participant = {
      fullname, email, eventId, gender, course, ticket,
      checkedIn: false,
      registeredAt: new Date().toISOString()
    };
    
    list.push(participant);
    writeJSON(PARTICIPANT_FILE, list);

    const qr = await QRCode.toDataURL(ticket);

    const mailOptions = {
      from: '"CLB Event Manager" <agileteam782@gmail.com>',
      to: email,
      subject: `🎫 Vé tham gia sự kiện của ${fullname}`,
      html: `
        <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
          <h2 style="color: #1e3c72;">Chúc mừng bạn đã đăng ký thành công!</h2>
          <p>Chào <b>${fullname}</b>,</p>
          <p>Mã vé: <span style="font-size: 18px; color: #d9534f; font-weight: bold;">${ticket}</span></p>
          <div style="text-align: center; margin: 20px 0;">
            <img src="${qr}" alt="QR Code Ticket" style="width: 200px; height: 200px;" />
          </div>
          <p style="color: #777; font-size: 12px;">Vui lòng trình mã này khi đến sự kiện để check-in.</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) console.error("Lỗi gửi mail:", err);
    });

    res.json({ qr, ticket });

  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi đăng ký" });
  }
});

// 7. Check-in sự kiện
app.post("/api/checkin", (req, res) => {
  const list = readJSON(PARTICIPANT_FILE);
  const p = list.find(x => x.ticket === req.body.ticket);
  
  if (!p) return res.status(404).json({ message: "Mã vé không tồn tại!" });
  if (p.checkedIn) return res.json({ message: "Vé này đã được check-in rồi." });
  
  p.checkedIn = true;
  p.checkInTime = new Date().toISOString();
  writeJSON(PARTICIPANT_FILE, list);
  res.json({ message: "Check-in thành công! Chào mừng bạn." });
});

// 8. Gửi Feedback
app.post("/api/feedback", (req, res) => {
  const { name, content } = req.body;
  const list = readJSON(FEEDBACK_FILE);
  list.push({ ...req.body, timestamp: new Date().toISOString() });
  writeJSON(FEEDBACK_FILE, list);

  const mailOptions = {
    from: '"Hệ thống CLB" <agileteam782@gmail.com>',
    to: ADMIN_EMAIL,
    subject: `📩 Feedback mới từ ${name || 'Người dùng'}`,
    text: `Người gửi: ${name}\nNội dung: ${content}`
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) console.log("Lỗi gửi mail feedback:", err);
  });

  res.json({ message: "Cảm ơn bạn đã phản hồi!" });
});

// 9. Lấy danh sách người tham gia (Dùng cho Dashboard Admin)
app.get("/api/participants", (req, res) => {
  res.json(readJSON(PARTICIPANT_FILE));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
