import fs from "fs";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user, pass } = req.body;

  const data = JSON.parse(fs.readFileSync("iml.json", "utf8"));
  const users = data.users;

  const found = users.find(u => u.UserID === user && u.PassID === pass);

  if (!found) {
    return res.json({ success: false, error: "Invalid login" });
  }

  res.json({
    success: true,
    UserID: found.UserID,
    Balance: found.Balance,
    Reversal: found.Reversal,
    TotalCorrect: found.TotalCorrect,
    TotalQuestions: found.TotalQuestions
  });
}
