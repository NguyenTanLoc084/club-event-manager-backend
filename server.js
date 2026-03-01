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

// 1. Admin Login
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
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

// 4. Đăng ký tham gia & Gửi Email vé QR (Đã sửa lỗi)
app.post("/api/register", async (req, res) => {
  try {
    const list = readJSON(PARTICIPANT_FILE);
    const { fullname, email, eventId, gender, course } = req.body;
    
    const ticket = "TICKET_" + Date.now();
    const participant = {
      fullname,
      email,
      eventId,
      gender,
      course,
      ticket,
      checkedIn: false,
      registeredAt: new Date().toISOString()
    };
    
    list.push(participant);
    writeJSON(PARTICIPANT_FILE, list);

    // Tạo mã QR
    const qr = await QRCode.toDataURL(ticket);

    // Gửi Email vé
    const mailOptions = {
      from: '"CLB Event Manager" <agileteam782@gmail.com>',
      to: email,
      subject: `🎫 Vé tham gia sự kiện của ${fullname}`,
      html: `
        <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
          <h2 style="color: #1e3c72;">Chúc mừng bạn đã đăng ký thành công!</h2>
          <p>Chào <b>${fullname}</b>,</p>
          <p>Mã vé của bạn là: <span style="font-size: 18px; color: #d9534f; font-weight: bold;">${ticket}</span></p>
          <p>Vui lòng trình mã QR bên dưới tại cửa hội trường để check-in:</p>
          <div style="text-align: center;">
            <img src="${qr}" alt="QR Code Ticket" style="width: 200px; height: 200px;" />
          </div>
          <p style="color: #777; font-size: 12px;">Hẹn gặp bạn tại sự kiện!</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) console.error("Lỗi gửi mail vé:", err);
      else console.log(`Đã gửi vé đến email: ${email}`);
    });

    // Trả về kết quả cho trình duyệt hiển thị
    res.json({ qr, ticket });

  } catch (error) {
    console.error("Lỗi API Register:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi đăng ký" });
  }
});

// 5. Check-in
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

// 6. Gửi Feedback
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

// 7. Lấy danh sách người tham gia
app.get("/api/participants", (req, res) => {
  res.json(readJSON(PARTICIPANT_FILE));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
