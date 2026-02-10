const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const socket = require("socket.io");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URL)

.then(() => {
    console.log("--> Đã kết nối MongoDB thành công!");
})
.catch((err) => {
    console.log("--> Lỗi kết nối DB:", err.message);
});

// Tạo server
const server = app.listen(PORT, () => {
    console.log(`--> Server đang chạy tại port ${PORT}`);
});

// Cấu hình Socket.io (Quan trọng cho chat)

const io = socket(server, {
  cors: {
    origin: "*", // Allow all origins for easier deployment debugging
    methods: ["GET", "POST"],
    credentials: true,
  },
});

global.onlineUsers = new Map();

// Lắng nghe kết nối realtime
io.on("connection", (socket) => {
    // Mỗi khi có người vào web, server sẽ gán cho họ 1 cái ID (socket.id)
    global.chatSocket = socket;
    
    socket.on("add-user", (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.broadcast.emit("user-online", userId);
        socket.emit("online-users-list", Array.from(onlineUsers.keys()));
    });

    socket.on("send-msg", (data) => {
        const sendUserSocket = onlineUsers.get(data.to);
        if (sendUserSocket) {
            // Forward message along with ID and sender info
            const msgData = { ...data.msg, id: data.id, from: data.from };
            socket.to(sendUserSocket).emit("msg-recieve", msgData);
        }
    });

    socket.on("typing", (data) => {
        const sendUserSocket = onlineUsers.get(data.to);
        if (sendUserSocket) {
            socket.to(sendUserSocket).emit("typing-recieve", data.from);
        }
    });

    socket.on("stop-typing", (data) => {
        const sendUserSocket = onlineUsers.get(data.to);
        if (sendUserSocket) {
            socket.to(sendUserSocket).emit("stop-typing-recieve", data.from);
        }
    });

    // Video Call Events
    socket.on("call-user", (data) => {
        const userToCall = onlineUsers.get(data.userToCall);
        if (userToCall) {
            io.to(userToCall).emit("call-user", { 
                signal: data.signalData, 
                from: data.from, 
                name: data.name 
            });
        }
    });

    socket.on("answer-call", (data) => {
        const caller = onlineUsers.get(data.to);
        if (caller) {
            io.to(caller).emit("call-accepted", data.signal);
        }
    });

    socket.on("end-call", (data) => {
        const userToEnd = onlineUsers.get(data.to);
        if (userToEnd) {
            io.to(userToEnd).emit("end-call");
        }
    });

    socket.on("add-reaction", (data) => {
        const sendUserSocket = onlineUsers.get(data.to);
        if (sendUserSocket) {
            socket.to(sendUserSocket).emit("reaction-recieve", data);
        }
    });

    // Khi người dùng ngắt kết nối
    socket.on("disconnect", () => {
        let disconnectedUserId;
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                disconnectedUserId = userId;
                break;
            }
        }
        if (disconnectedUserId) {
            onlineUsers.delete(disconnectedUserId);
            socket.broadcast.emit("user-offline", disconnectedUserId);
        }
    });
});
