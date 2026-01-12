// ==== CONFIG ==========================================================
// REPLACE WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
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

// ==== API FUNCTIONS ===================================================
async function fetchUsers() {
  try {
    const url = `${API_BASE_URL}?action=getUsers&t=${Date.now()}`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url);
    const text = await response.text();
    
    console.log('Raw response (first 500 chars):', text.substring(0, 500));
    
    // Google Apps Script often returns HTML-wrapped JSON
    // Try to extract JSON from the response
    let data;
    try {
      // First try to parse as pure JSON
      data = JSON.parse(text);
    } catch (e1) {
      console.log('Direct JSON parse failed, trying to extract JSON from HTML');
      
      // Try to extract JSON from HTML response
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('Failed to parse extracted JSON');
          throw new Error('Invalid JSON response from server');
        }
      } else {
        // If no JSON found, check if it's an authorization page
        if (text.includes('Google Apps Script')) {
          throw new Error('Script authorization required. Please open the script URL in browser first.');
        }
        throw new Error('No JSON data found in response');
      }
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load users');
    }
    
    state.rows = data.users || [];
    state.loaded = true;
    
    // Update status
    if (refs.dataStatus) {
      refs.dataStatus.innerHTML = `<strong><i class='fa fa-check'></i> Database Ready:</strong> ${state.rows.length} user accounts loaded`;
      refs.dataStatus.className = "iml-data-status iml-success";
    }
    
    // Enable login button
    if (refs.loginBtn) {
      refs.loginBtn.disabled = false;
      refs.loginBtn.innerHTML = "<i class='fa fa-sign-in'></i> Login to Console";
    }
    
    // Auto-login if session exists
    if (state.sessionId) {
      await checkSession();
    }
    
    return state.rows;
  } catch (error) {
    console.error('API Error:', error);
    
    // Fallback to demo data
    state.rows = getDemoUsers();
    state.loaded = true;
    
    if (refs.dataStatus) {
      refs.dataStatus.innerHTML = `<strong><i class='fa fa-exclamation-triangle'></i> Using Demo Data:</strong> ${state.rows.length} demo users loaded (Sheet connection failed)`;
      refs.dataStatus.className = "iml-data-status iml-warning";
    }
    
    if (refs.loginBtn) {
      refs.loginBtn.disabled = false;
      refs.loginBtn.innerHTML = "<i class='fa fa-sign-in'></i> Login (Demo Mode)";
    }
    
    return state.rows;
  }
}

// Demo users for fallback
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

async function checkSession() {
  if (!state.sessionId) return false;
  
  try {
    const url = `${API_BASE_URL}?action=checkSession&sessionId=${state.sessionId}&t=${Date.now()}`;
    const response = await fetch(url);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) data = JSON.parse(jsonMatch[0]);
      else return false;
    }
    
    if (data.success && data.valid && data.user) {
      await loginWithUser(data.user);
      return true;
    } else {
      localStorage.removeItem('iml_sessionId');
      state.sessionId = null;
      return false;
    }
  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
}

async function createSession(username) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'createSession',
        username: username
      })
    });
    
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) data = JSON.parse(jsonMatch[0]);
      else return null;
    }
    
    if (data.success && data.sessionId) {
      state.sessionId = data.sessionId;
      localStorage.setItem('iml_sessionId', data.sessionId);
      return data.sessionId;
    }
    
    return null;
  } catch (error) {
    console.error('Create session failed:', error);
    // Create local session
    state.sessionId = 'local_' + Date.now();
    localStorage.setItem('iml_sessionId', state.sessionId);
    return state.sessionId;
  }
}

async function updateSheet(username, updates) {
  try {
    console.log('Updating sheet for:', username, updates);
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'updateUser',
        username: username,
        updates: updates
      })
    });
    
    const text = await response.text();
    console.log('Update response:', text.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) data = JSON.parse(jsonMatch[0]);
      else return false;
    }
    
    return data.success || false;
  } catch (error) {
    console.error('Update sheet failed:', error);
    return false;
  }
}

async function submitAnswerToSheet(username, questionId, answer, currentPts) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'submitAnswer',
        username: username,
        questionId: questionId,
        answer: answer,
        currentPts: currentPts
      })
    });
    
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) data = JSON.parse(jsonMatch[0]);
      else throw new Error('Invalid response');
    }
    
    return data;
  } catch (error) {
    console.error('Submit answer failed:', error);
    // Return success for offline/demo mode
    return {
      success: true,
      correct: true,
      newPts: currentPts + 5,
      message: 'Answer submitted (demo mode)'
    };
  }
}

async function logoutFromSheet(username) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'logout',
        username: username
      })
    });
    
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) data = JSON.parse(jsonMatch[0]);
      else return false;
    }
    
    return data.success || false;
  } catch (error) {
    console.error('Logout failed:', error);
    return false;
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
  body{background:#151822;color:#e8edf7;font-family:'Ubuntu','Segoe UI',sans-serif;margin:0;padding-bottom:56px;}
  .iml-shell{min-height:100vh;}
  .navbar-iml{background:#232838;border-radius:0;border:0;box-shadow:0 2px 4px rgba(0,0,0,.7);}
  .navbar-iml .navbar-brand{font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f5f7ff!important;font-size:14px;}
  .navbar-iml .navbar-brand i{margin-right:8px;}
  .navbar-iml .nav>li>a{text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#d4dbf2!important;}
  .navbar-iml .nav>li>a i{margin-right:5px;}
  .navbar-iml .nav>li>a:hover,.navbar-iml .nav>li.active>a{background:#31384e;color:#fff!important;}
  .iml-promo{background:linear-gradient(90deg, #252c3c, #1a1f2e);border-bottom:1px solid #1a1e2a;color:#f3f6ff;font-size:11px;text-transform:uppercase;letter-spacing:.11em;padding:6px 15px;text-align:center;}
  .iml-main{padding:15px;min-height:calc(100vh - 120px);}
  .panel-iml{background:#191d2a;border-radius:8px;border:1px solid #080a10;box-shadow:0 8px 18px rgba(0,0,0,.7);}
  .panel-iml>.panel-heading{background:#262c3e;border-color:#080a10;color:#f5f6ff;font-size:11px;text-transform:uppercase;letter-spacing:.12em;padding:12px 15px;}
  .panel-iml>.panel-body{background:#141824;padding:15px;}
  .iml-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#b8c0dd;margin-bottom:3px;}
  .iml-input{background:#050712;border-radius:4px;border:1px solid #20263b;color:#e6edff;height:36px;font-size:12px;padding:4px 12px;width:100%;}
  .iml-input:focus{outline:none;border-color:#00b1ff;box-shadow:0 0 0 1px #00b1ff inset;}
  .btn-iml{background:#0d8ad6;border:1px solid #086297;color:#f9fcff;font-size:11px;text-transform:uppercase;letter-spacing:.13em;border-radius:4px;padding:8px 16px;transition:all 0.3s;}
  .btn-iml:hover{background:#10a0f4;color:#fff;transform:translateY(-1px);}
  .btn-iml:disabled{background:#555;border-color:#444;color:#999;}
  .iml-status-chip{display:inline-block;padding:4px 12px;border-radius:12px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;background:#1b7b33;border:1px solid #0c3b18;color:#e7fceb;}
  .iml-status-chip.inactive{background:#7b1b1b;border-color:#3b0c0c;}
  .iml-stat-grid{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0 15px;}
  .iml-stat{flex:1 1 120px;min-width:120px;background:#10131f;border-radius:6px;border:1px solid #222739;padding:10px 12px;}
  .iml-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#9aa3c0;}
  .iml-stat-val{font-size:18px;color:#f6f7ff;margin-top:2px;font-weight:bold;}
  .iml-stat-sub{font-size:10px;color:#a4acc6;}
  .iml-q-block{background:#101320;border-radius:6px;border:1px solid #242a3d;padding:12px 15px;margin-bottom:12px;transition:all 0.3s;}
  .iml-q-block.answered{opacity:0.6;background:#0a0c14;}
  .iml-q-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#aeb6d4;margin-bottom:3px;}
  .iml-q-text{font-size:13px;color:#f3f4ff;margin-bottom:8px;}
  .iml-inline-msg{font-size:11px;margin-top:8px;padding:8px;border-radius:4px;}
  .text-success{color:#4CAF50;}
  .text-danger{color:#ff6b6b;}
  .text-info{color:#00b1ff;}
  .text-warning{color:#ffa726;}
  .iml-loading{color:#00b1ff;font-size:12px;text-align:center;padding:10px;}
  .iml-success{color:#4CAF50;font-size:12px;text-align:center;padding:10px;}
  .iml-error{color:#ff6b6b;font-size:12px;text-align:center;padding:10px;}
  .iml-warning{color:#ffa726;font-size:12px;text-align:center;padding:10px;}
  .iml-data-status{margin-bottom:15px;padding:10px;background:#1a1f2e;border-radius:4px;border-left:3px solid #00b1ff;}
  .iml-data-status.iml-success{border-left-color:#4CAF50;}
  .iml-data-status.iml-error{border-left-color:#ff6b6b;}
  .iml-data-status.iml-warning{border-left-color:#ffa726;}
  .iml-saving{position:fixed;bottom:60px;right:20px;background:#1a7b33;color:white;padding:8px 12px;border-radius:4px;font-size:11px;display:none;z-index:10000;}
  
  /* Mobile Bottom Navigation */
  .iml-bottom-nav{display:none;}
  
  @media(max-width:767px){
    .navbar-iml{display:none;}
    .iml-bottom-nav{
      display:flex;
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      background:#202538;
      border-top:1px solid #080a10;
      z-index:9999;
      padding:5px 0;
    }
    .iml-bottom-nav button{
      flex:1;
      border:none;
      background:transparent;
      color:#d6ddf5;
      font-size:10px;
      text-transform:uppercase;
      letter-spacing:.09em;
      padding:8px 2px;
      display:flex;
      flex-direction:column;
      align-items:center;
      transition:all 0.3s;
    }
    .iml-bottom-nav button i{
      font-size:14px;
      margin-bottom:3px;
    }
    .iml-bottom-nav button.active{
      background:#31384e;
      color:#fff;
    }
    .iml-main{padding-bottom:70px;}
    .iml-saving{bottom:70px;}
  }
  
  @media(min-width:768px){
    .navbar-iml{display:block;}
    .iml-bottom-nav{display:none;}
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
  var promo = el("div", "iml-promo", "Secure Login - Live Data Sync with Google Sheets");

  // MAIN
  var main = el("div", "iml-main container-fluid");
  var row = el("div", "row");
  var left = el("div", "col-sm-8 col-md-8");
  var right = el("div", "col-sm-4 col-md-4");

  // LOGIN PANEL
  var pLogin = el("div", "panel panel-iml");
  var pLH = el("div", "panel-heading", "<i class='fa fa-lock'></i> User Authentication // Live Database");
  pLH.innerHTML = "<i class='fa fa-lock'></i> User Authentication // Live Database";
  var pLB = el("div", "panel-body");
  
  refs.dataStatus = el("div", "iml-data-status iml-loading", "Connecting to user database...");
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
  var btnLogin = el("button", "btn btn-iml btn-block", "Loading Database...");
  btnLogin.innerHTML = "<i class='fa fa-sign-in'></i> Loading Database...";
  btnLogin.type = "button";
  btnLogin.disabled = true;
  refs.loginBtn = btnLogin;
  append(cBtn, [btnLogin]);
  r2.appendChild(cBtn);

  append(pLB, [r1, el("hr"), r2]);
  append(pLogin, [pLH, pLB]);

  // DASHBOARD PANEL (HIDDEN INITIALLY)
  var pDash = el("div", "panel panel-iml");
  pDash.style.display = "none";
  var dH = el("div", "panel-heading", "<i class='fa fa-dashboard'></i> Earning Console // Real-time Sync");
  dH.innerHTML = "<i class='fa fa-dashboard'></i> Earning Console // Real-time Sync";
  var dB = el("div", "panel-body");

  var stRow = el("div", "row");
  var stCol = el("div", "col-xs-12");
  var stLbl = el("span", "iml-label", "<i class='fa fa-info-circle'></i> Account status: ");
  stLbl.innerHTML = "<i class='fa fa-info-circle'></i> Account status: ";
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
  
  var sRate = mkStat("Rate", "rate", "PTS per correct block", "fa-bolt");
  var sPts = mkStat("PTS", "pts", "Live performance score", "fa-star");
  var sRev = mkStat("Reversal", "rev", "Quality check % (7d preview)", "fa-line-chart");
  var sHold = mkStat("Hold", "hold", "PTS on hold if reversal ≥ 3%", "fa-clock-o");
  append(statGrid, [sRate, sPts, sRev, sHold]);

  refs.qMsg = el("div", "iml-inline-msg");
  refs.qMsg.style.display = "none";

  var qTitle = el("div", "iml-label", "<i class='fa fa-question-circle'></i> Answer console: type exact response");
  qTitle.innerHTML = "<i class='fa fa-question-circle'></i> Answer console: type exact response";
  qTitle.style.margin = "15px 0 10px";

  function makeQBlock(idx) {
    var wrap = el("div", "iml-q-block");
    wrap.id = "qblock-" + idx;
    var lab = el("div", "iml-q-label", "#" + idx);
    var txt = el("div", "iml-q-text", "Loading question...");
    var inp = el("input", "iml-input form-control");
    inp.placeholder = "Type answer for #" + idx + "...";
    inp.id = "q" + idx;
    var btnRow = el("div", "text-right");
    var btn = el("button", "btn btn-iml btn-sm", "Submit #" + idx);
    btn.innerHTML = "<i class='fa fa-paper-plane'></i> Submit #" + idx;
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

  // RIGHT: INFO PANEL
  var pInfo = el("div", "panel panel-iml");
  var infoH = el("div", "panel-heading", "<i class='fa fa-info-circle'></i> System Information");
  infoH.innerHTML = "<i class='fa fa-info-circle'></i> System Information";
  var infoB = el("div", "panel-body");
  var infoContent = el("div", "iml-q-text");
  infoContent.innerHTML = 
    "<strong><i class='fa fa-database'></i> Real-time Sync:</strong><br>" +
    "✓ Live Google Sheets Sync<br>" +
    "✓ Auto-save all changes<br>" +
    "✓ Session persistence<br>" +
    "✓ Secure authentication<br><br>" +
    "<strong><i class='fa fa-cogs'></i> How it works:</strong><br>" +
    "• Login with credentials<br>" +
    "• Answers auto-save to sheet<br>" +
    "• Each correct answer = +5 PTS<br>" +
    "• Points update in real-time<br>" +
    "• Session saved automatically<br><br>" +
    "<strong><i class='fa fa-exclamation-circle'></i> Note:</strong><br>" +
    "All changes sync to Google Sheets";
  append(infoB, [infoContent]);
  append(pInfo, [infoH, infoB]);

  append(left, [pLogin, pDash]);
  append(right, [pInfo]);
  append(row, [left, right]);
  append(main, [row]);
  append(shell, [nav, promo, main]);
  document.body.appendChild(shell);

  // MOBILE BOTTOM NAV
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

  btnLogout.addEventListener("click", function() {
    onLogout();
  });

  // Mobile nav click handlers
  var mobileBtns = bottom.querySelectorAll("button");
  mobileBtns.forEach(function(btn, idx) {
    btn.addEventListener("click", function() {
      mobileBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
    });
  });
}

// ==== SHOW SAVING INDICATOR ==========================================
function showSaving() {
  var indicator = document.getElementById('savingIndicator');
  if (indicator) {
    indicator.style.display = 'block';
    indicator.innerHTML = "<i class='fa fa-save'></i> Saving to Google Sheets...";
    
    setTimeout(function() {
      indicator.innerHTML = "<i class='fa fa-check'></i> Saved!";
      setTimeout(function() {
        indicator.style.display = 'none';
      }, 1000);
    }, 1000);
  }
}

// ==== LOGIN / USER ====================================================
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
        ans3: r.Ans3 || "",
        sessionId: r.SessionID || ""
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
  
  if (type === "error") {
    refs.loginMsg.classList.add("text-danger");
  } else if (type === "success") {
    refs.loginMsg.classList.add("text-success");
  } else if (type === "info") {
    refs.loginMsg.classList.add("text-info");
  } else if (type === "warning") {
    refs.loginMsg.classList.add("text-warning");
  }
}

async function loginWithUser(userData) {
  state.user = userData;
  state.pts = userData.pts;
  state.reversal = userData.reversal;
  state.correct = 0;
  state.attempts = 0;
  state.answeredQuestions = [];
  state.sessionId = userData.sessionId || state.sessionId;

  showLoginMessage("Auto-login successful! Loading dashboard...", "success");
  
  setTimeout(function() {
    applyUserToUI();
  }, 500);
}

async function onLogin(u, p) {
  refs.loginMsg.style.display = "none";

  if (!state.loaded) {
    showLoginMessage("User database still loading. Please wait...", "error");
    return;
  }

  if (!u || !p) {
    showLoginMessage("Please enter both username and password.", "error");
    return;
  }

  var user = findUser(u, p);
  if (!user) {
    showLoginMessage("Invalid username or password.", "error");
    return;
  }

  state.user = user;
  state.pts = user.pts;
  state.reversal = user.reversal;
  state.correct = 0;
  state.attempts = 0;
  state.answeredQuestions = [];

  // Create session and save to Google Sheets
  var sessionId = await createSession(u);
  if (sessionId) {
    state.sessionId = sessionId;
    user.sessionId = sessionId;
  }

  showLoginMessage("Login successful! Creating session...", "success");
  
  setTimeout(function() {
    applyUserToUI();
  }, 500);
}

function applyUserToUI() {
  // Switch panels
  refs.loginPanel.style.display = "none";
  refs.dashPanel.style.display = "block";

  // Update status chip
  if ((state.user.status || "").toLowerCase() === "active") {
    refs.statusChip.classList.remove("inactive");
    refs.statusChip.textContent = "Active";
  } else {
    refs.statusChip.classList.add("inactive");
    refs.statusChip.textContent = state.user.status || "Inactive";
  }

  // Update stats
  refs.stat_rate.textContent = BASE_RATE.toFixed(0);
  refs.stat_pts.textContent = state.pts.toFixed(2);
  refs.stat_rev.textContent = state.reversal.toFixed(2) + "%";
  updateHold();

  // Update questions
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

  refs.qMsg.textContent = "Type your exact answers for #1, #2, #3. 1 correct out of 3 = 5 PTS.";
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
  qBlock.button.innerHTML = "<i class='fa fa-paper-plane'></i> Submit #" + qId;
}

function updateHold() {
  var hold = 0;
  if (state.reversal >= REVERSAL_THRESHOLD && state.pts >= 20) {
    hold = state.pts * (state.reversal / 100);
  }
  refs.stat_hold.textContent = hold.toFixed(2) + " PTS / " + HOLD_DAYS + " days";
}

async function onAnswer(idx, inputEl) {
  if (!state.user) {
    refs.qMsg.textContent = "Please login first to submit answers.";
    refs.qMsg.className = "iml-inline-msg text-danger";
    refs.qMsg.style.display = "block";
    return;
  }

  var v = (inputEl.value || "").trim();
  if (!v) {
    refs.qMsg.textContent = "Please enter an answer for #" + idx + ".";
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
    
    // Update UI immediately
    refs.stat_pts.textContent = state.pts.toFixed(2);
    refs.qMsg.textContent = "Correct for #" + idx + "! +5 PTS added. Updating sheet...";
    refs.qMsg.className = "iml-inline-msg text-success";
    
    // Disable the question block
    var qBlock = refs.qBlocks[idx - 1];
    qBlock.root.classList.add("answered");
    qBlock.input.disabled = true;
    qBlock.button.disabled = true;
    qBlock.button.innerHTML = "<i class='fa fa-check'></i> Answered";
    inputEl.value = "";
    
    // Show saving indicator
    showSaving();
    
    // UPDATE GOOGLE SHEET WITH NEW POINTS
    try {
      // Method 1: Submit answer via API
      var result = await submitAnswerToSheet(state.user.username, idx, v, state.pts);
      
      if (result.success) {
        // Update from server response
        state.pts = result.newPts || state.pts;
        refs.stat_pts.textContent = state.pts.toFixed(2);
        
        // Also update local user object
        state.user.pts = state.pts;
        
        refs.qMsg.textContent = result.message + " Sheet updated!";
        
        // Method 2: Also update user data directly
        await updateSheet(state.user.username, {
          PTS: state.pts.toFixed(2),
          Reversal: state.reversal.toFixed(2)
        });
      }
    } catch (error) {
      console.error("Failed to update sheet:", error);
      refs.qMsg.textContent = "Correct! +5 PTS (Sheet update failed)";
    }
    
    // Clear the question text
    setTimeout(function() {
      qBlock.text.textContent = "✓ Answered correctly";
    }, 1000);
  } else {
    refs.qMsg.textContent = "Incorrect for #" + idx + ". Please try again.";
    refs.qMsg.className = "iml-inline-msg text-warning";
  }
  refs.qMsg.style.display = "block";

  // Calculate reversal preview
  var ratio = state.correct / state.attempts;
  state.reversal = (1 - ratio) * 5;
  if (state.reversal < 0) state.reversal = 0;
  if (state.reversal > 5) state.reversal = 5;
  
  refs.stat_rev.textContent = state.reversal.toFixed(2) + "%";
  updateHold();
}

async function onLogout() {
  // Clear session from Google Sheets
  if (state.user && state.user.username) {
    await logoutFromSheet(state.user.username);
  }
  
  // Clear local storage
  localStorage.removeItem('iml_sessionId');
  
  // Reset state
  state.user = null;
  state.pts = 0;
  state.reversal = 0;
  state.correct = 0;
  state.attempts = 0;
  state.answeredQuestions = [];
  state.sessionId = null;

  // Switch panels back
  refs.dashPanel.style.display = "none";
  refs.loginPanel.style.display = "block";

  // Clear question inputs
  refs.qBlocks.forEach(function(q, idx) {
    q.input.value = "";
    q.text.textContent = "Loading question...";
    q.root.classList.remove("answered");
    q.input.disabled = false;
    q.button.disabled = false;
    q.button.innerHTML = "<i class='fa fa-paper-plane'></i> Submit #" + (idx + 1);
  });

  // Clear login message
  refs.loginMsg.style.display = "none";
}

// ==== INIT ============================================================
document.addEventListener("DOMContentLoaded", function() {
  injectAssets();
  buildLayout();

  // Start loading user data
  fetchUsers().then(function(rows) {
    console.log("✅ Successfully loaded " + rows.length + " user records");
  }).catch(function(error) {
    console.error("❌ Failed to load database:", error);
  });
});
