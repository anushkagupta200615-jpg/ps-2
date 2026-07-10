import express from "express"
import http from "http"
import dotenv from "dotenv"
import { Server } from "socket.io"
import axios from "axios"
import jwt from "jsonwebtoken"
dotenv.config()

import mongoose from "mongoose"
import User from "./models/user.models.js"

await mongoose.connect(process.env.MONGODB_URL)
const app=express()
app.use(express.json())
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

io.on("connection", (socket) => {

  socket.on("identity", async (payload) => {
    try {
      const token = payload?.token;
      
      if (!token) {
        console.error("No token provided in identity event");
        return;
      }
      
      const secret = process.env.AUTH_SECRET;
      if (!secret) {
        console.error("AUTH_SECRET is missing");
        return;
      }

      const decoded = jwt.verify(token, secret);
      const userId = decoded.userId;

      socket.userId = userId;

      await User.findByIdAndUpdate(userId, {
        socketId: socket.id,
        isOnline: true
      });
    } catch (error) {
      console.error("Invalid token in identity event:", error.message);
    }
  })

// server.js — sab jagah ek hi format rakho

socket.on("join-booking", (bookingId) => {
  console.log("joining room:", `booking-${bookingId}`);
  socket.join(`booking-${bookingId}`);  // ← prefix add karo
});

socket.on("driver-location-update", (data) => {
  io.to(`booking-${data.bookingId}`)   // ✅ already sahi
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

    await User.findByIdAndUpdate(socket.userId, {
      location: {
        type: "Point",
        coordinates: [longitude, latitude]
      }
    })

  })
 

  socket.on("disconnect", async () => {

    if (!socket.userId) return

    await User.findByIdAndUpdate(socket.userId, {
      isOnline: false,
      socketId: null
    })

  })

})






server.listen(port,()=>{
    console.log("server started at",port)
})