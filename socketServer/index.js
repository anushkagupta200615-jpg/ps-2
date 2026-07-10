import express from "express"
import http from "http"
import dotenv from "dotenv"
import { Server } from "socket.io"
import axios from "axios"

dotenv.config()

import mongoose from "mongoose"
import User from "./models/user.models.js"
import rateLimit from "express-rate-limit"

await mongoose.connect(process.env.MONGODB_URL)
const app=express()
app.use(express.json())

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(apiLimiter)
const server=http.createServer(app)
const port=process.env.PORT || 5000

const io=new Server(server,{
    cors:{
        origin:process.env.NEXT_BASE_URL
    }
})



app.post("/emit", async (req, res) => {
  const { userId, event, data } = req.body;

  try {
    const user = await User.findById(userId);

    if (user?.socketId) {
      io.to(user.socketId).emit(event, data);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});
const locationUpdateTimestamps = new Map();
const driverLocationUpdateTimestamps = new Map();

io.on("connection", (socket) => {

  socket.on("identity", async (userId) => {

    socket.userId = userId

    await User.findByIdAndUpdate(userId, {
      socketId: socket.id,
      isOnline: true
    })

  })

// server.js — sab jagah ek hi format rakho

socket.on("join-booking", (bookingId) => {
  console.log("joining room:", `booking-${bookingId}`);
  socket.join(`booking-${bookingId}`);  // ← prefix add karo
});

socket.on("driver-location-update", (data) => {
  const now = Date.now();
  const key = socket.userId || data.bookingId;
  const lastUpdate = driverLocationUpdateTimestamps.get(key) || 0;
  
  if (now - lastUpdate < 1000) return;
  driverLocationUpdateTimestamps.set(key, now);

  io.to(`booking-${data.bookingId}`)
    .emit("driver-location", {
      latitude: data.latitude,
      longitude: data.longitude,
      status: "arriving"
    });
});

socket.on("chat-message", (msg) => {
  console.log("chat to room:", `booking-${msg.rideId}`);
  io.to(`booking-${msg.rideId}`).emit("chat-message", msg);  // ← prefix add karo
});

  socket.on("update-location", async ({ latitude, longitude }) => {

    if (!socket.userId) return

    const now = Date.now();
    const lastUpdate = locationUpdateTimestamps.get(socket.userId) || 0;
    
    if (now - lastUpdate < 1000) return;
    locationUpdateTimestamps.set(socket.userId, now);

    await User.findByIdAndUpdate(socket.userId, {
      location: {
        type: "Point",
        coordinates: [longitude, latitude]
      }
    })

  })
 

  socket.on("disconnect", async () => {

    if (!socket.userId) return

    locationUpdateTimestamps.delete(socket.userId);
    driverLocationUpdateTimestamps.delete(socket.userId);

    await User.findByIdAndUpdate(socket.userId, {
      isOnline: false,
      socketId: null
    })

  })

})






server.listen(port,()=>{
    console.log("server started at",port)
})