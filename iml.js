// ==== CONFIG ==========================================================
// Google Sheets CSV URL - Using the export format for your sheet
var CSV_URL = "https://docs.google.com/spreadsheets/d/15-9QTGGm51t_DwxG4VCmxtK_hn2JcEiIORQTE-5QtcY/export?format=csv&gid=0";

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
  csvLoaded: false
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

// ==== CSS + BOOTSTRAP INJECTION =======================================
function injectAssets() {
  var h = document.head;

  var bs = document.createElement("link");
  bs.rel = "stylesheet";
  bs.href = "https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css";
  h.appendChild(bs);

  var font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap";
  h.appendChild(font);

  var st = document.createElement("style");
  st.textContent = ""
  + "body{background:#151822;color:#e8edf7;font-family:'Ubuntu','Segoe UI',sans-serif;margin:0;padding-bottom:56px;}"
  + ".iml-shell{min-height:100vh;}"
  + ".navbar-iml{background:#232838;border-radius:0;border:0;box-shadow:0 2px 4px rgba(0,0,0,.7);}"
  + ".navbar-iml .navbar-brand{font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f5f7ff!important;font-size:14px;}"
  + ".navbar-iml .nav>li>a{text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#d4dbf2!important;}"
  + ".navbar-iml .nav>li>a:hover,.navbar-iml .nav>li.active>a{background:#31384e;color:#fff!important;}"
  + ".iml-promo{background:#252c3c;border-bottom:1px solid #1a1e2a;color:#f3f6ff;font-size:11px;text-transform:uppercase;letter-spacing:.11em;padding:6px 15px;text-align:center;}"
  + ".iml-main{padding:15px;}"
  + ".panel-iml{background:#191d2a;border-radius:2px;border:1px solid #080a10;box-shadow:0 8px 18px rgba(0,0,0,.7);}"
  + ".panel-iml>.panel-heading{background:#262c3e;border-color:#080a10;color:#f5f6ff;font-size:11px;text-transform:uppercase;letter-spacing:.12em;padding:8px 12px;}"
  + ".panel-iml>.panel-body{background:#141824;}"
  + ".iml-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#b8c0dd;margin-bottom:3px;}"
  + ".iml-input{background:#050712;border-radius:2px;border:1px solid #20263b;color:#e6edff;height:30px;font-size:12px;padding:4px 8px;}"
  + ".iml-input:focus{outline:none;border-color:#00b1ff;box-shadow:0 0 0 1px #00b1ff inset;}"
  + ".btn-iml{background:#0d8ad6;border:1px solid #086297;color:#f9fcff;font-size:11px;text-transform:uppercase;letter-spacing:.13em;border-radius:2px;padding:6px 10px;}"
  + ".btn-iml:hover{background:#10a0f4;color:#fff;}"
  + ".iml-status-chip{display:inline-block;padding:2px 8px;border-radius:2px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;background:#1b7b33;border:1px solid #0c3b18;color:#e7fceb;}"
  + ".iml-status-chip.inactive{background:#7b1b1b;border-color:#3b0c0c;}"
  + ".iml-stat-grid{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 10px;}"
  + ".iml-stat{flex:1 1 120px;min-width:120px;background:#10131f;border-radius:2px;border:1px solid #222739;padding:6px 8px;}"
  + ".iml-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#9aa3c0;}"
  + ".iml-stat-val{font-size:16px;color:#f6f7ff;margin-top:2px;}"
  + ".iml-stat-sub{font-size:10px;color:#a4acc6;}"
  + ".iml-q-block{background:#101320;border-radius:2px;border:1px solid #242a3d;padding:8px 10px;margin-bottom:10px;}"
  + ".iml-q-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#aeb6d4;margin-bottom:3px;}"
  + ".iml-q-text{font-size:12px;color:#f3f4ff;margin-bottom:5px;}"
  + ".iml-inline-msg{font-size:11px;margin-top:6px;}"
  + ".iml-loading{color:#00b1ff;font-size:12px;text-align:center;padding:10px;}"
  + ".iml-success{color:#4CAF50;font-size:12px;text-align:center;padding:10px;}"
  + ".iml-error{color:#ff6b6b;font-size:12px;text-align:center;padding:10px;}"
  + ".iml-bottom-nav{display:none;}"
  + ".iml-data-status{margin-bottom:15px;padding:8px;background:#1a1f2e;border-radius:3px;border-left:3px solid #00b1ff;}"
  + "@media(max-width:767px){.navbar-iml{display:none;}.iml-bottom-nav{display:flex;position:fixed;left:0;right:0;bottom:0;background:#202538;border-top:1px solid #080a10;z-index:9999;} .iml-bottom-nav button{flex:1;border:none;background:transparent;color:#d6ddf5;font-size:10px;text-transform:uppercase;letter-spacing:.09em;padding:7px 2px;} .iml-bottom-nav button.active{background:#31384e;}}"
  + "@media(min-width:768px){.navbar-iml{display:block;}}";
  h.appendChild(st);
}

// ==== CSV LOADING =====================================================
function fetchCSV() {
  return fetch(CSV_URL, {
    mode: 'cors',
    cache: 'no-store'
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Failed to load data. Status: ' + response.status);
    }
    return response.text();
  })
  .then(function(csvText) {
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('Data file is empty');
    }
    
    var rows = parseCSV(csvText);
    if (rows.length === 0) {
      throw new Error('No user data found');
    }
    
    state.rows = rows;
    state.csvLoaded = true;
    
    // Update status
    if (refs.dataStatus) {
      refs.dataStatus.innerHTML = "<strong>✓ Database Ready:</strong> " + rows.length + " user accounts loaded";
      refs.dataStatus.className = "iml-data-status iml-success";
    }
    
    // Enable login button
    if (refs.loginBtn) {
      refs.loginBtn.disabled = false;
      refs.loginBtn.textContent = "Login to Console";
    }
    
    return rows;
  })
  .catch(function(error) {
    console.error('CSV loading error:', error);
    
    // Show error but don't use fallback data
    if (refs.dataStatus) {
      refs.dataStatus.innerHTML = "<strong>✗ Connection Error:</strong> Could not load user database. Please check your internet connection.";
      refs.dataStatus.className = "iml-data-status iml-error";
    }
    
    if (refs.loginBtn) {
      refs.loginBtn.disabled = true;
      refs.loginBtn.textContent = "Database Unavailable";
    }
    
    throw error; // Re-throw to prevent login
  });
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
  var lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Parse headers (first line)
  var headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    var values = parseCSVLine(lines[i]);
    var row = {};
    
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j].trim();
      var value = (j < values.length ? values[j].trim() : '');
      row[header] = value;
    }
    
    rows.push(row);
  }
  
  return rows;
}

// Parse a single CSV line, handling quoted fields
function parseCSVLine(line) {
  var values = [];
  var currentValue = '';
  var inQuotes = false;
  
  for (var i = 0; i < line.length; i++) {
    var char = line.charAt(i);
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line.charAt(i + 1) === '"') {
        currentValue += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  values.push(currentValue);
  return values;
}

// ==== UI BUILD ========================================================
function buildLayout() {
  document.body.innerHTML = "";
  var shell = el("div", "iml-shell");

  // DESKTOP NAV
  var nav = el("nav", "navbar navbar-iml");
  var navC = el("div", "container-fluid");
  var nh = el("div", "navbar-header");
  var brand = el("a", "navbar-brand", "IML LOGIN");
  brand.href = "#";
  nh.appendChild(brand);
  var ul = el("ul", "nav navbar-nav");
  ["HOME", "EARN", "SHOP", "LEADERS", "HELP", "CHAT"].forEach(function(txt, i) {
    var li = el("li", i === 1 ? "active" : "");
    var a = el("a", "", txt);
    a.href = "#";
    li.appendChild(a);
    ul.appendChild(li);
  });
  append(navC, [nh, ul]);
  nav.appendChild(navC);

  // PROMO BAR
  var promo = el("div", "iml-promo", "Secure Login - Live Data from Google Sheets");

  // MAIN
  var main = el("div", "iml-main container-fluid");
  var row = el("div", "row");
  var left = el("div", "col-sm-7 col-md-7");
  var right = el("div", "col-sm-5 col-md-5");

  // LOGIN PANEL
  var pLogin = el("div", "panel panel-iml");
  var pLH = el("div", "panel-heading", "User Authentication // Live Database");
  var pLB = el("div", "panel-body");
  
  // Data loading status
  refs.dataStatus = el("div", "iml-data-status iml-loading", "Connecting to user database...");
  pLB.appendChild(refs.dataStatus);
  
  refs.loginMsg = el("div", "iml-inline-msg");
  refs.loginMsg.style.display = "none";
  pLB.appendChild(refs.loginMsg);

  var r1 = el("div", "row");
  var cU = el("div", "col-xs-12 col-sm-6");
  var cP = el("div", "col-xs-12 col-sm-6");
  var lU = el("div", "iml-label", "Username");
  var inU = el("input", "iml-input form-control");
  inU.type = "text";
  inU.placeholder = "operator-id";
  inU.id = "username";
  var lP = el("div", "iml-label", "Password");
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
  var dH = el("div", "panel-heading", "Earning Console // Micro Logic");
  var dB = el("div", "panel-body");

  var stRow = el("div", "row");
  var stCol = el("div", "col-xs-12");
  var stLbl = el("span", "iml-label", "Account status: ");
  var stChip = el("span", "iml-status-chip", "Inactive");
  stCol.appendChild(stLbl);
  stCol.appendChild(stChip);
  stRow.appendChild(stCol);
  refs.statusChip = stChip;

  var statGrid = el("div", "iml-stat-grid");
  function mkStat(label, key, sub) {
    var box = el("div", "iml-stat");
    var l = el("div", "iml-stat-label", label);
    var v = el("div", "iml-stat-val", "0");
    var s = el("div", "iml-stat-sub", sub || "");
    refs["stat_" + key] = v;
    append(box, [l, v, s]);
    return box;
  }
  var sRate = mkStat("Rate", "rate", "PTS per correct block");
  var sPts = mkStat("PTS", "pts", "Live performance score");
  var sRev = mkStat("Reversal", "rev", "Quality check % (7d preview)");
  var sHold = mkStat("Hold", "hold", "PTS on hold if reversal ≥ 3%");
  append(statGrid, [sRate, sPts, sRev, sHold]);

  refs.qMsg = el("div", "iml-inline-msg");
  refs.qMsg.style.display = "none";

  var qTitle = el("div", "iml-label", "Answer console: type exact response");
  qTitle.style.margin = "10px 0 6px";

  function makeQBlock(idx) {
    var wrap = el("div", "iml-q-block");
    var lab = el("div", "iml-q-label", "#" + idx);
    var txt = el("div", "iml-q-text", "Loading question...");
    var inp = el("input", "iml-input form-control");
    inp.placeholder = "type answer for #" + idx;
    inp.id = "q" + idx;
    var btnRow = el("div", "text-right");
    var btn = el("button", "btn btn-iml btn-xs", "Submit #" + idx);
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
  var btnLogout = el("button", "btn btn-iml btn-xs", "Logout");
  logoutCol.appendChild(btnLogout);
  logoutRow.appendChild(logoutCol);

  append(dB, [stRow, el("br"), statGrid, el("hr"), qTitle, refs.qMsg, q1.root, q2.root, q3.root, el("hr"), logoutRow]);
  append(pDash, [dH, dB]);
  refs.loginPanel = pLogin;
  refs.dashPanel = pDash;

  // RIGHT: INFO PANEL
  var pInfo = el("div", "panel panel-iml");
  var infoH = el("div", "panel-heading", "System Information");
  var infoB = el("div", "panel-body");
  var infoContent = el("div", "iml-q-text");
  infoContent.innerHTML = 
    "<strong>Live Data Source:</strong><br>" +
    "✓ Google Sheets Database<br>" +
    "✓ Real-time User Accounts<br>" +
    "✓ Secure Authentication<br><br>" +
    "<strong>How it works:</strong><br>" +
    "• Login with your credentials<br>" +
    "• Answer questions to earn PTS<br>" +
    "• Each correct answer = 5 PTS<br>" +
    "• Monitor your reversal rate<br>" +
    "• PTS may be held if reversal ≥ 3%";
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
  ["HOME", "EARN", "SHOP", "LEADERS", "HELP", "CHAT"].forEach(function(txt, i) {
    var b = el("button", i === 1 ? "active" : "", txt);
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

  [q1, q2, q3].forEach(function(q, idx) {
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
}

// ==== LOGIN / USER ====================================================
function findUser(username, password) {
  if (!state.csvLoaded) {
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
  
  if (type === "error") {
    refs.loginMsg.classList.add("text-danger");
  } else if (type === "success") {
    refs.loginMsg.classList.add("text-success");
  } else if (type === "info") {
    refs.loginMsg.classList.add("text-info");
  } else if (type === "warning") {
    refs.loginMsg.classList.add("text-warning");
  }
  
  refs.loginMsg.style.display = "block";
}

function onLogin(u, p) {
  refs.loginMsg.style.display = "none";

  if (!state.csvLoaded) {
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

  showLoginMessage("Login successful! Loading dashboard...", "success");
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
  if (state.user.q1) refs.qBlocks[0].text.textContent = state.user.q1;
  if (state.user.q2) refs.qBlocks[1].text.textContent = state.user.q2;
  if (state.user.q3) refs.qBlocks[2].text.textContent = state.user.q3;

  refs.qMsg.textContent = "Type your exact answers for #1, #2, #3. 1 correct out of 3 = 5 PTS.";
  refs.qMsg.className = "iml-inline-msg text-info";
  refs.qMsg.style.display = "block";

  // Clear login fields
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

function updateHold() {
  var hold = 0;
  if (state.reversal >= REVERSAL_THRESHOLD && state.pts >= 20) {
    hold = state.pts * (state.reversal / 100);
  }
  refs.stat_hold.textContent = hold.toFixed(2) + " PTS / " + HOLD_DAYS + " days";
}

function onAnswer(idx, inputEl) {
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

  var expected = "";
  if (idx === 1) expected = state.user.ans1.trim();
  if (idx === 2) expected = state.user.ans2.trim();
  if (idx === 3) expected = state.user.ans3.trim();

  state.attempts += 1;
  var correct = expected && v.toLowerCase() === expected.toLowerCase();

  if (correct) {
    state.correct += 1;
    state.pts += POINTS_PER_CORRECT;
    refs.stat_pts.textContent = state.pts.toFixed(2);
    refs.qMsg.textContent = "Correct for #" + idx + "! +5 PTS added.";
    refs.qMsg.className = "iml-inline-msg text-success";
    inputEl.value = "";
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

function onLogout() {
  state.user = null;
  state.pts = 0;
  state.reversal = 0;
  state.correct = 0;
  state.attempts = 0;

  // Switch panels back
  refs.dashPanel.style.display = "none";
  refs.loginPanel.style.display = "block";

  // Clear question inputs
  document.getElementById("q1").value = "";
  document.getElementById("q2").value = "";
  document.getElementById("q3").value = "";

  // Clear login message
  refs.loginMsg.style.display = "none";
}

// ==== INIT ============================================================
document.addEventListener("DOMContentLoaded", function() {
  injectAssets();
  buildLayout();

  // Start loading CSV data immediately
  fetchCSV().then(function(rows) {
    console.log("Successfully loaded " + rows.length + " user records");
  }).catch(function(error) {
    console.error("Failed to load database:", error);
  });
});
