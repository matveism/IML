// ==== CONFIG ==========================================================
// Google Apps Script Web App URL
var API_BASE_URL = "https://script.google.com/macros/s/AKfycbxWE8QgOCifiQzjWJLAaX4Vz-BPYIKEuHDNnY7fAQgVTM-c0gMVlygSeG1V50IRS1eeLA/exec";

var BASE_RATE = 10;
var POINTS_PER_CORRECT = 5;
var REVERSAL_THRESHOLD = 3;
var HOLD_DAYS = 15;

// ==== STATE ===========================================================
var state = {
  rows: [],
  user: null,
  pts: 0,
  reversal: 0,
  correct: 0,
  attempts: 0,
  loaded: false,
  answeredQuestions: [],
  sessionId: localStorage.getItem('iml_sessionId') || null,
  currentPage: 'home',
  transactions: [],
  shopItems: [],
  leaderboard: []
};
var refs = {};

// ==== UTILS ===========================================================
function el(t, c, txt) {
  var e = document.createElement(t);
  if (c) e.className = c;
  if (txt !== undefined && txt !== null) e.textContent = txt;
  return e;
}

function append(p, children) {
  children.forEach(function(ch){ p.appendChild(ch); });
  return p;
}

// ==== SIMPLE GOOGLE SHEETS API ========================================
// Simple function to handle Google Apps Script responses
function parseGASResponse(text) {
  try {
    // Try direct JSON parse
    return JSON.parse(text);
  } catch (e1) {
    try {
      // Try to extract JSON from HTML wrapper
      const jsonMatch = text.match(/{[\s\S]*}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e2) {
      console.log("Couldn't parse response as JSON:", text.substring(0, 200));
    }
    return null;
  }
}

// Get all users from Google Sheets
async function fetchUsers() {
  try {
    console.log("Fetching users from Google Sheets...");
    const response = await fetch(`${API_BASE_URL}?action=getUsers&t=${Date.now()}`);
    const text = await response.text();
    
    const data = parseGASResponse(text);
    
    if (!data || !data.success) {
      console.error("Failed to fetch users:", data?.error);
      return getDemoUsers(); // Fallback to demo
    }
    
    state.rows = data.users || [];
    state.loaded = true;
    
    if (refs.dataStatus) {
      refs.dataStatus.innerHTML = `<strong>✓ Database Ready:</strong> ${state.rows.length} users loaded`;
      refs.dataStatus.className = "iml-data-status iml-success";
    }
    
    if (refs.loginBtn) {
      refs.loginBtn.disabled = false;
      refs.loginBtn.innerHTML = "Login to Console";
    }
    
    return state.rows;
    
  } catch (error) {
    console.error("Error fetching users:", error);
    state.rows = getDemoUsers();
    state.loaded = true;
    
    if (refs.dataStatus) {
      refs.dataStatus.innerHTML = `<strong>⚠️ Using Demo Data:</strong> Connection failed`;
      refs.dataStatus.className = "iml-data-status iml-warning";
    }
    
    if (refs.loginBtn) {
      refs.loginBtn.disabled = false;
      refs.loginBtn.innerHTML = "Login (Demo Mode)";
    }
    
    return state.rows;
  }
}

// Get shop items
async function fetchShopItems() {
  state.shopItems = [
    { id: 1, name: "Amazon Gift Card", cost: 50, description: "$5 Amazon Gift Card" },
    { id: 2, name: "PayPal Cash", cost: 100, description: "$10 PayPal Transfer" },
    { id: 3, name: "Steam Wallet", cost: 150, description: "$15 Steam Credit" },
    { id: 4, name: "Google Play", cost: 200, description: "$20 Google Play Code" },
    { id: 5, name: "iPhone Case", cost: 250, description: "Premium iPhone Case" },
    { id: 6, name: "Wireless Earbuds", cost: 500, description: "Bluetooth 5.0 Earbuds" }
  ];
  return state.shopItems;
}

// Get leaderboard data
async function fetchLeaderboard() {
  state.leaderboard = [
    { rank: 1, username: "operator001", pts: 1250.50, level: "Platinum" },
    { rank: 2, username: "pro_user", pts: 980.75, level: "Gold" },
    { rank: 3, username: "earner_2024", pts: 875.25, level: "Gold" },
    { rank: 4, username: "top_operator", pts: 720.50, level: "Silver" },
    { rank: 5, username: "worker_bee", pts: 650.00, level: "Silver" },
    { rank: 6, username: "new_earner", pts: 425.75, level: "Bronze" },
    { rank: 7, username: "demo_user", pts: 380.25, level: "Bronze" },
    { rank: 8, username: "tester_01", pts: 295.50, level: "Bronze" },
    { rank: 9, username: "beginner_99", pts: 210.75, level: "Starter" },
    { rank: 10, username: "fresh_user", pts: 150.00, level: "Starter" }
  ];
  return state.leaderboard;
}

// Get transaction history
async function fetchTransactions() {
  state.transactions = [
    { id: "TXN001", date: "2024-03-15", type: "Earnings", amount: 25.00, status: "Completed" },
    { id: "TXN002", date: "2024-03-14", type: "Bonus", amount: 10.00, status: "Completed" },
    { id: "TXN003", date: "2024-03-13", type: "Purchase", amount: -50.00, status: "Completed" },
    { id: "TXN004", date: "2024-03-12", type: "Earnings", amount: 15.00, status: "Pending" },
    { id: "TXN005", date: "2024-03-11", type: "Cashout", amount: -100.00, status: "Processing" }
  ];
  return state.transactions;
}

// DEMO USERS FOR FALLBACK
function getDemoUsers() {
  return [
    {
      Username: "operator001",
      Password: "password123",
      Status: "Active",
      PTS: "100.00",
      Rate: "10",
      Reversal: "1.25",
      "#1": "What is 5 + 7?",
      "#2": "What is the capital of France?",
      "#3": "What color is the sky on a clear day?",
      Ans1: "12",
      Ans2: "Paris",
      Ans3: "Blue",
      LastLogin: "",
      SessionID: ""
    },
    {
      Username: "operator002",
      Password: "secure456",
      Status: "Active",
      PTS: "75.50",
      Rate: "10",
      Reversal: "2.10",
      "#1": "What is 8 x 9?",
      "#2": "What planet is known as the Red Planet?",
      "#3": "How many days in a week?",
      Ans1: "72",
      Ans2: "Mars",
      Ans3: "7",
      LastLogin: "",
      SessionID: ""
    }
  ];
}

// UPDATE USER IN GOOGLE SHEETS
async function updateUserInSheet(username, updates) {
  try {
    console.log("Updating sheet for user:", username, updates);
    
    const formData = new FormData();
    formData.append('action', 'updateUser');
    formData.append('username', username);
    formData.append('updates', JSON.stringify(updates));
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      body: formData
    });
    
    const text = await response.text();
    const data = parseGASResponse(text);
    
    if (data && data.success) {
      console.log("✅ Sheet updated successfully!");
      return true;
    } else {
      console.error("❌ Sheet update failed:", data?.error);
      return false;
    }
    
  } catch (error) {
    console.error("Error updating sheet:", error);
    return false;
  }
}

// SUBMIT ANSWER AND UPDATE SHEET
async function submitAnswerToSheet(username, questionId, answer) {
  try {
    console.log("Submitting answer for user:", username, "Q:", questionId, "A:", answer);
    
    const formData = new FormData();
    formData.append('action', 'submitAnswer');
    formData.append('username', username);
    formData.append('questionId', questionId.toString());
    formData.append('answer', answer);
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      body: formData
    });
    
    const text = await response.text();
    const data = parseGASResponse(text);
    
    if (data && data.success) {
      console.log("✅ Answer submitted to sheet!");
      return {
        success: true,
        correct: data.correct,
        newPts: data.newPts || 0,
        message: data.message || "Answer submitted"
      };
    } else {
      console.error("❌ Answer submission failed");
      return {
        success: false,
        message: "Failed to save to sheet"
      };
    }
    
  } catch (error) {
    console.error("Error submitting answer:", error);
    return {
      success: false,
      message: "Network error"
    };
  }
}

// REDEEM BONUS CODE
async function redeemBonusCode(code) {
  try {
    console.log("Redeeming bonus code:", code);
    
    const formData = new FormData();
    formData.append('action', 'redeemBonus');
    formData.append('username', state.user.username);
    formData.append('code', code);
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      body: formData
    });
    
    const text = await response.text();
    const data = parseGASResponse(text);
    
    if (data && data.success) {
      // Update local points
      state.pts += data.bonusAmount || 0;
      if (refs.stat_pts) {
        refs.stat_pts.textContent = state.pts.toFixed(2);
      }
      return {
        success: true,
        amount: data.bonusAmount,
        message: data.message || "Bonus redeemed successfully!"
      };
    } else {
      return {
        success: false,
        message: data?.error || "Invalid bonus code"
      };
    }
    
  } catch (error) {
    console.error("Error redeeming bonus:", error);
    return {
      success: false,
      message: "Network error"
    };
  }
}

// REQUEST CASHOUT
async function requestCashout(amount, method, details) {
  try {
    console.log("Requesting cashout:", amount, method);
    
    if (amount > state.pts) {
      return {
        success: false,
        message: "Insufficient points"
      };
    }
    
    const formData = new FormData();
    formData.append('action', 'requestCashout');
    formData.append('username', state.user.username);
    formData.append('amount', amount);
    formData.append('method', method);
    formData.append('details', JSON.stringify(details));
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      body: formData
    });
    
    const text = await response.text();
    const data = parseGASResponse(text);
    
    if (data && data.success) {
      // Update local points
      state.pts -= amount;
      if (refs.stat_pts) {
        refs.stat_pts.textContent = state.pts.toFixed(2);
      }
      return {
        success: true,
        message: data.message || "Cashout request submitted!"
      };
    } else {
      return {
        success: false,
        message: data?.error || "Cashout failed"
      };
    }
    
  } catch (error) {
    console.error("Error requesting cashout:", error);
    return {
      success: false,
      message: "Network error"
    };
  }
}

// PURCHASE ITEM
async function purchaseItem(itemId) {
  try {
    const item = state.shopItems.find(i => i.id === itemId);
    if (!item) {
      return { success: false, message: "Item not found" };
    }
    
    if (state.pts < item.cost) {
      return { success: false, message: "Insufficient points" };
    }
    
    console.log("Purchasing item:", item.name);
    
    const formData = new FormData();
    formData.append('action', 'purchaseItem');
    formData.append('username', state.user.username);
    formData.append('itemId', itemId);
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      body: formData
    });
    
    const text = await response.text();
    const data = parseGASResponse(text);
    
    if (data && data.success) {
      // Update local points
      state.pts -= item.cost;
      if (refs.stat_pts) {
        refs.stat_pts.textContent = state.pts.toFixed(2);
      }
      return {
        success: true,
        message: data.message || `Purchased ${item.name}! Code: ${data.code || "Check email"}`
      };
    } else {
      return {
        success: false,
        message: data?.error || "Purchase failed"
      };
    }
    
  } catch (error) {
    console.error("Error purchasing item:", error);
    return {
      success: false,
      message: "Network error"
    };
  }
}

// ==== CSS + BOOTSTRAP INJECTION =======================================
function injectAssets() {
  var h = document.head;

  // Bootstrap CSS
  var bs = document.createElement("link");
  bs.rel = "stylesheet";
  bs.href = "https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css";
  h.appendChild(bs);

  // Font Awesome
  var fa = document.createElement("link");
  fa.rel = "stylesheet";
  fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
  h.appendChild(fa);

  // Google Fonts
  var font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap";
  h.appendChild(font);

  // Custom Styles
  var st = document.createElement("style");
  st.textContent = `
  /* =========== HIGH CONTRAST COLOR THEME =========== */
  body{background:#0A0C14;color:#FFFFFF;font-family:'Ubuntu','Segoe UI',sans-serif;margin:0;padding-bottom:56px;}
  .iml-shell{min-height:100vh;}
  
  /* Desktop Nav */
  .navbar-iml{background:#000000;border-radius:0;border:0;box-shadow:0 2px 10px rgba(0,0,0,1);}
  .navbar-iml .navbar-brand{font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#00FFE0!important;font-size:14px;}
  .navbar-iml .navbar-brand i{margin-right:8px;}
  .navbar-iml .nav>li>a{text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#FFFFFF!important;}
  .navbar-iml .nav>li>a i{margin-right:5px;}
  .navbar-iml .nav>li>a:hover,.navbar-iml .nav>li.active>a{background:#00FFE0;color:#000000!important;}
  
  /* Mobile Header */
  .iml-mobile-header{display:none;background:#000000;padding:12px 15px;border-bottom:2px solid #00FFE0;}
  .iml-mobile-header .logo{font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#00FFE0;font-size:16px;display:flex;align-items:center;}
  .iml-mobile-header .logo i{margin-right:10px;font-size:18px;}
  
  /* Promo Bar */
  .iml-promo{background:#000000;border-bottom:2px solid #FF00AA;color:#FFFFFF;font-size:11px;text-transform:uppercase;letter-spacing:.11em;padding:8px 15px;text-align:center;font-weight:500;}
  
  /* Main Content */
  .iml-main{padding:15px;min-height:calc(100vh - 120px);}
  
  /* Panels */
  .panel-iml{background:#000000;border-radius:8px;border:2px solid #00FFE0;box-shadow:0 8px 20px rgba(0,255,224,0.2);}
  .panel-iml>.panel-heading{background:#000000;border-bottom:2px solid #FF00AA;color:#00FFE0;font-size:11px;text-transform:uppercase;letter-spacing:.12em;padding:12px 15px;}
  .panel-iml>.panel-body{background:#0A0C14;padding:15px;}
  
  /* Labels */
  .iml-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#FFFFFF;margin-bottom:3px;font-weight:500;}
  
  /* Inputs */
  .iml-input{background:#000000;border-radius:4px;border:2px solid #555555;color:#FFFFFF;height:40px;font-size:14px;padding:4px 12px;width:100%;font-weight:500;}
  .iml-input:focus{outline:none;border-color:#00FFE0;box-shadow:0 0 0 2px #00FFE0;}
  
  /* Buttons */
  .btn-iml{background:#FF00AA;border:2px solid #FF00AA;color:#FFFFFF;font-size:12px;text-transform:uppercase;letter-spacing:.13em;border-radius:4px;padding:10px 20px;transition:all 0.3s;font-weight:600;}
  .btn-iml:hover{background:#FF33BB;border-color:#FF33BB;color:#FFFFFF;transform:translateY(-2px);box-shadow:0 4px 12px rgba(255,0,170,0.4);}
  .btn-iml:disabled{background:#444444;border-color:#333333;color:#777777;}
  .btn-iml-small{padding:6px 12px;font-size:11px;}
  
  /* Status Chips */
  .iml-status-chip{display:inline-block;padding:5px 15px;border-radius:15px;font-size:11px;text-transform:uppercase;letter-spacing:.12em;background:#00AA00;border:2px solid #00FF00;color:#FFFFFF;font-weight:600;}
  .iml-status-chip.inactive{background:#AA0000;border-color:#FF0000;}
  .iml-status-chip.pending{background:#FFAA00;border-color:#FFFF00;color:#000000;}
  .iml-status-chip.processing{background:#0055FF;border-color:#00AAFF;}
  
  /* Stats Grid */
  .iml-stat-grid{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0 15px;}
  .iml-stat{flex:1 1 120px;min-width:120px;background:#000000;border-radius:6px;border:2px solid #333333;padding:12px 15px;}
  .iml-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#00FFE0;}
  .iml-stat-val{font-size:20px;color:#FFFFFF;margin-top:5px;font-weight:700;}
  .iml-stat-sub{font-size:10px;color:#AAAAAA;}
  
  /* Question Blocks */
  .iml-q-block{background:#000000;border-radius:6px;border:2px solid #333333;padding:15px 18px;margin-bottom:15px;transition:all 0.3s;}
  .iml-q-block.answered{opacity:0.7;background:#111111;border-color:#555555;}
  
  /* Shop Items */
  .iml-shop-item{background:#000000;border-radius:6px;border:2px solid #333333;padding:15px;margin-bottom:15px;transition:all 0.3s;}
  .iml-shop-item:hover{border-color:#FF00AA;transform:translateY(-2px);}
  .iml-shop-item-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
  .iml-shop-item-name{font-size:14px;font-weight:600;color:#00FFE0;}
  .iml-shop-item-cost{background:#FF00AA;color:#FFFFFF;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;}
  .iml-shop-item-desc{font-size:12px;color:#CCCCCC;margin-bottom:10px;}
  
  /* Leaderboard */
  .iml-leaderboard-row{display:flex;align-items:center;padding:12px 15px;background:#000000;border-radius:6px;border:1px solid #333333;margin-bottom:8px;}
  .iml-leaderboard-rank{width:40px;text-align:center;font-weight:700;font-size:16px;color:#00FFE0;}
  .iml-leaderboard-medal{width:30px;text-align:center;font-size:18px;}
  .iml-leaderboard-user{flex:1;padding:0 15px;}
  .iml-leaderboard-username{font-weight:600;color:#FFFFFF;}
  .iml-leaderboard-level{font-size:10px;color:#AAAAAA;text-transform:uppercase;}
  .iml-leaderboard-points{text-align:right;font-weight:700;color:#00FF00;}
  
  /* Transaction List */
  .iml-transaction-row{display:flex;justify-content:space-between;align-items:center;padding:12px 15px;background:#000000;border-radius:6px;border:1px solid #333333;margin-bottom:8px;}
  .iml-transaction-info{flex:1;}
  .iml-transaction-id{font-size:10px;color:#AAAAAA;}
  .iml-transaction-type{font-weight:600;color:#FFFFFF;}
  .iml-transaction-date{font-size:10px;color:#888888;}
  .iml-transaction-amount{font-weight:700;font-size:14px;}
  .iml-transaction-amount.positive{color:#00FF00;}
  .iml-transaction-amount.negative{color:#FF0000;}
  
  /* Cashout Methods */
  .iml-cashout-method{background:#000000;border-radius:6px;border:2px solid #333333;padding:15px;margin-bottom:15px;cursor:pointer;transition:all 0.3s;}
  .iml-cashout-method:hover{border-color:#00FFE0;}
  .iml-cashout-method.active{border-color:#FF00AA;background:#111111;}
  .iml-cashout-method-icon{font-size:24px;color:#00FFE0;margin-bottom:10px;}
  .iml-cashout-method-name{font-weight:600;color:#FFFFFF;margin-bottom:5px;}
  .iml-cashout-method-desc{font-size:11px;color:#AAAAAA;}
  
  /* Messages */
  .iml-inline-msg{font-size:12px;margin-top:10px;padding:10px;border-radius:4px;border:1px solid;font-weight:500;}
  .text-success{color:#00FF00!important;border-color:#00FF00!important;background:rgba(0,255,0,0.1)!important;}
  .text-danger{color:#FF0000!important;border-color:#FF0000!important;background:rgba(255,0,0,0.1)!important;}
  .text-info{color:#00FFE0!important;border-color:#00FFE0!important;background:rgba(0,255,224,0.1)!important;}
  .text-warning{color:#FFFF00!important;border-color:#FFFF00!important;background:rgba(255,255,0,0.1)!important;}
  
  /* Loading/Status */
  .iml-loading{color:#00FFE0;font-size:12px;text-align:center;padding:10px;font-weight:500;}
  .iml-success{color:#00FF00;font-size:12px;text-align:center;padding:10px;font-weight:500;}
  .iml-error{color:#FF0000;font-size:12px;text-align:center;padding:10px;font-weight:500;}
  .iml-warning{color:#FFFF00;font-size:12px;text-align:center;padding:10px;font-weight:500;}
  
  /* Data Status */
  .iml-data-status{margin-bottom:15px;padding:12px;background:#000000;border-radius:4px;border-left:4px solid #00FFE0;border:2px solid #333333;}
  .iml-data-status.iml-success{border-left-color:#00FF00;border-color:#00FF00;}
  .iml-data-status.iml-error{border-left-color:#FF0000;border-color:#FF0000;}
  .iml-data-status.iml-warning{border-left-color:#FFFF00;border-color:#FFFF00;}
  
  /* Page Containers */
  .iml-page{display:none;}
  .iml-page.active{display:block;}
  
  /* Indicators */
  .iml-saving{position:fixed;bottom:60px;right:20px;background:#00AA00;color:#FFFFFF;padding:10px 15px;border-radius:4px;font-size:12px;font-weight:600;display:none;z-index:10000;border:2px solid #00FF00;box-shadow:0 4px 12px rgba(0,0,0,0.5);}
  .iml-offline{position:fixed;bottom:100px;right:20px;background:#AA0000;color:#FFFFFF;padding:10px 15px;border-radius:4px;font-size:12px;font-weight:600;display:none;z-index:10000;border:2px solid #FF0000;box-shadow:0 4px 12px rgba(0,0,0,0.5);}
  
  /* Mobile Bottom Navigation */
  .iml-bottom-nav{display:none;}
  
  /* Mobile Styles */
  @media(max-width:767px){
    .navbar-iml{display:none;}
    
    .iml-mobile-header{
      display:flex;
      align-items:center;
      position:sticky;
      top:0;
      z-index:1000;
    }
    
    .iml-promo{
      font-size:10px;
      padding:6px 12px;
      letter-spacing:.09em;
    }
    
    .iml-main{
      padding:12px;
      min-height:calc(100vh - 140px);
    }
    
    .panel-iml{
      border-width:2px;
    }
    
    .iml-bottom-nav{
      display:flex;
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      background:#000000;
      border-top:2px solid #FF00AA;
      z-index:9999;
      padding:8px 0;
    }
    
    .iml-bottom-nav button{
      flex:1;
      border:none;
      background:transparent;
      color:#CCCCCC;
      font-size:10px;
      text-transform:uppercase;
      letter-spacing:.09em;
      padding:8px 2px;
      display:flex;
      flex-direction:column;
      align-items:center;
      transition:all 0.3s;
      font-weight:600;
    }
    
    .iml-bottom-nav button i{
      font-size:16px;
      margin-bottom:5px;
    }
    
    .iml-bottom-nav button.active{
      background:#FF00AA;
      color:#FFFFFF;
    }
    
    .iml-main{padding-bottom:80px;}
    .iml-saving{bottom:80px;}
    .iml-offline{bottom:120px;}
    
    .iml-stat-grid{
      gap:8px;
    }
    
    .iml-stat{
      min-width:calc(50% - 8px);
    }
    
    .btn-iml{
      padding:12px 15px;
      font-size:13px;
    }
    
    .iml-input{
      height:44px;
      font-size:16px;
    }
  }
  
  /* Desktop Styles */
  @media(min-width:768px){
    .iml-mobile-header{display:none;}
    .iml-bottom-nav{display:none;}
    .navbar-imd{display:block;}
  }
  `;
  h.appendChild(st);
}

// ==== PAGE BUILDERS ===================================================
function buildHomePage() {
  var page = el("div", "iml-page home-page");
  if (state.currentPage === 'home') page.classList.add('active');
  
  if (!state.user) {
    // Login panel for home page when not logged in
    page.appendChild(buildLoginPanel());
  } else {
    // Dashboard for logged in users
    page.appendChild(buildDashboardPanel());
  }
  
  return page;
}

function buildEarnPage() {
  var page = el("div", "iml-page earn-page");
  if (state.currentPage === 'earn') page.classList.add('active');
  
  var panel = el("div", "panel panel-iml");
  var heading = el("div", "panel-heading", "<i class='fa fa-money'></i> Earn PTS");
  heading.innerHTML = "<i class='fa fa-money'></i> Earn PTS";
  var body = el("div", "panel-body");
  
  // Bonus Redemption Section
  var bonusSection = el("div", "row");
  var bonusCol = el("div", "col-xs-12");
  var bonusTitle = el("div", "iml-label", "<i class='fa fa-gift'></i> Redeem Bonus Code");
  bonusTitle.innerHTML = "<i class='fa fa-gift'></i> Redeem Bonus Code";
  bonusCol.appendChild(bonusTitle);
  
  var bonusRow = el("div", "row");
  var bonusInputCol = el("div", "col-xs-12 col-sm-8");
  var bonusInput = el("input", "iml-input form-control");
  bonusInput.placeholder = "Enter bonus code (e.g., WELCOME2024)";
  bonusInput.id = "bonusCode";
  bonusInputCol.appendChild(bonusInput);
  
  var bonusBtnCol = el("div", "col-xs-12 col-sm-4");
  var bonusBtn = el("button", "btn btn-iml btn-block", "Redeem");
  bonusBtn.innerHTML = "<i class='fa fa-gift'></i> Redeem";
  bonusBtn.onclick = function() {
    var code = document.getElementById('bonusCode').value.trim();
    if (!code) {
      showMessage("Enter a bonus code", "warning", body);
      return;
    }
    redeemBonusCode(code).then(function(result) {
      if (result.success) {
        showMessage(result.message + " +" + result.amount + " PTS", "success", body);
        document.getElementById('bonusCode').value = "";
      } else {
        showMessage(result.message, "danger", body);
      }
    });
  };
  bonusBtnCol.appendChild(bonusBtn);
  
  append(bonusRow, [bonusInputCol, bonusBtnCol]);
  append(bonusCol, [bonusTitle, bonusRow]);
  bonusSection.appendChild(bonusCol);
  
  // Current Earnings
  var earningsRow = el("div", "row");
  var earningsCol = el("div", "col-xs-12");
  var earningsTitle = el("div", "iml-label", "<i class='fa fa-line-chart'></i> Your Earnings");
  earningsTitle.innerHTML = "<i class='fa fa-line-chart'></i> Your Earnings";
  earningsCol.appendChild(earningsTitle);
  
  var statGrid = el("div", "iml-stat-grid");
  var totalEarned = mkStat("Total Earned", "total", "All time earnings", "fa-money");
  var todayEarned = mkStat("Today", "today", "Earnings today", "fa-calendar");
  var weeklyEarned = mkStat("This Week", "week", "Weekly earnings", "fa-calendar-o");
  var monthlyEarned = mkStat("This Month", "month", "Monthly earnings", "fa-calendar-check-o");
  append(statGrid, [totalEarned, todayEarned, weeklyEarned, monthlyEarned]);
  earningsCol.appendChild(statGrid);
  earningsRow.appendChild(earningsCol);
  
  // Quick Tasks
  var tasksRow = el("div", "row");
  var tasksCol = el("div", "col-xs-12");
  var tasksTitle = el("div", "iml-label", "<i class='fa fa-tasks'></i> Quick Tasks");
  tasksTitle.innerHTML = "<i class='fa fa-tasks'></i> Quick Tasks";
  tasksCol.appendChild(tasksTitle);
  
  var tasks = [
    { title: "Daily Login", pts: 5, desc: "Login to earn daily bonus" },
    { title: "Complete Profile", pts: 10, desc: "Fill out your profile info" },
    { title: "Refer a Friend", pts: 25, desc: "Invite friends to join" },
    { title: "Weekly Streak", pts: 50, desc: "Maintain 7-day activity" }
  ];
  
  tasks.forEach(function(task) {
    var taskItem = el("div", "iml-shop-item");
    var header = el("div", "iml-shop-item-header");
    var name = el("div", "iml-shop-item-name", task.title);
    var cost = el("div", "iml-shop-item-cost", "+" + task.pts + " PTS");
    var desc = el("div", "iml-shop-item-desc", task.desc);
    var btn = el("button", "btn btn-iml btn-iml-small", "Claim");
    btn.innerHTML = "<i class='fa fa-check'></i> Claim";
    btn.style.marginTop = "10px";
    
    append(header, [name, cost]);
    append(taskItem, [header, desc, btn]);
    tasksCol.appendChild(taskItem);
  });
  
  tasksRow.appendChild(tasksCol);
  
  // Instructions
  var infoRow = el("div", "row");
  var infoCol = el("div", "col-xs-12");
  var infoContent = el("div", "iml-q-text");
  infoContent.innerHTML = 
    "<strong>Ways to Earn:</strong><br>" +
    "• Answer questions correctly (+5 PTS each)<br>" +
    "• Daily login bonus<br>" +
    "• Complete quick tasks<br>" +
    "• Redeem bonus codes<br>" +
    "• Refer friends (+25 PTS each)<br><br>" +
    "<strong>Note:</strong> Points update instantly in Google Sheets.";
  
  infoCol.appendChild(infoContent);
  infoRow.appendChild(infoCol);
  
  append(body, [bonusSection, el("hr"), earningsRow, el("hr"), tasksRow, el("hr"), infoRow]);
  append(panel, [heading, body]);
  page.appendChild(panel);
  
  return page;
}

function buildShopPage() {
  var page = el("div", "iml-page shop-page");
  if (state.currentPage === 'shop') page.classList.add('active');
  
  var panel = el("div", "panel panel-iml");
  var heading = el("div", "panel-heading", "<i class='fa fa-shopping-cart'></i> Rewards Shop");
  heading.innerHTML = "<i class='fa fa-shopping-cart'></i> Rewards Shop";
  var body = el("div", "panel-body");
  
  // Your Points
  var pointsRow = el("div", "row");
  var pointsCol = el("div", "col-xs-12");
  var pointsDisplay = el("div", "iml-stat");
  pointsDisplay.style.textAlign = "center";
  pointsDisplay.style.marginBottom = "20px";
  var pointsLabel = el("div", "iml-stat-label", "Your Balance");
  var pointsVal = el("div", "iml-stat-val", state.pts ? state.pts.toFixed(2) + " PTS" : "0 PTS");
  pointsVal.style.color = "#FF00AA";
  pointsVal.style.fontSize = "24px";
  append(pointsDisplay, [pointsLabel, pointsVal]);
  pointsCol.appendChild(pointsDisplay);
  pointsRow.appendChild(pointsCol);
  
  // Shop Items Grid
  var itemsRow = el("div", "row");
  
  fetchShopItems().then(function(items) {
    items.forEach(function(item) {
      var itemCol = el("div", "col-xs-12 col-sm-6 col-md-4");
      var itemDiv = el("div", "iml-shop-item");
      
      var header = el("div", "iml-shop-item-header");
      var name = el("div", "iml-shop-item-name", item.name);
      var cost = el("div", "iml-shop-item-cost", item.cost + " PTS");
      
      var desc = el("div", "iml-shop-item-desc", item.description);
      
      var btn = el("button", "btn btn-iml btn-block", "Purchase");
      btn.innerHTML = "<i class='fa fa-shopping-cart'></i> Purchase";
      btn.disabled = !state.user || state.pts < item.cost;
      btn.onclick = function() {
        if (!state.user) {
          showMessage("Please login first", "danger", body);
          return;
        }
        if (state.pts < item.cost) {
          showMessage("Insufficient points", "danger", body);
          return;
        }
        
        if (confirm("Purchase " + item.name + " for " + item.cost + " PTS?")) {
          purchaseItem(item.id).then(function(result) {
            if (result.success) {
              showMessage(result.message, "success", body);
              btn.disabled = true;
              btn.innerHTML = "<i class='fa fa-check'></i> Purchased";
              pointsVal.textContent = state.pts.toFixed(2) + " PTS";
            } else {
              showMessage(result.message, "danger", body);
            }
          });
        }
      };
      
      append(header, [name, cost]);
      append(itemDiv, [header, desc, btn]);
      itemCol.appendChild(itemDiv);
      itemsRow.appendChild(itemCol);
    });
  });
  
  // Cashout Section
  var cashoutRow = el("div", "row");
  var cashoutCol = el("div", "col-xs-12");
  var cashoutTitle = el("div", "iml-label", "<i class='fa fa-credit-card'></i> Cashout Options");
  cashoutTitle.innerHTML = "<i class='fa fa-credit-card'></i> Cashout Options";
  cashoutTitle.style.marginTop = "30px";
  cashoutCol.appendChild(cashoutTitle);
  
  var cashoutMethods = [
    { id: "paypal", name: "PayPal", icon: "fa-paypal", desc: "Minimum 100 PTS = $10", rate: 10 },
    { id: "amazon", name: "Amazon Gift Card", icon: "fa-amazon", desc: "Minimum 50 PTS = $5", rate: 10 },
    { id: "bitcoin", name: "Bitcoin", icon: "fa-btc", desc: "Minimum 200 PTS = $20", rate: 10 }
  ];
  
  var methodsRow = el("div", "row");
  cashoutMethods.forEach(function(method) {
    var methodCol = el("div", "col-xs-12 col-md-4");
    var methodDiv = el("div", "iml-cashout-method");
    methodDiv.dataset.method = method.id;
    
    var icon = el("div", "iml-cashout-method-icon");
    icon.innerHTML = "<i class='fa " + method.icon + "'></i>";
    
    var name = el("div", "iml-cashout-method-name", method.name);
    var desc = el("div", "iml-cashout-method-desc", method.desc);
    
    append(methodDiv, [icon, name, desc]);
    methodCol.appendChild(methodDiv);
    methodsRow.appendChild(methodCol);
    
    methodDiv.onclick = function() {
      document.querySelectorAll('.iml-cashout-method').forEach(function(m) {
        m.classList.remove('active');
      });
      this.classList.add('active');
      document.getElementById('cashoutMethod').value = method.id;
      document.getElementById('cashoutRate').textContent = "Rate: " + method.rate + " PTS = $1";
    };
  });
  
  cashoutCol.appendChild(methodsRow);
  
  // Cashout Form
  var formRow = el("div", "row");
  var formCol = el("div", "col-xs-12");
  var formTitle = el("div", "iml-label", "<i class='fa fa-exchange'></i> Request Cashout");
  formTitle.innerHTML = "<i class='fa fa-exchange'></i> Request Cashout";
  formTitle.style.marginTop = "20px";
  formCol.appendChild(formTitle);
  
  var cashoutForm = el("div", "row");
  
  var amountCol = el("div", "col-xs-12 col-sm-6");
  var amountLabel = el("div", "iml-label", "Amount in PTS");
  var amountInput = el("input", "iml-input form-control");
  amountInput.type = "number";
  amountInput.min = "50";
  amountInput.placeholder = "Minimum 50 PTS";
  amountInput.id = "cashoutAmount";
  append(amountCol, [amountLabel, amountInput]);
  
  var methodCol = el("div", "col-xs-12 col-sm-6");
  var methodLabel = el("div", "iml-label", "Method");
  var methodInput = el("input", "iml-input form-control");
  methodInput.type = "hidden";
  methodInput.id = "cashoutMethod";
  var rateDisplay = el("div", "iml-stat-sub", "Select method above");
  rateDisplay.id = "cashoutRate";
  append(methodCol, [methodLabel, methodInput, rateDisplay]);
  
  append(cashoutForm, [amountCol, methodCol]);
  
  var detailsCol = el("div", "col-xs-12");
  var detailsLabel = el("div", "iml-label", "Payment Details");
  var detailsInput = el("input", "iml-input form-control");
  detailsInput.placeholder = "PayPal email / Bitcoin address / etc.";
  detailsInput.id = "cashoutDetails";
  append(detailsCol, [detailsLabel, detailsInput]);
  
  var btnCol = el("div", "col-xs-12");
  var cashoutBtn = el("button", "btn btn-iml btn-block", "Request Cashout");
  cashoutBtn.innerHTML = "<i class='fa fa-check-circle'></i> Request Cashout";
  cashoutBtn.style.marginTop = "15px";
  cashoutBtn.onclick = function() {
    if (!state.user) {
      showMessage("Please login first", "danger", body);
      return;
    }
    
    var amount = parseFloat(document.getElementById('cashoutAmount').value);
    var method = document.getElementById('cashoutMethod').value;
    var details = document.getElementById('cashoutDetails').value;
    
    if (!amount || amount < 50) {
      showMessage("Minimum cashout is 50 PTS", "warning", body);
      return;
    }
    
    if (!method) {
      showMessage("Select a cashout method", "warning", body);
      return;
    }
    
    if (!details) {
      showMessage("Enter payment details", "warning", body);
      return;
    }
    
    if (amount > state.pts) {
      showMessage("Insufficient points", "danger", body);
      return;
    }
    
    if (confirm("Request cashout of " + amount + " PTS via " + method + "?")) {
      requestCashout(amount, method, details).then(function(result) {
        if (result.success) {
          showMessage(result.message, "success", body);
          document.getElementById('cashoutAmount').value = "";
          document.getElementById('cashoutDetails').value = "";
          pointsVal.textContent = state.pts.toFixed(2) + " PTS";
        } else {
          showMessage(result.message, "danger", body);
        }
      });
    }
  };
  
  append(btnCol, [cashoutBtn]);
  append(formCol, [formTitle, cashoutForm, detailsCol, btnCol]);
  formRow.appendChild(formCol);
  
  append(cashoutCol, [methodsRow, formRow]);
  cashoutRow.appendChild(cashoutCol);
  
  append(body, [pointsRow, itemsRow, el("hr"), cashoutRow]);
  append(panel, [heading, body]);
  page.appendChild(panel);
  
  return page;
}

function buildLeadersPage() {
  var page = el("div", "iml-page leaders-page");
  if (state.currentPage === 'leaders') page.classList.add('active');
  
  var panel = el("div", "panel panel-iml");
  var heading = el("div", "panel-heading", "<i class='fa fa-trophy'></i> Leaderboard");
  heading.innerHTML = "<i class='fa fa-trophy'></i> Leaderboard";
  var body = el("div", "panel-body");
  
  // Time Period Selector
  var periodRow = el("div", "row");
  var periodCol = el("div", "col-xs-12");
  var periodBtns = el("div", "btn-group btn-group-justified");
  periodBtns.style.marginBottom = "20px";
  
  var periods = [
    { id: 'daily', text: 'Daily', active: true },
    { id: 'weekly', text: 'Weekly' },
    { id: 'monthly', text: 'Monthly' },
    { id: 'alltime', text: 'All Time' }
  ];
  
  periods.forEach(function(period) {
    var btnGroup = el("div", "btn-group");
    var btn = el("button", "btn btn-iml", period.text);
    if (period.active) btn.classList.add('active');
    btn.style.borderRadius = '0';
    btn.onclick = function() {
      document.querySelectorAll('.btn-group .btn').forEach(function(b) {
        b.classList.remove('active');
      });
      this.classList.add('active');
      // Here you would fetch leaderboard for selected period
    };
    btnGroup.appendChild(btn);
    periodBtns.appendChild(btnGroup);
  });
  
  periodCol.appendChild(periodBtns);
  periodRow.appendChild(periodCol);
  
  // Leaderboard List
  var listRow = el("div", "row");
  var listCol = el("div", "col-xs-12");
  
  fetchLeaderboard().then(function(leaders) {
    leaders.forEach(function(leader) {
      var row = el("div", "iml-leaderboard-row");
      
      var rank = el("div", "iml-leaderboard-rank", leader.rank);
      
      var medal = el("div", "iml-leaderboard-medal");
      if (leader.rank === 1) medal.innerHTML = "<i class='fa fa-trophy' style='color:#FFD700'></i>";
      else if (leader.rank === 2) medal.innerHTML = "<i class='fa fa-trophy' style='color:#C0C0C0'></i>";
      else if (leader.rank === 3) medal.innerHTML = "<i class='fa fa-trophy' style='color:#CD7F32'></i>";
      else medal.innerHTML = "<i class='fa fa-user'></i>";
      
      var user = el("div", "iml-leaderboard-user");
      var username = el("div", "iml-leaderboard-username", leader.username);
      var level = el("div", "iml-leaderboard-level", leader.level);
      append(user, [username, level]);
      
      var points = el("div", "iml-leaderboard-points", leader.pts.toFixed(2) + " PTS");
      
      // Highlight current user
      if (state.user && leader.username === state.user.username) {
        row.style.borderColor = "#FF00AA";
        row.style.background = "#111111";
      }
      
      append(row, [rank, medal, user, points]);
      listCol.appendChild(row);
    });
  });
  
  // Your Position
  var yourPosRow = el("div", "row");
  var yourPosCol = el("div", "col-xs-12");
  
  if (state.user) {
    var yourStat = el("div", "iml-stat");
    yourStat.style.marginTop = "20px";
    var yourLabel = el("div", "iml-stat-label", "Your Position");
    var yourRank = el("div", "iml-stat-val", "#8");
    yourRank.style.color = "#FF00AA";
    var yourPts = el("div", "iml-stat-sub", state.pts.toFixed(2) + " PTS");
    append(yourStat, [yourLabel, yourRank, yourPts]);
    yourPosCol.appendChild(yourStat);
  }
  
  yourPosRow.appendChild(yourPosCol);
  
  append(listRow, [listCol]);
  append(body, [periodRow, listRow, yourPosRow]);
  append(panel, [heading, body]);
  page.appendChild(panel);
  
  return page;
}

function buildHelpPage() {
  var page = el("div", "iml-page help-page");
  if (state.currentPage === 'help') page.classList.add('active');
  
  var panel = el("div", "panel panel-iml");
  var heading = el("div", "panel-heading", "<i class='fa fa-question-circle'></i> Help & Support");
  heading.innerHTML = "<i class='fa fa-question-circle'></i> Help & Support";
  var body = el("div", "panel-body");
  
  var faqItems = [
    {
      q: "How do I earn points?",
      a: "Answer questions correctly (+5 PTS each), redeem bonus codes, complete daily tasks, and maintain activity streaks."
    },
    {
      q: "How do I cashout my points?",
      a: "Go to Shop page, select cashout method (PayPal, Amazon, Bitcoin), enter amount (min 50 PTS) and payment details."
    },
    {
      q: "What is the reversal rate?",
      a: "Quality control metric. Lower is better. If it exceeds 3%, some points may be held for 15 days."
    },
    {
      q: "How are points calculated?",
      a: "Base rate + correct answers + bonuses. Each correct answer = +5 PTS. Rates may vary based on performance."
    },
    {
      q: "Where is my data stored?",
      a: "All data is stored in Google Sheets and syncs in real-time. Your progress is saved instantly."
    },
    {
      q: "How do I contact support?",
      a: "Use the chat feature or email support@imlconsole.com. Response time is 24-48 hours."
    },
    {
      q: "Can I use multiple accounts?",
      a: "No, one account per person. Multiple accounts will be suspended."
    },
    {
      q: "When will I receive my cashout?",
      a: "Cashouts are processed within 3-5 business days after approval."
    }
  ];
  
  faqItems.forEach(function(item, index) {
    var faqItem = el("div", "iml-q-block");
    faqItem.style.marginBottom = "15px";
    
    var question = el("div", "iml-q-text");
    question.innerHTML = "<strong>Q" + (index + 1) + ":</strong> " + item.q;
    
    var answer = el("div", "iml-shop-item-desc");
    answer.innerHTML = "<strong>A:</strong> " + item.a;
    answer.style.marginTop = "5px";
    
    append(faqItem, [question, answer]);
    body.appendChild(faqItem);
  });
  
  // Contact Support
  var contactRow = el("div", "row");
  var contactCol = el("div", "col-xs-12");
  var contactTitle = el("div", "iml-label", "<i class='fa fa-envelope'></i> Contact Support");
  contactTitle.innerHTML = "<i class='fa fa-envelope'></i> Contact Support";
  contactCol.appendChild(contactTitle);
  
  var contactForm = el("div", "row");
  
  var subjectCol = el("div", "col-xs-12");
  var subjectLabel = el("div", "iml-label", "Subject");
  var subjectInput = el("input", "iml-input form-control");
  subjectInput.placeholder = "Enter subject";
  append(subjectCol, [subjectLabel, subjectInput]);
  
  var messageCol = el("div", "col-xs-12");
  var messageLabel = el("div", "iml-label", "Message");
  var messageInput = el("textarea", "iml-input form-control");
  messageInput.placeholder = "Describe your issue...";
  messageInput.rows = 4;
  append(messageCol, [messageLabel, messageInput]);
  
  var submitCol = el("div", "col-xs-12");
  var submitBtn = el("button", "btn btn-iml", "Send Message");
  submitBtn.innerHTML = "<i class='fa fa-paper-plane'></i> Send Message";
  submitBtn.style.marginTop = "10px";
  submitBtn.onclick = function() {
    var subject = subjectInput.value;
    var message = messageInput.value;
    if (!subject || !message) {
      showMessage("Please fill all fields", "warning", body);
      return;
    }
    showMessage("Message sent to support. We'll respond within 24 hours.", "success", body);
    subjectInput.value = "";
    messageInput.value = "";
  };
  
  append(submitCol, [submitBtn]);
  append(contactForm, [subjectCol, messageCol, submitCol]);
  append(contactCol, [contactTitle, contactForm]);
  contactRow.appendChild(contactCol);
  
  append(body, [contactRow]);
  append(panel, [heading, body]);
  page.appendChild(panel);
  
  return page;
}

function buildChatPage() {
  var page = el("div", "iml-page chat-page");
  if (state.currentPage === 'chat') page.classList.add('active');
  
  var panel = el("div", "panel panel-iml");
  var heading = el("div", "panel-heading", "<i class='fa fa-comments'></i> Live Chat");
  heading.innerHTML = "<i class='fa fa-comments'></i> Live Chat";
  var body = el("div", "panel-body");
  
  // Chat Container
  var chatContainer = el("div", "iml-q-block");
  chatContainer.style.height = "300px";
  chatContainer.style.overflowY = "auto";
  chatContainer.style.marginBottom = "15px";
  chatContainer.style.padding = "10px";
  chatContainer.id = "chatMessages";
  
  // Sample messages
  var sampleMessages = [
    { sender: "System", message: "Welcome to IML Console chat!", time: "10:00 AM" },
    { sender: "Support", message: "How can we help you today?", time: "10:01 AM" },
    { sender: "User", message: "How long do cashouts take?", time: "10:02 AM" },
    { sender: "Support", message: "Cashouts process in 3-5 business days.", time: "10:03 AM" }
  ];
  
  sampleMessages.forEach(function(msg) {
    var msgDiv = el("div", "iml-chat-message");
    msgDiv.style.marginBottom = "10px";
    msgDiv.style.padding = "8px";
    msgDiv.style.background = msg.sender === "User" ? "#111111" : "#000000";
    msgDiv.style.borderRadius = "6px";
    msgDiv.style.borderLeft = "3px solid " + (msg.sender === "User" ? "#FF00AA" : "#00FFE0");
    
    var sender = el("div", "iml-chat-sender");
    sender.style.fontWeight = "600";
    sender.style.color = msg.sender === "User" ? "#FF00AA" : "#00FFE0";
    sender.textContent = msg.sender + " · " + msg.time;
    
    var message = el("div", "iml-chat-text");
    message.style.color = "#FFFFFF";
    message.style.marginTop = "3px";
    message.textContent = msg.message;
    
    append(msgDiv, [sender, message]);
    chatContainer.appendChild(msgDiv);
  });
  
  // Message Input
  var inputRow = el("div", "row");
  var inputCol = el("div", "col-xs-9 col-sm-10");
  var messageInput = el("input", "iml-input form-control");
  messageInput.placeholder = "Type your message...";
  messageInput.id = "chatInput";
  inputCol.appendChild(messageInput);
  
  var btnCol = el("div", "col-xs-3 col-sm-2");
  var sendBtn = el("button", "btn btn-iml", "Send");
  sendBtn.innerHTML = "<i class='fa fa-paper-plane'></i>";
  sendBtn.onclick = function() {
    var msg = document.getElementById('chatInput').value.trim();
    if (!msg) return;
    
    // Add user message
    var msgDiv = el("div", "iml-chat-message");
    msgDiv.style.marginBottom = "10px";
    msgDiv.style.padding = "8px";
    msgDiv.style.background = "#111111";
    msgDiv.style.borderRadius = "6px";
    msgDiv.style.borderLeft = "3px solid #FF00AA";
    
    var now = new Date();
    var time = now.getHours() + ":" + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    
    var sender = el("div", "iml-chat-sender");
    sender.style.fontWeight = "600";
    sender.style.color = "#FF00AA";
    sender.textContent = "You · " + time;
    
    var message = el("div", "iml-chat-text");
    message.style.color = "#FFFFFF";
    message.style.marginTop = "3px";
    message.textContent = msg;
    
    append(msgDiv, [sender, message]);
    chatContainer.appendChild(msgDiv);
    
    // Clear input
    document.getElementById('chatInput').value = "";
    
    // Auto-scroll
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Simulate auto-reply after 1 second
    setTimeout(function() {
      var replies = [
        "Thanks for your message!",
        "Our support team will review your question.",
        "Please check the FAQ section for common questions.",
        "We'll get back to you shortly."
      ];
      
      var reply = replies[Math.floor(Math.random() * replies.length)];
      
      var replyDiv = el("div", "iml-chat-message");
      replyDiv.style.marginBottom = "10px";
      replyDiv.style.padding = "8px";
      replyDiv.style.background = "#000000";
      replyDiv.style.borderRadius = "6px";
      replyDiv.style.borderLeft = "3px solid #00FFE0";
      
      var replyTime = new Date();
      var replyTimeStr = replyTime.getHours() + ":" + (replyTime.getMinutes() < 10 ? '0' : '') + replyTime.getMinutes();
      
      var replySender = el("div", "iml-chat-sender");
      replySender.style.fontWeight = "600";
      replySender.style.color = "#00FFE0";
      replySender.textContent = "Support · " + replyTimeStr;
      
      var replyMessage = el("div", "iml-chat-text");
      replyMessage.style.color = "#FFFFFF";
      replyMessage.style.marginTop = "3px";
      replyMessage.textContent = reply;
      
      append(replyDiv, [replySender, replyMessage]);
      chatContainer.appendChild(replyDiv);
      
      // Auto-scroll
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 1000);
  };
  
  btnCol.appendChild(sendBtn);
  append(inputRow, [inputCol, btnCol]);
  
  // Chat Info
  var infoRow = el("div", "row");
  var infoCol = el("div", "col-xs-12");
  var infoContent = el("div", "iml-q-text");
  infoContent.innerHTML = 
    "<strong>Chat Features:</strong><br>" +
    "• Real-time messaging with support<br>" +
    "• Typical response time: 5-10 minutes<br>" +
    "• Chat history saved for 7 days<br>" +
    "• Available 9 AM - 5 PM (GMT)<br><br>" +
    "<strong>Note:</strong> For urgent issues, email support@imlconsole.com";
  
  infoCol.appendChild(infoContent);
  infoRow.appendChild(infoCol);
  
  append(body, [chatContainer, inputRow, el("hr"), infoRow]);
  append(panel, [heading, body]);
  page.appendChild(panel);
  
  return page;
}

function buildLoginPanel() {
  var panel = el("div", "panel panel-iml");
  var heading = el("div", "panel-heading", "<i class='fa fa-lock'></i> User Authentication");
  heading.innerHTML = "<i class='fa fa-lock'></i> User Authentication";
  var body = el("div", "panel-body");
  
  refs.dataStatus = el("div", "iml-data-status iml-loading", "Connecting to Google Sheets...");
  body.appendChild(refs.dataStatus);
  
  refs.loginMsg = el("div", "iml-inline-msg");
  refs.loginMsg.style.display = "none";
  body.appendChild(refs.loginMsg);

  var r1 = el("div", "row");
  var cU = el("div", "col-xs-12 col-sm-6");
  var cP = el("div", "col-xs-12 col-sm-6");
  var lU = el("div", "iml-label", "<i class='fa fa-user'></i> Username");
  lU.innerHTML = "<i class='fa fa-user'></i> Username";
  var inU = el("input", "iml-input form-control");
  inU.type = "text";
  inU.placeholder = "operator-id";
  inU.id = "username";
  
  var lP = el("div", "iml-label", "<i class='fa fa-key'></i> Password");
  lP.innerHTML = "<i class='fa fa-key'></i> Password";
  var inP = el("input", "iml-input form-control");
  inP.type = "password";
  inP.placeholder = "auth-key";
  inP.id = "password";
  
  append(cU, [lU, inU]);
  append(cP, [lP, inP]);
  append(r1, [cU, cP]);

  var r2 = el("div", "row");
  var cBtn = el("div", "col-xs-12");
  var btnLogin = el("button", "btn btn-iml btn-block", "Loading...");
  btnLogin.innerHTML = "<i class='fa fa-sign-in'></i> Loading...";
  btnLogin.type = "button";
  btnLogin.disabled = true;
  refs.loginBtn = btnLogin;
  append(cBtn, [btnLogin]);
  r2.appendChild(cBtn);

  append(body, [r1, el("hr"), r2]);
  append(panel, [heading, body]);
  
  // Event listeners
  btnLogin.addEventListener("click", function() {
    onLogin(inU.value.trim(), inP.value.trim());
  });

  inP.addEventListener("keyup", function(e) {
    if (e.key === "Enter") onLogin(inU.value.trim(), inP.value.trim());
  });
  
  return panel;
}

function buildDashboardPanel() {
  var panel = el("div", "panel panel-iml");
  var heading = el("div", "panel-heading", "<i class='fa fa-dashboard'></i> Earning Console");
  heading.innerHTML = "<i class='fa fa-dashboard'></i> Earning Console";
  var body = el("div", "panel-body");

  var stRow = el("div", "row");
  var stCol = el("div", "col-xs-12");
  var stLbl = el("span", "iml-label", "<i class='fa fa-info-circle'></i> Account: ");
  stLbl.innerHTML = "<i class='fa fa-info-circle'></i> Account: ";
  var stChip = el("span", "iml-status-chip", "Inactive");
  stCol.appendChild(stLbl);
  stCol.appendChild(stChip);
  stRow.appendChild(stCol);
  refs.statusChip = stChip;

  var statGrid = el("div", "iml-stat-grid");
  function mkStat(label, key, sub, icon) {
    var box = el("div", "iml-stat");
    var l = el("div", "iml-stat-label", "");
    l.innerHTML = "<i class='fa " + icon + "'></i> " + label;
    var v = el("div", "iml-stat-val", "0");
    var s = el("div", "iml-stat-sub", sub || "");
    refs["stat_" + key] = v;
    append(box, [l, v, s]);
    return box;
  }
  
  var sRate = mkStat("Rate", "rate", "PTS per correct", "fa-bolt");
  var sPts = mkStat("PTS", "pts", "Current score", "fa-star");
  var sRev = mkStat("Reversal", "rev", "Quality check %", "fa-line-chart");
  var sHold = mkStat("Hold", "hold", "PTS on hold", "fa-clock-o");
  append(statGrid, [sRate, sPts, sRev, sHold]);

  refs.qMsg = el("div", "iml-inline-msg");
  refs.qMsg.style.display = "none";

  var qTitle = el("div", "iml-label", "<i class='fa fa-question-circle'></i> Answer console");
  qTitle.innerHTML = "<i class='fa fa-question-circle'></i> Answer console";
  qTitle.style.margin = "15px 0 10px";

  function makeQBlock(idx) {
    var wrap = el("div", "iml-q-block");
    wrap.id = "qblock-" + idx;
    var lab = el("div", "iml-q-label", "#" + idx);
    var txt = el("div", "iml-q-text", "Loading question...");
    var inp = el("input", "iml-input form-control");
    inp.placeholder = "Type answer for #" + idx;
    inp.id = "q" + idx;
    var btnRow = el("div", "text-right");
    var btn = el("button", "btn btn-iml btn-sm", "Submit");
    btn.innerHTML = "<i class='fa fa-paper-plane'></i> Submit";
    btn.dataset.qid = idx;
    btnRow.appendChild(btn);
    append(wrap, [lab, txt, inp, btnRow]);
    return { root: wrap, text: txt, input: inp, button: btn };
  }

  var q1 = makeQBlock(1);
  var q2 = makeQBlock(2);
  var q3 = makeQBlock(3);
  refs.qBlocks = [q1, q2, q3];

  var logoutRow = el("div", "row");
  var logoutCol = el("div", "col-xs-12 text-right");
  var btnLogout = el("button", "btn btn-iml", "Logout");
  btnLogout.innerHTML = "<i class='fa fa-sign-out"></i> Logout";
  logoutCol.appendChild(btnLogout);
  logoutRow.appendChild(logoutCol);

  // Event listeners for questions
  refs.qBlocks.forEach(function(q, idx) {
    q.button.addEventListener("click", function() {
      onAnswer(idx + 1, q.input);
    });
    q.input.addEventListener("keyup", function(e) {
      if (e.key === "Enter") onAnswer(idx + 1, q.input);
    });
  });

  btnLogout.addEventListener("click", onLogout);

  append(body, [stRow, el("br"), statGrid, el("hr"), qTitle, refs.qMsg, q1.root, q2.root, q3.root, el("hr"), logoutRow]);
  append(panel, [heading, body]);
  
  // Apply user data
  if (state.user) {
    applyUserToUI();
  }
  
  return panel;
}

// ==== UI BUILD ========================================================
function buildLayout() {
  document.body.innerHTML = "";
  var shell = el("div", "iml-shell");

  // Saving indicator
  var savingIndicator = el("div", "iml-saving");
  savingIndicator.innerHTML = "<i class='fa fa-save'></i> Saving...";
  savingIndicator.id = "savingIndicator";
  shell.appendChild(savingIndicator);

  // Offline indicator
  var offlineIndicator = el("div", "iml-offline");
  offlineIndicator.innerHTML = "<i class='fa fa-wifi'></i> Offline Mode";
  offlineIndicator.id = "offlineIndicator";
  shell.appendChild(offlineIndicator);

  // MOBILE HEADER
  var mobileHeader = el("div", "iml-mobile-header");
  var mobileLogo = el("div", "logo", "");
  mobileLogo.innerHTML = "<i class='fa fa-signal'></i> IML CONSOLE";
  mobileHeader.appendChild(mobileLogo);
  shell.appendChild(mobileHeader);

  // DESKTOP NAV
  var nav = el("nav", "navbar navbar-iml");
  var navC = el("div", "container-fluid");
  var nh = el("div", "navbar-header");
  var brand = el("a", "navbar-brand", "");
  brand.innerHTML = "<i class='fa fa-signal'></i> IML CONSOLE";
  brand.href = "#";
  nh.appendChild(brand);
  
  var ul = el("ul", "nav navbar-nav");
  var navItems = [
    {text: "HOME", icon: "fa-home", page: "home", active: true},
    {text: "EARN", icon: "fa-money", page: "earn"},
    {text: "SHOP", icon: "fa-shopping-cart", page: "shop"},
    {text: "LEADERS", icon: "fa-trophy", page: "leaders"},
    {text: "HELP", icon: "fa-question-circle", page: "help"},
    {text: "CHAT", icon: "fa-comments", page: "chat"}
  ];
  
  navItems.forEach(function(item) {
    var li = el("li", item.active ? "active" : "");
    var a = el("a", "", "");
    a.innerHTML = "<i class='fa " + item.icon + "'></i> " + item.text;
    a.href = "#";
    a.onclick = function(e) {
      e.preventDefault();
      navigateTo(item.page);
      // Update nav active state
      document.querySelectorAll('.navbar-nav li').forEach(function(li) {
        li.classList.remove('active');
      });
      li.classList.add('active');
    };
    li.appendChild(a);
    ul.appendChild(li);
  });
  
  append(navC, [nh, ul]);
  nav.appendChild(navC);

  // PROMO BAR
  var promo = el("div", "iml-promo", "Secure Login - Live Google Sheets Sync - Redeem Bonuses - Cashout Available");

  // MAIN CONTENT AREA
  var main = el("div", "iml-main container-fluid");
  main.id = "mainContent";
  
  // Build all pages
  var pagesContainer = el("div", "");
  pagesContainer.appendChild(buildHomePage());
  pagesContainer.appendChild(buildEarnPage());
  pagesContainer.appendChild(buildShopPage());
  pagesContainer.appendChild(buildLeadersPage());
  pagesContainer.appendChild(buildHelpPage());
  pagesContainer.appendChild(buildChatPage());
  
  main.appendChild(pagesContainer);
  
  append(shell, [nav, promo, main]);
  document.body.appendChild(shell);

  // MOBILE NAV
  var bottom = el("div", "iml-bottom-nav");
  var bottomItems = [
    {text: "HOME", icon: "fa-home", page: "home", active: true},
    {text: "EARN", icon: "fa-money", page: "earn"},
    {text: "SHOP", icon: "fa-shopping-cart", page: "shop"},
    {text: "LEADERS", icon: "fa-trophy", page: "leaders"},
    {text: "HELP", icon: "fa-question-circle", page: "help"},
    {text: "CHAT", icon: "fa-comments", page: "chat"}
  ];
  
  bottomItems.forEach(function(item) {
    var b = el("button", item.active ? "active" : "", "");
    b.innerHTML = "<i class='fa " + item.icon + "'></i><br>" + item.text;
    b.onclick = function() {
      navigateTo(item.page);
      // Update mobile nav active state
      bottom.querySelectorAll('button').forEach(function(btn) {
        btn.classList.remove('active');
      });
      b.classList.add('active');
    };
    bottom.appendChild(b);
  });
  document.body.appendChild(bottom);
}

// ==== NAVIGATION ======================================================
function navigateTo(page) {
  state.currentPage = page;
  
  // Hide all pages
  document.querySelectorAll('.iml-page').forEach(function(pageEl) {
    pageEl.classList.remove('active');
  });
  
  // Show selected page
  var pageEl = document.querySelector('.' + page + '-page');
  if (pageEl) {
    pageEl.classList.add('active');
  }
  
  // Update page title
  var titles = {
    'home': 'IML Console - Dashboard',
    'earn': 'IML Console - Earn PTS',
    'shop': 'IML Console - Rewards Shop',
    'leaders': 'IML Console - Leaderboard',
    'help': 'IML Console - Help & Support',
    'chat': 'IML Console - Live Chat'
  };
  
  if (titles[page]) {
    document.title = titles[page];
  }
}

// ==== UI HELPERS ======================================================
function showSaving() {
  var indicator = document.getElementById('savingIndicator');
  if (indicator) {
    indicator.style.display = 'block';
    indicator.innerHTML = "<i class='fa fa-save'></i> Saving to Google Sheets...";
    setTimeout(() => {
      indicator.innerHTML = "<i class='fa fa-check'></i> Saved!";
      setTimeout(() => indicator.style.display = 'none', 1000);
    }, 1000);
  }
}

function showOffline() {
  var indicator = document.getElementById('offlineIndicator');
  if (indicator) {
    indicator.style.display = 'block';
    setTimeout(() => indicator.style.display = 'none', 3000);
  }
}

function showMessage(msg, type, container) {
  var msgDiv = el("div", "iml-inline-msg text-" + type);
  msgDiv.textContent = msg;
  msgDiv.style.marginTop = "15px";
  msgDiv.style.marginBottom = "15px";
  
  // Remove any existing message
  var existingMsg = container.querySelector('.iml-inline-msg');
  if (existingMsg) {
    existingMsg.remove();
  }
  
  container.insertBefore(msgDiv, container.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(function() {
    if (msgDiv.parentNode) {
      msgDiv.remove();
    }
  }, 5000);
}

// ==== USER FUNCTIONS ==================================================
function findUser(username, password) {
  if (!state.loaded) {
    showLoginMessage("Database not loaded. Please wait...", "error");
    return null;
  }

  username = username.toLowerCase();
  for (var i = 0; i < state.rows.length; i++) {
    var r = state.rows[i];
    var rUsername = (r.Username || "").toLowerCase();
    var rPassword = r.Password || "";

    if (rUsername === username && rPassword === password) {
      return {
        username: r.Username,
        password: r.Password,
        status: r.Status || "Inactive",
        reversal: parseFloat(r.Reversal || "0") || 0,
        pts: parseFloat(r.PTS || "0") || 0,
        rate: parseFloat(r.Rate || BASE_RATE) || BASE_RATE,
        q1: r["#1"] || "",
        q2: r["#2"] || "",
        q3: r["#3"] || "",
        ans1: r.Ans1 || "",
        ans2: r.Ans2 || "",
        ans3: r.Ans3 || ""
      };
    }
  }
  return null;
}

function showLoginMessage(msg, type) {
  if (!refs.loginMsg) return;
  refs.loginMsg.textContent = msg;
  refs.loginMsg.className = "iml-inline-msg";
  refs.loginMsg.style.display = "block";
  
  refs.loginMsg.classList.remove("text-success", "text-danger", "text-info", "text-warning");
  
  if (type === "error") refs.loginMsg.classList.add("text-danger");
  else if (type === "success") refs.loginMsg.classList.add("text-success");
  else if (type === "info") refs.loginMsg.classList.add("text-info");
  else if (type === "warning") refs.loginMsg.classList.add("text-warning");
}

async function onLogin(u, p) {
  if (!refs.loginMsg) return;
  refs.loginMsg.style.display = "none";

  if (!state.loaded) {
    showLoginMessage("Database still loading...", "error");
    return;
  }

  if (!u || !p) {
    showLoginMessage("Enter username and password", "error");
    return;
  }

  var user = findUser(u, p);
  if (!user) {
    showLoginMessage("Invalid credentials", "error");
    return;
  }

  state.user = user;
  state.pts = user.pts;
  state.reversal = user.reversal;
  state.correct = 0;
  state.attempts = 0;
  state.answeredQuestions = [];

  showLoginMessage("Login successful!", "success");
  
  // Update UI
  setTimeout(function() {
    // Rebuild the home page to show dashboard
    var homePage = document.querySelector('.home-page');
    if (homePage) {
      homePage.innerHTML = '';
      homePage.appendChild(buildDashboardPanel());
    }
    
    // Update points on other pages if they exist
    updatePointsOnAllPages();
  }, 500);
}

function applyUserToUI() {
  // Status chip
  if (refs.statusChip) {
    if ((state.user.status || "").toLowerCase() === "active") {
      refs.statusChip.classList.remove("inactive");
      refs.statusChip.textContent = "Active";
    } else {
      refs.statusChip.classList.add("inactive");
      refs.statusChip.textContent = state.user.status || "Inactive";
    }
  }

  // Stats
  if (refs.stat_rate) refs.stat_rate.textContent = BASE_RATE.toFixed(0);
  if (refs.stat_pts) refs.stat_pts.textContent = state.pts.toFixed(2);
  if (refs.stat_rev) refs.stat_rev.textContent = state.reversal.toFixed(2) + "%";
  updateHold();

  // Questions
  if (refs.qBlocks && refs.qBlocks[0] && state.user.q1) {
    refs.qBlocks[0].text.textContent = state.user.q1;
    resetQuestionDisplay(1);
  }
  if (refs.qBlocks && refs.qBlocks[1] && state.user.q2) {
    refs.qBlocks[1].text.textContent = state.user.q2;
    resetQuestionDisplay(2);
  }
  if (refs.qBlocks && refs.qBlocks[2] && state.user.q3) {
    refs.qBlocks[2].text.textContent = state.user.q3;
    resetQuestionDisplay(3);
  }

  if (refs.qMsg) {
    refs.qMsg.textContent = "Type exact answers. Correct = +5 PTS.";
    refs.qMsg.className = "iml-inline-msg text-info";
    refs.qMsg.style.display = "block";
  }
}

function updatePointsOnAllPages() {
  // Update points display on shop page
  var shopPoints = document.querySelector('.shop-page .iml-stat-val');
  if (shopPoints) {
    shopPoints.textContent = state.pts.toFixed(2) + " PTS";
  }
  
  // Update purchase button states
  document.querySelectorAll('.shop-page .btn-iml').forEach(function(btn) {
    var costMatch = btn.closest('.iml-shop-item')?.querySelector('.iml-shop-item-cost')?.textContent;
    if (costMatch) {
      var cost = parseInt(costMatch);
      if (state.pts < cost) {
        btn.disabled = true;
      } else {
        btn.disabled = false;
      }
    }
  });
}

function resetQuestionDisplay(qId) {
  if (!refs.qBlocks || !refs.qBlocks[qId - 1]) return;
  var qBlock = refs.qBlocks[qId - 1];
  qBlock.root.classList.remove("answered");
  qBlock.input.disabled = false;
  qBlock.input.value = "";
  qBlock.button.disabled = false;
  qBlock.button.innerHTML = "<i class='fa fa-paper-plane'></i> Submit";
}

function updateHold() {
  var hold = 0;
  if (state.reversal >= REVERSAL_THRESHOLD && state.pts >= 20) {
    hold = state.pts * (state.reversal / 100);
  }
  if (refs.stat_hold) {
    refs.stat_hold.textContent = hold.toFixed(2) + " PTS / " + HOLD_DAYS + " days";
  }
}

// ==== MAIN ANSWER FUNCTION ============================================
async function onAnswer(idx, inputEl) {
  if (!state.user) {
    if (refs.qMsg) {
      refs.qMsg.textContent = "Please login first";
      refs.qMsg.className = "iml-inline-msg text-danger";
      refs.qMsg.style.display = "block";
    }
    return;
  }

  var v = (inputEl.value || "").trim();
  if (!v) {
    if (refs.qMsg) {
      refs.qMsg.textContent = "Enter an answer for #" + idx;
      refs.qMsg.className = "iml-inline-msg text-warning";
      refs.qMsg.style.display = "block";
    }
    return;
  }

  // Check if already answered
  if (state.answeredQuestions.includes(idx)) {
    if (refs.qMsg) {
      refs.qMsg.textContent = "Question #" + idx + " already answered!";
      refs.qMsg.className = "iml-inline-msg text-warning";
      refs.qMsg.style.display = "block";
    }
    return;
  }

  var expected = "";
  if (idx === 1) expected = state.user.ans1.trim();
  if (idx === 2) expected = state.user.ans2.trim();
  if (idx === 3) expected = state.user.ans3.trim();

  state.attempts += 1;
  var correct = expected && v.toLowerCase() === expected.toLowerCase();

  if (correct) {
    state.correct += 1;
    state.pts += POINTS_PER_CORRECT;
    state.answeredQuestions.push(idx);
    
    // Update UI
    if (refs.stat_pts) refs.stat_pts.textContent = state.pts.toFixed(2);
    if (refs.qMsg) {
      refs.qMsg.textContent = "Correct! +5 PTS. Saving to Google Sheets...";
      refs.qMsg.className = "iml-inline-msg text-success";
    }
    
    // Disable question
    var qBlock = refs.qBlocks[idx - 1];
    if (qBlock) {
      qBlock.root.classList.add("answered");
      qBlock.input.disabled = true;
      qBlock.button.disabled = true;
      qBlock.button.innerHTML = "<i class='fa fa-check'></i> Answered";
      inputEl.value = "";
    }
    
    // Show saving indicator
    showSaving();
    
    // Update points on other pages
    updatePointsOnAllPages();
    
    // CRITICAL: UPDATE GOOGLE SHEETS
    try {
      // Step 1: Submit answer to sheet
      const result = await submitAnswerToSheet(state.user.username, idx, v);
      
      if (result.success) {
        // Step 2: Update points in sheet
        const updateResult = await updateUserInSheet(state.user.username, {
          PTS: state.pts.toFixed(2),
          Reversal: state.reversal.toFixed(2)
        });
        
        if (updateResult) {
          if (refs.qMsg) {
            refs.qMsg.textContent = "✓ Correct! +5 PTS saved to Google Sheets!";
          }
          console.log("✅ Sheet updated successfully!");
        } else {
          if (refs.qMsg) {
            refs.qMsg.textContent = "✓ Correct! +5 PTS (Sheet update failed)";
          }
          showOffline();
        }
      } else {
        if (refs.qMsg) {
          refs.qMsg.textContent = "✓ Correct! +5 PTS (Save failed)";
        }
        showOffline();
      }
    } catch (error) {
      console.error("Error updating sheet:", error);
      if (refs.qMsg) {
        refs.qMsg.textContent = "✓ Correct! +5 PTS (Network error)";
      }
      showOffline();
    }
    
    // Update question text
    setTimeout(() => {
      if (qBlock && qBlock.text) {
        qBlock.text.textContent = "✓ Answered correctly";
      }
    }, 1000);
  } else {
    if (refs.qMsg) {
      refs.qMsg.textContent = "Incorrect. Try again.";
      refs.qMsg.className = "iml-inline-msg text-warning";
      refs.qMsg.style.display = "block";
    }
  }

  // Update reversal
  var ratio = state.correct / state.attempts;
  state.reversal = (1 - ratio) * 5;
  if (state.reversal < 0) state.reversal = 0;
  if (state.reversal > 5) state.reversal = 5;
  
  if (refs.stat_rev) refs.stat_rev.textContent = state.reversal.toFixed(2) + "%";
  updateHold();
}

function onLogout() {
  state.user = null;
  state.pts = 0;
  state.reversal = 0;
  state.correct = 0;
  state.attempts = 0;
  state.answeredQuestions = [];

  // Rebuild home page with login
  var homePage = document.querySelector('.home-page');
  if (homePage) {
    homePage.innerHTML = '';
    homePage.appendChild(buildLoginPanel());
  }
  
  // Clear login fields if they exist
  var usernameInput = document.getElementById('username');
  var passwordInput = document.getElementById('password');
  if (usernameInput) usernameInput.value = "";
  if (passwordInput) passwordInput.value = "";
}

// ==== INIT ============================================================
document.addEventListener("DOMContentLoaded", function() {
  injectAssets();
  buildLayout();

  // Load users
  fetchUsers().then(function(rows) {
    console.log("Loaded " + rows.length + " users");
  }).catch(function(error) {
    console.error("Load error:", error);
  });
});
