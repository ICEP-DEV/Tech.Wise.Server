
const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
const io = new Server(server, {
  cors: {
    origin: [
      'http://168.172.185.178:8081',  // First device IP
      'http://10.100.9.10:8081',      // Second device IP
      'http://localhost:8081'          // (Optional) for local testing on the same device
    ],
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"]
  }
});


  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on("joinRoom", (userId) => {
      const roomName = `customer_${userId}`;
      socket.join(roomName);
      console.log(`User with ID ${userId} joined room: ${roomName}`);
    });

    socket.on("acceptTrip", (tripId) => {
      io.emit("tripAccepted", { tripId });
    });

    socket.on("tripCancelled", (tripId) => {
      io.emit("tripCancelled", { tripId });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });

    socket.on("error", (error) => {
      console.error("Socket connection error:", error);
    });
  });

  return io;
};

// Function to get the io instance anywhere in the app
const getSocketInstance = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized!");
  }
  return io;
};

module.exports = { initializeSocket, getSocketInstance };