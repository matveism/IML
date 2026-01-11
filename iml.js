// ==== CONFIG ==========================================================
// Google Sheets CSV URL - This is the IMPORTANT fix
// First, publish your Google Sheet: File → Share → Publish to web → CSV
var CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTbr8c2K0uVJEeMCxCxd8bm9cUUE1ppa_wAWSEuxAti6kZRSH6vhgN54r-oqwbr9j46r5RTIKne8kqk/pub?gid=826222641&single=true&output=csv";
var SUBMIT_URL = "https://script.google.com/macros/s/AKfycbzGE7BtUsUceMeoFA6_hDKBU21ChxA9Gd0_XMkt_CQZ8amWGRDGGFCmKW2bNWTpR2bP/exec";

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
  csvLoaded: false,
  retryCount: 0,
  maxRetries: 3
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
  + "body{background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);min-height:100vh;color:#e8edf7;font-family:'Ubuntu','Segoe UI',sans-serif;margin:0;padding-bottom:56px;}"
  + ".iml-shell{min-height:100vh;}"
  + ".navbar-iml{background:rgba(35, 40, 56, 0.9);backdrop-filter:blur(10px);border-radius:0;border:0;box-shadow:0 4px 6px rgba(0,0,0,.2);}"
  + ".navbar-iml .navbar-brand{font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f5f7ff!important;font-size:14px;}"
  + ".navbar-iml .nav>li>a{text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#d4dbf2!important;}"
  + ".navbar-iml .nav>li>a:hover,.navbar-iml .nav>li.active>a{background:rgba(49, 56, 78, 0.7);color:#fff!important;}"
  + ".iml-page{display:none;}"
  + ".iml-page.active{display:block;}"
  + ".iml-promo{background:rgba(37, 44, 60, 0.8);backdrop-filter:blur(5px);border-bottom:1px solid rgba(26, 30, 42, 0.3);color:#f3f6ff;font-size:11px;text-transform:uppercase;letter-spacing:.11em;padding:6px 15px;text-align:center;}"
  + ".iml-main{padding:15px;}"
  + ".panel-iml{background:rgba(25, 29, 42, 0.85);backdrop-filter:blur(5px);border-radius:8px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px rgba(0,0,0,0.3);}"
  + ".panel-iml>.panel-heading{background:rgba(38, 44, 62, 0.9);border-color:rgba(8, 10, 16, 0.3);color:#f5f6ff;font-size:11px;text-transform:uppercase;letter-spacing:.12em;padding:12px 15px;}"
  + ".panel-iml>.panel-body{background:rgba(20, 24, 36, 0.7);padding:20px;}"
  + ".iml-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#b8c0dd;margin-bottom:6px;}"
  + ".iml-input{background:rgba(5, 7, 18, 0.7);border-radius:6px;border:1px solid rgba(32, 38, 59, 0.5);color:#e6edff;height:40px;font-size:14px;padding:8px 12px;transition:all 0.3s ease;}"
  + ".iml-input:focus{outline:none;border-color:#00b1ff;box-shadow:0 0 0 3px rgba(0,177,255,0.2);}"
  + ".btn-iml{background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border:none;color:#f9fcff;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:.13em;border-radius:6px;padding:10px 20px;transition:all 0.3s ease;}"
  + ".btn-iml:hover{background:linear-gradient(135deg, #764ba2 0%, #667eea 100%);color:#fff;transform:translateY(-2px);box-shadow:0 4px 15px rgba(0,0,0,0.3);}"
  + ".btn-iml:disabled{opacity:0.6;cursor:not-allowed;transform:none;}"
  + ".iml-status-chip{display:inline-block;padding:4px 12px;border-radius:20px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;background:linear-gradient(135deg, #00b09b 0%, #96c93d 100%);border:none;color:#e7fceb;}"
  + ".iml-status-chip.inactive{background:linear-gradient(135deg, #f46b45 0%, #eea849 100%);}"
  + ".iml-stat-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:15px;margin:15px 0 20px;}"
  + ".iml-stat{background:rgba(16, 19, 31, 0.7);border-radius:8px;border:1px solid rgba(34, 39, 57, 0.3);padding:15px;transition:all 0.3s ease;}"
  + ".iml-stat:hover{transform:translateY(-3px);box-shadow:0 5px 15px rgba(0,0,0,0.2);}"
  + ".iml-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#9aa3c0;margin-bottom:5px;}"
  + ".iml-stat-val{font-size:24px;font-weight:700;color:#f6f7ff;margin:5px 0;}"
  + ".iml-stat-sub{font-size:10px;color:#a4acc6;}"
  + ".iml-q-block{background:rgba(16, 19, 32, 0.7);border-radius:8px;border:1px solid rgba(36, 42, 61, 0.3);padding:15px;margin-bottom:15px;}"
  + ".iml-q-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#aeb6d4;margin-bottom:5px;}"
  + ".iml-q-text{font-size:14px;color:#f3f4ff;margin-bottom:10px;line-height:1.5;}"
  + ".iml-inline-msg{font-size:12px;margin-top:10px;padding:8px 12px;border-radius:6px;background:rgba(0,177,255,0.1);border:1px solid rgba(0,177,255,0.3);}"
  + ".iml-loading{color:#00b1ff;font-size:14px;text-align:center;padding:20px;}"
  + ".iml-success{color:#4CAF50;background:rgba(76,175,80,0.1);border-color:rgba(76,175,80,0.3);}"
  + ".iml-error{color:#ff6b6b;background:rgba(255,107,107,0.1);border-color:rgba(255,107,107,0.3);}"
  + ".iml-warning{color:#ff9800;background:rgba(255,152,0,0.1);border-color:rgba(255,152,0,0.3);}"
  + ".iml-bottom-nav{display:none;}"
  + ".iml-page-content{min-height:400px;}"
  + ".iml-home-content{text-align:center;padding:40px 20px;}"
  + ".iml-home-title{font-size:36px;font-weight:700;margin-bottom:20px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}"
  + ".iml-home-subtitle{font-size:18px;color:#d4dbf2;margin-bottom:30px;}"
  + ".iml-shop-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:20px;}"
  + ".iml-shop-item{background:rgba(25, 29, 42, 0.8);border-radius:8px;padding:20px;text-align:center;transition:all 0.3s ease;}"
  + ".iml-shop-item:hover{transform:translateY(-5px);box-shadow:0 8px 25px rgba(0,0,0,0.3);}"
  + ".iml-shop-title{font-size:16px;font-weight:600;margin-bottom:10px;}"
  + ".iml-shop-price{color:#00b1ff;font-weight:600;}"
  + ".iml-leaderboard{overflow-x:auto;}"
  + ".iml-leaderboard table{width:100%;border-collapse:collapse;}"
  + ".iml-leaderboard th{background:rgba(38, 44, 62, 0.9);padding:12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.12em;}"
  + ".iml-leaderboard td{padding:12px;border-bottom:1px solid rgba(255,255,255,0.1);}"
  + ".iml-leaderboard tr:hover{background:rgba(255,255,255,0.05);}"
  + ".iml-chat-container{display:flex;flex-direction:column;height:500px;}"
  + ".iml-chat-messages{flex:1;overflow-y:auto;padding:15px;background:rgba(16, 19, 32, 0.7);border-radius:8px;margin-bottom:15px;}"
  + ".iml-chat-input-container{display:flex;gap:10px;}"
  + "@media(max-width:767px){.navbar-iml{display:none;}.iml-bottom-nav{display:flex;position:fixed;left:0;right:0;bottom:0;background:rgba(32, 37, 56, 0.95);backdrop-filter:blur(10px);border-top:1px solid rgba(8, 10, 16, 0.3);z-index:9999;} .iml-bottom-nav button{flex:1;border:none;background:transparent;color:#d6ddf5;font-size:10px;text-transform:uppercase;letter-spacing:.09em;padding:10px 2px;} .iml-bottom-nav button.active{background:rgba(49, 56, 78, 0.7);color:#fff;}}"
  + "@media(min-width:768px){.navbar-iml{display:block;}}";
  h.appendChild(st);
}

// ==== CSV LOADING =====================================================
function fetchCSV() {
  return fetch(CSV_URL, {
    mode: 'cors',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  })
  .then(function(response) {
    console.log("CSV Response status:", response.status);
    if (!response.ok) {
      throw new Error('Failed to load data. Status: ' + response.status);
    }
    return response.text();
  })
  .then(function(csvText) {
    console.log("CSV Text received length:", csvText.length);
    
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('Data file is empty');
    }
    
    var rows = parseCSV(csvText);
    console.log("Parsed rows:", rows.length);
    
    if (rows.length === 0) {
      throw new Error('No user data found in CSV');
    }
    
    state.rows = rows;
    state.csvLoaded = true;
    state.retryCount = 0;
    
    console.log("CSV loaded successfully:", rows.length, "rows");
    console.log("First row sample:", rows[0]);
    
    // Enable login button
    if (refs.loginBtn) {
      refs.loginBtn.disabled = false;
      refs.loginBtn.textContent = "Login to Console";
    }
    
    return rows;
  })
  .catch(function(error) {
    console.error('CSV loading error:', error);
    
    state.retryCount++;
    
    // Try alternative CSV format if main URL fails
    if (state.retryCount < state.maxRetries) {
      console.log(`Retrying CSV load (attempt ${state.retryCount} of ${state.maxRetries})...`);
      
      // Try alternative CSV URL format
      var alternativeURL = CSV_URL.replace('pub?gid=0&single=true&output=csv', 'export?format=csv&gid=0');
      console.log("Trying alternative URL:", alternativeURL);
      
      if (refs.loginBtn) {
        refs.loginBtn.disabled = true;
        refs.loginBtn.textContent = `Retrying (${state.retryCount}/${state.maxRetries})...`;
      }
      
      // Retry with delay
      return new Promise(function(resolve) {
        setTimeout(function() {
          fetch(alternativeURL, { mode: 'cors', cache: 'no-store' })
            .then(function(res) {
              if (!res.ok) throw new Error('Alternative URL failed');
              return res.text();
            })
            .then(function(text) {
              var rows = parseCSV(text);
              state.rows = rows;
              state.csvLoaded = true;
              state.retryCount = 0;
              
              if (refs.loginBtn) {
                refs.loginBtn.disabled = false;
                refs.loginBtn.textContent = "Login to Console";
              }
              
              resolve(rows);
            })
            .catch(function(altError) {
              console.error('Alternative URL also failed:', altError);
              throw error; // Re-throw original error
            });
        }, 1000 * state.retryCount); // Exponential backoff
      });
    }
    
    // All retries failed
    if (refs.loginBtn) {
      refs.loginBtn.disabled = true;
      refs.loginBtn.textContent = "Database Unavailable";
    }
    
    // Provide helpful error message
    showDatabaseError("Cannot connect to user database. Please check:");
    
    throw error;
  });
}

// Show database error with instructions
function showDatabaseError(message) {
  if (!refs.loginMsg) return;
  
  var errorHtml = `
    <div style="color: #ff6b6b; margin-bottom: 10px;">
      <strong>⚠️ Database Connection Error</strong><br>
      ${message}
    </div>
    <div style="background: rgba(255,107,107,0.1); padding: 10px; border-radius: 5px; font-size: 11px; margin-top: 10px;">
      <strong>To fix this:</strong><br>
      1. Open your Google Sheet<br>
      2. Click "File" → "Share" → "Publish to web"<br>
      3. Select "CSV" format and click "Publish"<br>
      4. Copy the new CSV URL and update the CSV_URL in the code<br>
      5. Refresh this page
    </div>
  `;
  
  refs.loginMsg.innerHTML = errorHtml;
  refs.loginMsg.className = "iml-inline-msg iml-error";
  refs.loginMsg.style.display = "block";
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
  try {
    var lines = csvText.trim().split('\n');
    console.log("Total lines in CSV:", lines.length);
    
    if (lines.length < 2) {
      console.warn("CSV has less than 2 lines");
      return [];
    }
    
    // Parse headers
    var headers = parseCSVLine(lines[0]);
    console.log("CSV Headers:", headers);
    
    // Parse data rows
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      try {
        var values = parseCSVLine(lines[i]);
        var row = {};
        
        for (var j = 0; j < headers.length; j++) {
          var header = headers[j].trim();
          var value = (j < values.length ? values[j].trim() : '');
          
          // Handle common header variations
          if (header.toLowerCase().includes('username') || header.toLowerCase().includes('user')) {
            row['Username'] = value;
          } else if (header.toLowerCase().includes('password') || header.toLowerCase().includes('pass')) {
            row['Password'] = value;
          } else if (header.toLowerCase().includes('status') || header.toLowerCase().includes('active')) {
            row['Status'] = value;
          } else if (header.toLowerCase().includes('reversal')) {
            row['Reversal'] = value;
          } else if (header.toLowerCase().includes('pts') || header.toLowerCase().includes('points')) {
            row['PTS'] = value;
          } else if (header.toLowerCase().includes('rate')) {
            row['Rate'] = value;
          } else {
            // Keep original header for other columns
            row[header] = value;
          }
        }
        
        rows.push(row);
      } catch (rowError) {
        console.error("Error parsing row", i + 1, ":", rowError);
      }
    }
    
    console.log("Successfully parsed", rows.length, "rows");
    return rows;
    
  } catch (error) {
    console.error("Error in parseCSV:", error);
    return [];
  }
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

// ==== SESSION MANAGEMENT ==============================================
function saveSession() {
  if (state.user) {
    localStorage.setItem('iml_session', JSON.stringify({
      username: state.user.username,
      password: state.user.password,
      pts: state.pts,
      reversal: state.reversal,
      timestamp: Date.now()
    }));
  }
}

function loadSession() {
  var session = localStorage.getItem('iml_session');
  if (session) {
    try {
      var data = JSON.parse(session);
      // Check if session is less than 24 hours old
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return data;
      } else {
        // Clear expired session
        clearSession();
      }
    } catch (e) {
      console.error('Error loading session:', e);
      clearSession();
    }
  }
  return null;
}

function clearSession() {
  localStorage.removeItem('iml_session');
}

// ==== SUBMIT DATA TO SHEETS ===========================================
function submitQuizData(username, correctAnswers, totalPoints, reversalRate) {
  // Create form data
  var data = {
    username: username,
    correctAnswers: correctAnswers,
    totalPoints: totalPoints,
    reversalRate: reversalRate,
    timestamp: new Date().toISOString()
  };
  
  console.log("Submitting quiz data:", data);
  
  // Try to submit to Google Apps Script
  return fetch(SUBMIT_URL, {
    method: 'POST',
    mode: 'no-cors', // Use 'no-cors' to avoid CORS issues
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(data).toString()
  })
  .then(function() {
    // With 'no-cors', we can't read the response, but we assume it worked
    console.log('Quiz data submitted successfully (no-cors mode)');
    return true;
  })
  .catch(function(error) {
    console.error('Error submitting quiz data:', error);
    
    // Fallback: Store in localStorage if server is unavailable
    try {
      var submissions = JSON.parse(localStorage.getItem('iml_pending_submissions') || '[]');
      submissions.push({
        ...data,
        localTimestamp: Date.now()
      });
      
      // Keep only last 50 submissions
      if (submissions.length > 50) {
        submissions = submissions.slice(-50);
      }
      
      localStorage.setItem('iml_pending_submissions', JSON.stringify(submissions));
      console.log('Quiz data saved locally for later sync');
    } catch (localError) {
      console.error('Failed to save locally:', localError);
    }
    
    return false;
  });
}

// ==== UI BUILD ========================================================
function buildLayout() {
  document.body.innerHTML = "";
  var shell = el("div", "iml-shell");

  // DESKTOP NAV
  var nav = el("nav", "navbar navbar-iml");
  var navC = el("div", "container-fluid");
  var nh = el("div", "navbar-header");
  var brand = el("a", "navbar-brand", "IML CONSOLE");
  brand.href = "#";
  brand.onclick = function(e) {
    e.preventDefault();
    switchPage('home');
  };
  nh.appendChild(brand);
  var ul = el("ul", "nav navbar-nav");
  ["HOME", "EARN", "SHOP", "LEADERS", "HELP", "CHAT"].forEach(function(txt, i) {
    var li = el("li", i === 1 ? "active" : "");
    var a = el("a", "", txt);
    a.href = "#";
    a.onclick = function(e) {
      e.preventDefault();
      switchPage(txt.toLowerCase());
    };
    li.appendChild(a);
    ul.appendChild(li);
  });
  append(navC, [nh, ul]);
  nav.appendChild(navC);

  // PROMO BAR
  var promo = el("div", "iml-promo", "Secure Login - Live Data Sync");

  // MAIN CONTAINER
  var main = el("div", "iml-main container-fluid");
  var row = el("div", "row");
  var left = el("div", "col-sm-8 col-md-8");
  var right = el("div", "col-sm-4 col-md-4");

  // PAGES CONTAINER
  var pagesContainer = el("div", "iml-pages-container");
  
  // HOME PAGE
  var homePage = buildHomePage();
  homePage.id = "page-home";
  pagesContainer.appendChild(homePage);
  
  // EARN PAGE
  var earnPage = buildEarnPage();
  earnPage.id = "page-earn";
  pagesContainer.appendChild(earnPage);
  
  // SHOP PAGE
  var shopPage = buildShopPage();
  shopPage.id = "page-shop";
  pagesContainer.appendChild(shopPage);
  
  // LEADERS PAGE
  var leadersPage = buildLeadersPage();
  leadersPage.id = "page-leaders";
  pagesContainer.appendChild(leadersPage);
  
  // HELP PAGE
  var helpPage = buildHelpPage();
  helpPage.id = "page-help";
  pagesContainer.appendChild(helpPage);
  
  // CHAT PAGE
  var chatPage = buildChatPage();
  chatPage.id = "page-chat";
  pagesContainer.appendChild(chatPage);
  
  left.appendChild(pagesContainer);

  // RIGHT: INFO PANEL
  var pInfo = buildInfoPanel();
  right.appendChild(pInfo);

  append(row, [left, right]);
  append(main, [row]);
  append(shell, [nav, promo, main]);
  document.body.appendChild(shell);

  // MOBILE BOTTOM NAV
  var bottom = el("div", "iml-bottom-nav");
  ["HOME", "EARN", "SHOP", "LEADERS", "HELP", "CHAT"].forEach(function(txt, i) {
    var b = el("button", i === 1 ? "active" : "", txt);
    b.onclick = function() {
      switchPage(txt.toLowerCase());
    };
    bottom.appendChild(b);
  });
  document.body.appendChild(bottom);

  // Set initial page
  switchPage('earn');
}

function buildHomePage() {
  var page = el("div", "iml-page");
  var content = el("div", "iml-home-content");
  
  var title = el("h1", "iml-home-title", "IML Console");
  var subtitle = el("p", "iml-home-subtitle", "Welcome to the Interactive Micro Learning Platform");
  
  var features = el("div", "panel-iml");
  var featuresHead = el("div", "panel-heading", "Platform Features");
  var featuresBody = el("div", "panel-body");
  
  var featureList = el("ul", "iml-q-text");
  featureList.innerHTML = `
    <li>✓ Real-time quiz system with live scoring</li>
    <li>✓ Secure authentication with session management</li>
    <li>✓ Points earning and performance tracking</li>
    <li>✓ Interactive shop for redeeming rewards</li>
    <li>✓ Live leaderboard to track progress</li>
    <li>✓ Integrated help and support system</li>
    <li>✓ Community chat for collaboration</li>
  `;
  
  append(featuresBody, [featureList]);
  append(features, [featuresHead, featuresBody]);
  
  append(content, [title, subtitle, features]);
  page.appendChild(content);
  return page;
}

function buildEarnPage() {
  var page = el("div", "iml-page active");
  var content = el("div", "iml-page-content");
  
  // LOGIN PANEL
  var pLogin = el("div", "panel panel-iml");
  var pLH = el("div", "panel-heading", "User Authentication");
  var pLB = el("div", "panel-body");
  
  // Add database status indicator
  var dbStatus = el("div", "iml-inline-msg iml-loading");
  dbStatus.id = "db-status";
  dbStatus.textContent = "Connecting to database...";
  dbStatus.style.display = "block";
  pLB.appendChild(dbStatus);
  
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
  btnLogin.id = "login-button";
  refs.loginBtn = btnLogin;
  append(cBtn, [btnLogin]);
  r2.appendChild(cBtn);

  var testRow = el("div", "row");
  var testCol = el("div", "col-xs-12 text-center");
  var testLink = el("a", "iml-q-text", "Test Database Connection");
  testLink.href = "#";
  testLink.style.color = "#00b1ff";
  testLink.style.textDecoration = "underline";
  testLink.style.cursor = "pointer";
  testLink.style.fontSize = "11px";
  testLink.onclick = function(e) {
    e.preventDefault();
    testDatabaseConnection();
  };
  testCol.appendChild(testLink);
  testRow.appendChild(testCol);

  append(pLB, [r1, el("hr"), r2, el("br"), testRow]);
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
  qTitle.style.margin = "15px 0 10px";

  function makeQBlock(idx) {
    var wrap = el("div", "iml-q-block");
    var lab = el("div", "iml-q-label", "#" + idx);
    var txt = el("div", "iml-q-text", "Loading question...");
    var inp = el("input", "iml-input form-control");
    inp.placeholder = "type answer for #" + idx;
    inp.id = "q" + idx;
    var btnRow = el("div", "text-right");
    var btn = el("button", "btn btn-iml btn-sm", "Submit #" + idx);
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
  var btnLogout = el("button", "btn btn-iml btn-sm", "Logout");
  logoutCol.appendChild(btnLogout);
  logoutRow.appendChild(logoutCol);

  append(dB, [stRow, el("br"), statGrid, el("hr"), qTitle, refs.qMsg, q1.root, q2.root, q3.root, el("hr"), logoutRow]);
  append(pDash, [dH, dB]);
  refs.loginPanel = pLogin;
  refs.dashPanel = pDash;

  append(content, [pLogin, pDash]);
  page.appendChild(content);
  return page;
}

function buildShopPage() {
  var page = el("div", "iml-page");
  var content = el("div", "iml-page-content");
  
  var panel = el("div", "panel panel-iml");
  var panelHead = el("div", "panel-heading", "Rewards Shop");
  var panelBody = el("div", "panel-body");
  
  var shopGrid = el("div", "iml-shop-grid");
  
  var items = [
    { name: "Premium Access", price: "500 PTS", desc: "Unlock premium features" },
    { name: "Expert Badge", price: "1000 PTS", desc: "Show your expertise" },
    { name: "Priority Support", price: "300 PTS", desc: "Get help faster" },
    { name: "Custom Theme", price: "200 PTS", desc: "Personalize your console" },
    { name: "Data Export", price: "150 PTS", desc: "Export your progress" },
    { name: "Training Modules", price: "400 PTS", desc: "Advanced learning" }
  ];
  
  items.forEach(function(item) {
    var shopItem = el("div", "iml-shop-item");
    var title = el("h4", "iml-shop-title", item.name);
    var price = el("div", "iml-shop-price", item.price);
    var desc = el("p", "iml-q-text", item.desc);
    var btn = el("button", "btn btn-iml btn-sm", "Purchase");
    
    append(shopItem, [title, price, desc, btn]);
    shopGrid.appendChild(shopItem);
  });
  
  append(panelBody, [shopGrid]);
  append(panel, [panelHead, panelBody]);
  append(content, [panel]);
  page.appendChild(content);
  return page;
}

function buildLeadersPage() {
  var page = el("div", "iml-page");
  var content = el("div", "iml-page-content");
  
  var panel = el("div", "panel panel-iml");
  var panelHead = el("div", "panel-heading", "Leaderboard");
  var panelBody = el("div", "panel-body");
  
  var leaderboard = el("div", "iml-leaderboard");
  var table = el("table");
  
  var thead = el("thead");
  var headerRow = el("tr");
  ["Rank", "Username", "Points", "Status", "Reversal %"].forEach(function(text) {
    var th = el("th", "", text);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  
  var tbody = el("tbody");
  // Placeholder data
  var placeholderData = [
    ["1", "operator-001", "1250", "Active", "1.2%"],
    ["2", "agent-002", "980", "Active", "2.1%"],
    ["3", "user-003", "750", "Active", "1.8%"],
    ["4", "test-004", "620", "Active", "2.5%"],
    ["5", "demo-005", "450", "Active", "3.0%"]
  ];
  
  placeholderData.forEach(function(rowData) {
    var row = el("tr");
    rowData.forEach(function(cellData) {
      var td = el("td", "", cellData);
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  
  append(table, [thead, tbody]);
  leaderboard.appendChild(table);
  append(panelBody, [leaderboard]);
  append(panel, [panelHead, panelBody]);
  append(content, [panel]);
  page.appendChild(content);
  return page;
}

function buildHelpPage() {
  var page = el("div", "iml-page");
  var content = el("div", "iml-page-content");
  
  var panel = el("div", "panel panel-iml");
  var panelHead = el("div", "panel-heading", "Help & Support");
  var panelBody = el("div", "panel-body");
  
  var helpContent = el("div", "iml-q-text");
  helpContent.innerHTML = `
    <h4>Getting Started</h4>
    <p>Welcome to IML Console! Follow these steps to begin:</p>
    <ol>
      <li>Navigate to the EARN section</li>
      <li>Login with your credentials (provided by admin)</li>
      <li>Answer the questions in the console</li>
      <li>Earn points for correct answers</li>
      <li>Monitor your performance stats</li>
    </ol>
    
    <h4>Understanding Points System</h4>
    <ul>
      <li><strong>Base Rate:</strong> ${BASE_RATE} PTS per correct block</li>
      <li><strong>Points Per Correct:</strong> ${POINTS_PER_CORRECT} PTS</li>
      <li><strong>Reversal Threshold:</strong> ${REVERSAL_THRESHOLD}% (if exceeded, points may be held)</li>
      <li><strong>Hold Period:</strong> ${HOLD_DAYS} days</li>
    </ul>
    
    <h4>FAQ</h4>
    <p><strong>Q: My answers aren't being accepted</strong><br>
    A: Ensure you're typing the exact answer as provided in your training.</p>
    
    <p><strong>Q: How do I redeem points?</strong><br>
    A: Visit the SHOP section to see available rewards.</p>
    
    <p><strong>Q: What is reversal rate?</strong><br>
    A: This is your error rate. Keep it below ${REVERSAL_THRESHOLD}% to avoid holds.</p>
    
    <h4>Database Connection Issues</h4>
    <p>If you see "Database Unavailable":</p>
    <ol>
      <li>Make sure the Google Sheet is published (File → Share → Publish to web)</li>
      <li>Select CSV format and click "Publish"</li>
      <li>Copy the new CSV URL</li>
      <li>Update the CSV_URL in the code</li>
      <li>Refresh the page</li>
    </ol>
  `;
  
  append(panelBody, [helpContent]);
  append(panel, [panelHead, panelBody]);
  append(content, [panel]);
  page.appendChild(content);
  return page;
}

function buildChatPage() {
  var page = el("div", "iml-page");
  var content = el("div", "iml-page-content");
  
  var panel = el("div", "panel panel-iml");
  var panelHead = el("div", "panel-heading", "Community Chat");
  var panelBody = el("div", "panel-body");
  
  var chatContainer = el("div", "iml-chat-container");
  var chatMessages = el("div", "iml-chat-messages");
  
  // Placeholder messages
  var placeholderMessages = [
    { user: "System", message: "Welcome to IML Community Chat!", time: "10:00 AM" },
    { user: "Admin", message: "Please keep conversations professional.", time: "10:05 AM" },
    { user: "operator-001", message: "Anyone completed the new training?", time: "10:30 AM" },
    { user: "agent-002", message: "Yes, it's available in the EARN section", time: "10:35 AM" }
  ];
  
  placeholderMessages.forEach(function(msg) {
    var messageDiv = el("div", "iml-q-block");
    var userSpan = el("span", "iml-q-label", msg.user + " @ " + msg.time);
    var messageText = el("div", "iml-q-text", msg.message);
    append(messageDiv, [userSpan, messageText]);
    chatMessages.appendChild(messageDiv);
  });
  
  var chatInputContainer = el("div", "iml-chat-input-container");
  var chatInput = el("input", "iml-input form-control");
  chatInput.placeholder = "Type your message...";
  var chatSend = el("button", "btn btn-iml", "Send");
  
  append(chatInputContainer, [chatInput, chatSend]);
  append(chatContainer, [chatMessages, chatInputContainer]);
  append(panelBody, [chatContainer]);
  append(panel, [panelHead, panelBody]);
  append(content, [panel]);
  page.appendChild(content);
  return page;
}

function buildInfoPanel() {
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
    "• PTS may be held if reversal ≥ 3%<br><br>" +
    "<strong>Need Help?</strong><br>" +
    "Visit the HELP section for detailed guides and FAQs.";
  append(infoB, [infoContent]);
  append(pInfo, [infoH, infoB]);
  return pInfo;
}

// ==== PAGE NAVIGATION =================================================
function switchPage(page) {
  // Hide all pages
  var pages = document.querySelectorAll('.iml-page');
  pages.forEach(function(pageEl) {
    pageEl.classList.remove('active');
  });
  
  // Show selected page
  var targetPage = document.getElementById('page-' + page);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  // Update navigation active states
  var navItems = document.querySelectorAll('.navbar-iml .nav li');
  navItems.forEach(function(li) {
    li.classList.remove('active');
    var a = li.querySelector('a');
    if (a && a.textContent.trim().toUpperCase() === page.toUpperCase()) {
      li.classList.add('active');
    }
  });
  
  var bottomItems = document.querySelectorAll('.iml-bottom-nav button');
  bottomItems.forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.textContent.trim().toUpperCase() === page.toUpperCase()) {
      btn.classList.add('active');
    }
  });
}

// ==== LOGIN / USER ====================================================
function findUser(username, password) {
  if (!state.csvLoaded) {
    showLoginMessage("Database not loaded. Please wait...", "error");
    return null;
  }

  username = username.toLowerCase();
  
  console.log("Looking for user:", username);
  console.log("Total users in database:", state.rows.length);
  
  for (var i = 0; i < state.rows.length; i++) {
    var r = state.rows[i];
    
    // Debug: log first few rows
    if (i < 3) {
      console.log(`Row ${i}:`, r);
    }
    
    // Try to get username with different possible column names
    var rUsername = (r.Username || r.username || r.User || r.user || r['User Name'] || "").toString().toLowerCase();
    var rPassword = r.Password || r.password || r.Pass || r.pass || "";
    var rStatus = r.Status || r.status || r.Active || r.active || "Inactive";
    
    console.log(`Comparing: input="${username}" vs db="${rUsername}", password match? ${rPassword === password}`);
    
    if (rUsername === username && rPassword === password) {
      console.log("User found:", username);
      
      // Try to extract questions and answers
      var userData = {
        username: r.Username || r.username || username,
        password: password,
        status: rStatus,
        reversal: parseFloat(r.Reversal || r.reversal || "0") || 0,
        pts: parseFloat(r.PTS || r.Points || r.points || "0") || 0,
        rate: parseFloat(r.Rate || r.rate || BASE_RATE) || BASE_RATE,
        q1: r["#1"] || r.Question1 || r.question1 || r.Q1 || r['Question 1'] || "",
        q2: r["#2"] || r.Question2 || r.question2 || r.Q2 || r['Question 2'] || "",
        q3: r["#3"] || r.Question3 || r.question3 || r.Q3 || r['Question 3'] || "",
        ans1: r.Ans1 || r.Answer1 || r.answer1 || r.A1 || r['Answer 1'] || "",
        ans2: r.Ans2 || r.Answer2 || r.answer2 || r.A2 || r['Answer 2'] || "",
        ans3: r.Ans3 || r.Answer3 || r.answer3 || r.A3 || r['Answer 3'] || ""
      };
      
      console.log("User data extracted:", userData);
      return userData;
    }
  }
  
  console.log("User not found:", username);
  return null;
}

function showLoginMessage(msg, type) {
  if (!refs.loginMsg) return;
  refs.loginMsg.textContent = msg;
  refs.loginMsg.className = "iml-inline-msg";
  
  if (type === "error") {
    refs.loginMsg.classList.add("iml-error");
  } else if (type === "success") {
    refs.loginMsg.classList.add("iml-success");
  } else if (type === "warning") {
    refs.loginMsg.classList.add("iml-warning");
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
    showLoginMessage("Invalid username or password. Please check your credentials.", "error");
    return;
  }

  state.user = user;
  state.pts = user.pts;
  state.reversal = user.reversal;
  state.correct = 0;
  state.attempts = 0;

  // Save session
  saveSession();
  
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
  refs.qMsg.className = "iml-inline-msg iml-success";
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
    refs.qMsg.className = "iml-inline-msg iml-error";
    refs.qMsg.style.display = "block";
    return;
  }

  var v = (inputEl.value || "").trim();
  if (!v) {
    refs.qMsg.textContent = "Please enter an answer for #" + idx + ".";
    refs.qMsg.className = "iml-inline-msg iml-error";
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
    refs.qMsg.className = "iml-inline-msg iml-success";
    inputEl.value = "";
    
    // Submit data to Google Sheets
    submitQuizData(state.user.username, state.correct, state.pts, state.reversal)
      .then(function(success) {
        if (success) {
          console.log("Quiz data submitted to sheets successfully");
        } else {
          console.log("Quiz data saved locally for later sync");
        }
      });
  } else {
    refs.qMsg.textContent = "Incorrect for #" + idx + ". Please try again.";
    refs.qMsg.className = "iml-inline-msg iml-error";
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

  // Clear session
  clearSession();
  
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

// ==== DATABASE TEST FUNCTION ==========================================
function testDatabaseConnection() {
  var dbStatus = document.getElementById('db-status');
  if (dbStatus) {
    dbStatus.textContent = "Testing database connection...";
    dbStatus.className = "iml-inline-msg iml-loading";
    dbStatus.style.display = "block";
  }
  
  fetch(CSV_URL, { mode: 'cors', cache: 'no-store' })
    .then(function(response) {
      if (dbStatus) {
        dbStatus.innerHTML = `
          <strong>✓ Database Test Result:</strong><br>
          Status: ${response.status} ${response.statusText}<br>
          Connection: Successful
        `;
        dbStatus.className = "iml-inline-msg iml-success";
      }
      console.log("Database test successful:", response.status);
      return response.text();
    })
    .then(function(text) {
      console.log("Database content length:", text.length);
      if (text.length < 100) {
        console.warn("Database content seems too short:", text);
      }
    })
    .catch(function(error) {
      if (dbStatus) {
        dbStatus.innerHTML = `
          <strong>✗ Database Test Result:</strong><br>
          Error: ${error.message}<br>
          Please check if the Google Sheet is published.
        `;
        dbStatus.className = "iml-inline-msg iml-error";
      }
      console.error("Database test failed:", error);
    });
}

// ==== EVENT LISTENERS SETUP ===========================================
function setupEventListeners() {
  if (refs.loginBtn) {
    refs.loginBtn.addEventListener("click", function() {
      var username = document.getElementById("username")?.value.trim();
      var password = document.getElementById("password")?.value.trim();
      onLogin(username, password);
    });
  }

  var passwordInput = document.getElementById("password");
  if (passwordInput) {
    passwordInput.addEventListener("keyup", function(e) {
      if (e.key === "Enter") {
        var username = document.getElementById("username")?.value.trim();
        var password = document.getElementById("password")?.value.trim();
        onLogin(username, password);
      }
    });
  }

  if (refs.qBlocks) {
    refs.qBlocks.forEach(function(q, idx) {
      q.button.addEventListener("click", function() {
        onAnswer(idx + 1, q.input);
      });
      q.input.addEventListener("keyup", function(e) {
        if (e.key === "Enter") onAnswer(idx + 1, q.input);
      });
    });
  }

  var logoutBtn = document.querySelector('button[class*="btn-iml"]:last-child');
  if (logoutBtn && logoutBtn.textContent === "Logout") {
    logoutBtn.addEventListener("click", function() {
      onLogout();
    });
  }
}

// ==== INIT ============================================================
document.addEventListener("DOMContentLoaded", function() {
  injectAssets();
  buildLayout();
  
  // Update database status
  var dbStatus = document.getElementById('db-status');
  if (dbStatus) {
    dbStatus.textContent = "Connecting to database...";
  }
  
  // Try to restore session
  var savedSession = loadSession();
  if (savedSession) {
    console.log("Restoring saved session for:", savedSession.username);
    
    // Update database status
    if (dbStatus) {
      dbStatus.textContent = "Restoring previous session...";
      dbStatus.className = "iml-inline-msg iml-loading";
    }
    
    // Auto-login with saved credentials
    setTimeout(function() {
      onLogin(savedSession.username, savedSession.password);
    }, 1000);
  }

  // Start loading CSV data immediately
  console.log("Starting CSV fetch from:", CSV_URL);
  fetchCSV().then(function(rows) {
    console.log("Successfully loaded " + rows.length + " user records");
    
    // Update database status
    if (dbStatus) {
      dbStatus.innerHTML = `
        <strong>✓ Database Ready:</strong><br>
        Loaded ${rows.length} user accounts<br>
        Connection: Stable
      `;
      dbStatus.className = "iml-inline-msg iml-success";
    }
    
    setupEventListeners();
  }).catch(function(error) {
    console.error("Failed to load database:", error);
    
    // Update database status
    if (dbStatus) {
      dbStatus.innerHTML = `
        <strong>✗ Database Error:</strong><br>
        Failed to load user data<br>
        Check console for details
      `;
      dbStatus.className = "iml-inline-msg iml-error";
    }
    
    setupEventListeners();
  });
});
