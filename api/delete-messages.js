import { PrismaClient } from "@prisma/client"; // Or use any ORM/Database client
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      // Delete messages older than 1 day
      await prisma.message.deleteMany({
        where: {
          timestamp: {
            lt: oneDayAgo,
          },
        },
      });

      res.status(200).json({ message: "Messages older than 1 day deleted." });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete old messages." });
    }
  } else {
    res.status(405).json({ error: "Method not allowed." });
  }
}
