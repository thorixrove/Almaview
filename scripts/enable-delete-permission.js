// Jalankan sekali saja: node scripts/enable-delete-permission.js
// Pastikan sudah install: npm install stream-chat

const { StreamChat } = require("stream-chat");

// Ambil dari .env project Anda (Dashboard -> API keys)
const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const apiSecret = process.env.STREAM_SECRET_KEY;

if (!apiKey || !apiSecret) {
  console.error(
    "❌ NEXT_PUBLIC_STREAM_API_KEY atau STREAM_SECRET_KEY belum diset di environment."
  );
  process.exit(1);
}

const serverClient = StreamChat.getInstance(apiKey, apiSecret);

async function main() {
  console.log("Mengambil grants channel type 'messaging' saat ini...");
  const { grants } = await serverClient.getChannelType("messaging");
  console.log("Grants sebelumnya:", JSON.stringify(grants, null, 2));

  console.log("\nMemperbarui grants 'channel_member'...");
  await serverClient.updateChannelType("messaging", {
    grants: {
      channel_member: [
        "read-channel",
        "create-message",
        "update-message-owner",
        "delete-message-owner", // <- ini yang mengizinkan hapus pesan sendiri
        "create-reaction",
        "create-attachment",
        "upload-attachment",
        "run-message-action",
        "create-reply",
      ],
    },
  });

  console.log("✅ Berhasil! Role 'channel_member' sekarang bisa menghapus pesan sendiri.");

  const { grants: updated } = await serverClient.getChannelType("messaging");
  console.log("\nGrants setelah update:", JSON.stringify(updated, null, 2));
}

main().catch((err) => {
  console.error("❌ Terjadi error:", err);
  process.exit(1);
});