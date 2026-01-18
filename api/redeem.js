import fs from "fs";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user, cost } = req.body;

  const data = JSON.parse(fs.readFileSync("iml.json", "utf8"));
  const users = data.users;

  const u = users.find(x => x.UserID === user);
  if (!u) return res.json({ success: false, error: "User not found" });

  if (u.Balance < cost) {
    return res.json({ success: false, error: "Not enough balance" });
  }

  u.Balance -= Number(cost);

  fs.writeFileSync("iml.json", JSON.stringify(data, null, 2));

  res.json({
    success: true,
    newBalance: u.Balance,
    rewardCode: "IML-" + Math.floor(10000 + Math.random() * 90000)
  });
}
