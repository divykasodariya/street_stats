import { io } from "socket.io-client";

// ✅ Connect once, reuse everywhere
const socket = io("http://localhost:5000", {
  withCredentials: true,
});

export default socket;
