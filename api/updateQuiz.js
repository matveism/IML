import fs from "fs";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user, correct, total, earned } = req.body;

  const data = JSON.parse(fs.readFileSync("iml.json", "utf8"));
  const users = data.users;

  const u = users.find(x => x.UserID === user);
  if (!u) return res.json({ success: false, error: "User not found" });

  u.Balance += Number(earned);
  u.TotalCorrect += Number(correct);
  u.TotalQuestions += Number(total);

  u.Reversal = u.TotalQuestions > 0
    ? Number(((u.TotalCorrect / u.TotalQuestions) * 100).toFixed(2))
    : 0;

  fs.writeFileSync("iml.json", JSON.stringify(data, null, 2));

  res.json({
    success: true,
    Balance: u.Balance,
    Reversal: u.Reversal,
    TotalCorrect: u.TotalCorrect,
    TotalQuestions: u.TotalQuestions
  });
}
