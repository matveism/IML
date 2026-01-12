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
  sessionId: localStorage.getItem('iml_sessionId') || null
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
  
  /* Status Chips */
  .iml-status-chip{display:inline-block;padding:5px 15px;border-radius:15px;font-size:11px;text-transform:uppercase;letter-spacing:.12em;background:#00AA00;border:2px solid #00FF00;color:#FFFFFF;font-weight:600;}
  .iml-status-chip.inactive{background:#AA0000;border-color:#FF0000;}
  
  /* Stats Grid */
  .iml-stat-grid{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0 15px;}
  .iml-stat{flex:1 1 120px;min-width:120px;background:#000000;border-radius:6px;border:2px solid #333333;padding:12px 15px;}
  .iml-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#00FFE0;}
  .iml-stat-val{font-size:20px;color:#FFFFFF;margin-top:5px;font-weight:700;}
  .iml-stat-sub{font-size:10px;color:#AAAAAA;}
  
  /* Question Blocks */
  .iml-q-block{background:#000000;border-radius:6px;border:2px solid #333333;padding:15px 18px;margin-bottom:15px;transition:all 0.3s;}
  .iml-q-block.answered{opacity:0.7;background:#111111;border-color:#555555;}
  .iml-q-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#FF00AA;margin-bottom:5px;font-weight:600;}
  .iml-q-text{font-size:14px;color:#FFFFFF;margin-bottom:10px;font-weight:500;}
  
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
    .navbar-iml{display:block;}
  }
  `;
  h.appendChild(st);
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
    {text: "HOME", icon: "fa-home", active: true},
    {text: "EARN", icon: "fa-money"},
    {text: "SHOP", icon: "fa-shopping-cart"},
    {text: "LEADERS", icon: "fa-trophy"},
    {text: "HELP", icon: "fa-question-circle"},
    {text: "CHAT", icon: "fa-comments"}
  ];
  
  navItems.forEach(function(item, i) {
    var li = el("li", item.active ? "active" : "");
    var a = el("a", "", "");
    a.innerHTML = "<i class='fa " + item.icon + "'></i> " + item.text;
    a.href = "#";
    li.appendChild(a);
    ul.appendChild(li);
  });
  
  append(navC, [nh, ul]);
  nav.appendChild(navC);

  // PROMO BAR
  var promo = el("div", "iml-promo", "Secure Login - Live Google Sheets Sync");

  // MAIN
  var main = el("div", "iml-main container-fluid");
  var row = el("div", "row");
  var left = el("div", "col-sm-8 col-md-8");
  var right = el("div", "col-sm-4 col-md-4");

  // LOGIN PANEL
  var pLogin = el("div", "panel panel-iml");
  var pLH = el("div", "panel-heading", "<i class='fa fa-lock'></i> User Authentication");
  pLH.innerHTML = "<i class='fa fa-lock'></i> User Authentication";
  var pLB = el("div", "panel-body");
  
  refs.dataStatus = el("div", "iml-data-status iml-loading", "Connecting to Google Sheets...");
  pLB.appendChild(refs.dataStatus);
  
  refs.loginMsg = el("div", "iml-inline-msg");
  refs.loginMsg.style.display = "none";
  pLB.appendChild(refs.loginMsg);

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

  append(pLB, [r1, el("hr"), r2]);
  append(pLogin, [pLH, pLB]);

  // DASHBOARD PANEL
  var pDash = el("div", "panel panel-iml");
  pDash.style.display = "none";
  var dH = el("div", "panel-heading", "<i class='fa fa-dashboard'></i> Earning Console");
  dH.innerHTML = "<i class='fa fa-dashboard'></i> Earning Console";
  var dB = el("div", "panel-body");

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
  btnLogout.innerHTML = "<i class='fa fa-sign-out'></i> Logout";
  logoutCol.appendChild(btnLogout);
  logoutRow.appendChild(logoutCol);

  append(dB, [stRow, el("br"), statGrid, el("hr"), qTitle, refs.qMsg, q1.root, q2.root, q3.root, el("hr"), logoutRow]);
  append(pDash, [dH, dB]);
  refs.loginPanel = pLogin;
  refs.dashPanel = pDash;

  // RIGHT PANEL
  var pInfo = el("div", "panel panel-iml");
  var infoH = el("div", "panel-heading", "<i class='fa fa-info-circle'></i> Info");
  infoH.innerHTML = "<i class='fa fa-info-circle'></i> Info";
  var infoB = el("div", "panel-body");
  var infoContent = el("div", "iml-q-text");
  infoContent.innerHTML = 
    "<strong>Google Sheets Sync:</strong><br>" +
    "✓ Real-time updates<br>" +
    "✓ Points saved instantly<br>" +
    "✓ Session persistence<br><br>" +
    "<strong>How it works:</strong><br>" +
    "• Login with credentials<br>" +
    "• Answer questions to earn PTS<br>" +
    "• Each correct = +5 PTS<br>" +
    "• PTS save to Google Sheets<br>" +
    "• Questions disappear after answer";
  append(infoB, [infoContent]);
  append(pInfo, [infoH, infoB]);

  append(left, [pLogin, pDash]);
  append(right, [pInfo]);
  append(row, [left, right]);
  append(main, [row]);
  append(shell, [nav, promo, main]);
  document.body.appendChild(shell);

  // MOBILE NAV
  var bottom = el("div", "iml-bottom-nav");
  var bottomItems = [
    {text: "HOME", icon: "fa-home", active: true},
    {text: "EARN", icon: "fa-money"},
    {text: "SHOP", icon: "fa-shopping-cart"},
    {text: "LEADERS", icon: "fa-trophy"},
    {text: "HELP", icon: "fa-question-circle"},
    {text: "CHAT", icon: "fa-comments"}
  ];
  
  bottomItems.forEach(function(item) {
    var b = el("button", item.active ? "active" : "", "");
    b.innerHTML = "<i class='fa " + item.icon + "'></i><br>" + item.text;
    bottom.appendChild(b);
  });
  document.body.appendChild(bottom);

  // EVENT LISTENERS
  btnLogin.addEventListener("click", function() {
    onLogin(inU.value.trim(), inP.value.trim());
  });

  inP.addEventListener("keyup", function(e) {
    if (e.key === "Enter") onLogin(inU.value.trim(), inP.value.trim());
  });

  refs.qBlocks.forEach(function(q, idx) {
    q.button.addEventListener("click", function() {
      onAnswer(idx + 1, q.input);
    });
    q.input.addEventListener("keyup", function(e) {
      if (e.key === "Enter") onAnswer(idx + 1, q.input);
    });
  });

  btnLogout.addEventListener("click", onLogout);

  var mobileBtns = bottom.querySelectorAll("button");
  mobileBtns.forEach(function(btn, idx) {
    btn.addEventListener("click", function() {
      mobileBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
    });
  });
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

async function onLogin(u, p) {
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
  
  setTimeout(applyUserToUI, 500);
}

function applyUserToUI() {
  refs.loginPanel.style.display = "none";
  refs.dashPanel.style.display = "block";

  // Status chip
  if ((state.user.status || "").toLowerCase() === "active") {
    refs.statusChip.classList.remove("inactive");
    refs.statusChip.textContent = "Active";
  } else {
    refs.statusChip.classList.add("inactive");
    refs.statusChip.textContent = state.user.status || "Inactive";
  }

  // Stats
  refs.stat_rate.textContent = BASE_RATE.toFixed(0);
  refs.stat_pts.textContent = state.pts.toFixed(2);
  refs.stat_rev.textContent = state.reversal.toFixed(2) + "%";
  updateHold();

  // Questions
  if (state.user.q1) {
    refs.qBlocks[0].text.textContent = state.user.q1;
    resetQuestionDisplay(1);
  }
  if (state.user.q2) {
    refs.qBlocks[1].text.textContent = state.user.q2;
    resetQuestionDisplay(2);
  }
  if (state.user.q3) {
    refs.qBlocks[2].text.textContent = state.user.q3;
    resetQuestionDisplay(3);
  }

  refs.qMsg.textContent = "Type exact answers. Correct = +5 PTS.";
  refs.qMsg.className = "iml-inline-msg text-info";
  refs.qMsg.style.display = "block";

  // Clear login fields
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

function resetQuestionDisplay(qId) {
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
  refs.stat_hold.textContent = hold.toFixed(2) + " PTS / " + HOLD_DAYS + " days";
}

// ==== MAIN ANSWER FUNCTION ============================================
async function onAnswer(idx, inputEl) {
  if (!state.user) {
    refs.qMsg.textContent = "Please login first";
    refs.qMsg.className = "iml-inline-msg text-danger";
    refs.qMsg.style.display = "block";
    return;
  }

  var v = (inputEl.value || "").trim();
  if (!v) {
    refs.qMsg.textContent = "Enter an answer for #" + idx;
    refs.qMsg.className = "iml-inline-msg text-warning";
    refs.qMsg.style.display = "block";
    return;
  }

  // Check if already answered
  if (state.answeredQuestions.includes(idx)) {
    refs.qMsg.textContent = "Question #" + idx + " already answered!";
    refs.qMsg.className = "iml-inline-msg text-warning";
    refs.qMsg.style.display = "block";
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
    refs.stat_pts.textContent = state.pts.toFixed(2);
    refs.qMsg.textContent = "Correct! +5 PTS. Saving to Google Sheets...";
    refs.qMsg.className = "iml-inline-msg text-success";
    
    // Disable question
    var qBlock = refs.qBlocks[idx - 1];
    qBlock.root.classList.add("answered");
    qBlock.input.disabled = true;
    qBlock.button.disabled = true;
    qBlock.button.innerHTML = "<i class='fa fa-check'></i> Answered";
    inputEl.value = "";
    
    // Show saving indicator
    showSaving();
    
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
          refs.qMsg.textContent = "✓ Correct! +5 PTS saved to Google Sheets!";
          console.log("✅ Sheet updated successfully!");
        } else {
          refs.qMsg.textContent = "✓ Correct! +5 PTS (Sheet update failed)";
          showOffline();
        }
      } else {
        refs.qMsg.textContent = "✓ Correct! +5 PTS (Save failed)";
        showOffline();
      }
    } catch (error) {
      console.error("Error updating sheet:", error);
      refs.qMsg.textContent = "✓ Correct! +5 PTS (Network error)";
      showOffline();
    }
    
    // Update question text
    setTimeout(() => {
      qBlock.text.textContent = "✓ Answered correctly";
    }, 1000);
  } else {
    refs.qMsg.textContent = "Incorrect. Try again.";
    refs.qMsg.className = "iml-inline-msg text-warning";
  }
  refs.qMsg.style.display = "block";

  // Update reversal
  var ratio = state.correct / state.attempts;
  state.reversal = (1 - ratio) * 5;
  if (state.reversal < 0) state.reversal = 0;
  if (state.reversal > 5) state.reversal = 5;
  
  refs.stat_rev.textContent = state.reversal.toFixed(2) + "%";
  updateHold();
}

function onLogout() {
  state.user = null;
  state.pts = 0;
  state.reversal = 0;
  state.correct = 0;
  state.attempts = 0;
  state.answeredQuestions = [];

  refs.dashPanel.style.display = "none";
  refs.loginPanel.style.display = "block";

  refs.qBlocks.forEach(function(q, idx) {
    q.input.value = "";
    q.text.textContent = "Loading question...";
    q.root.classList.remove("answered");
    q.input.disabled = false;
    q.button.disabled = false;
    q.button.innerHTML = "<i class='fa fa-paper-plane'></i> Submit";
  });

  refs.loginMsg.style.display = "none";
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
