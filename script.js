(function () {
  // ---------- Habit definitions ----------
  var H = [
    { id: "water",      name: "Water",      unit: "glasses", goal: 8,    step: 1,    color: "#2e8bc0" },
    { id: "walk",       name: "Walking",    unit: "steps",   goal: 8000, step: 1000, color: "#3a9d5d" },
    { id: "exercise",   name: "Exercise",   unit: "minutes", goal: 30,   step: 10,   color: "#e0702f" },
    { id: "sleep",      name: "Sleep",      unit: "hours",   goal: 8,    step: 0.5,  color: "#7a64e0" },
    { id: "meditation", name: "Meditation", unit: "minutes", goal: 10,   step: 5,    color: "#c2517a" }
  ];

  // ---------- Local storage ----------
  var KEY = "wellness-tracker-v1";
  var store = { goals: {}, days: {} };

  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.days) {
        store = parsed;
        store.goals = store.goals || {};
      }
    }
  } catch (e) {}

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }

  // ---------- Date helpers ----------
  function key(d) {
    var m = d.getMonth() + 1, x = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (x < 10 ? "0" : "") + x;
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  var TODAY = startOfDay(new Date());
  var sel = TODAY;      // day currently being viewed
  var range = "day";    // "day" | "week" | "month"

  // ---------- Data helpers ----------
  function goal(h) {
    var g = +store.goals[h.id];
    return g > 0 ? g : h.goal;
  }
  function val(d, h) {
    var r = store.days[key(d)];
    return r && r[h.id] ? +r[h.id] : 0;
  }
  function isDone(d, h) { return val(d, h) >= goal(h); }
  function count(d) { return H.filter(function (h) { return isDone(d, h); }).length; }
  function pct(d) { return count(d) / H.length; }

  function setVal(h, v) {
    v = Math.max(0, Math.round(v * 100) / 100);
    var k = key(sel);
    store.days[k] = store.days[k] || {};
    store.days[k][h.id] = v;
    save();
    render();
  }

  function fmt(n) { return Number(n).toLocaleString(); }
  function P(n) { return Math.round(n * 100) + "%"; }
  function el(id) { return document.getElementById(id); }

  // ---------- Summaries ----------
  function rangeDays() {
    var out = [], i;
    if (range === "day") return [sel];
    if (range === "week") {
      for (i = 6; i >= 0; i--) out.push(addDays(sel, -i));
      return out;
    }
    var n = new Date(sel.getFullYear(), sel.getMonth() + 1, 0).getDate();
    for (i = 1; i <= n; i++) out.push(new Date(sel.getFullYear(), sel.getMonth(), i));
    return out;
  }

  function average(days) {
    var past = days.filter(function (d) { return d <= TODAY; });
    if (!past.length) return 0;
    return past.reduce(function (a, d) { return a + pct(d); }, 0) / past.length;
  }

  // Streak = consecutive days with 3 or more habits done
  function streak() {
    var d = TODAY, n = 0;
    if (count(d) < 3) d = addDays(d, -1);
    while (count(d) >= 3 && n < 3650) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---------- Encouragement messages ----------
  var MSG = {
    zero: ["A fresh page. One glass of water is a great first step.",
           "Every healthy day starts small. Pick one habit and begin.",
           "No pressure. Start with a short walk or a few deep breaths."],
    low:  ["Nice start. Keep the momentum going.",
           "You’ve begun, and that’s the hardest part.",
           "Good going. Each habit you add makes the day better."],
    mid:  ["You’re more than halfway there. Keep it up!",
           "Strong progress. You’re building something good.",
           "Look at you go. A little more and you’ve got this."],
    high: ["So close! One more habit to finish the day.",
           "Almost perfect. Finish strong!",
           "Fantastic effort. Just one step from a full day."],
    full: ["All habits done. Take a moment to be proud of yourself.",
           "A perfect day! Rest well, you’ve earned it.",
           "Everything checked off. Consistency like this changes lives."]
  };

  function message(c) {
    var set = c === 0 ? MSG.zero : c < 3 ? MSG.low : c === 3 ? MSG.mid : c < 5 ? MSG.high : MSG.full;
    return set[(sel.getDate() + c) % set.length];
  }

  // ---------- Drawing ----------
  function drawRings() {
    var radii = [92, 78, 64, 50, 36], html = "";
    H.forEach(function (h, i) {
      var r = radii[i];
      var p = Math.min(1, val(sel, h) / goal(h));
      var C = 2 * Math.PI * r;
      html +=
        '<circle class="t" cx="100" cy="100" r="' + r + '" stroke-width="10"/>' +
        '<circle class="p" cx="100" cy="100" r="' + r + '" stroke-width="10" stroke="' + h.color +
        '" transform="rotate(-90 100 100)" stroke-dasharray="' + C +
        '" stroke-dashoffset="' + (C * (1 - p)) + '"/>';
    });
    el("rings").innerHTML = html;
  }

  function drawHabits() {
    var html = "";
    H.forEach(function (h) {
      var v = val(sel, h), g = goal(h), ok = v >= g;
      var w = Math.min(100, (v / g) * 100);
      html +=
        '<li class="habit' + (ok ? " ok" : "") + '" style="--c:' + h.color + '" data-id="' + h.id + '">' +
          '<div class="top"><b>' + h.name + '</b><span>' + fmt(v) + " / " + fmt(g) + " " + h.unit + "</span></div>" +
          '<div class="bar"><i style="width:' + w + '%"></i></div>' +
          '<div class="ctl">' +
            '<button data-a="dec" aria-label="Decrease ' + h.name + '">−</button>' +
            '<input type="number" inputmode="decimal" min="0" step="any" value="' + v + '" aria-label="' + h.name + " (" + h.unit + ')">' +
            '<button data-a="inc" aria-label="Increase ' + h.name + '">+</button>' +
            '<span class="unit">' + h.unit + "</span>" +
            '<button class="done" data-a="done">' + (ok ? "Undo" : "Mark done") + "</button>" +
          "</div>" +
        "</li>";
    });
    el("habits").innerHTML = html;
  }

  function drawGoals() {
    el("goals").innerHTML = H.map(function (h) {
      return '<label>' + h.name + " goal (" + h.unit + ')' +
             '<input type="number" min="0" step="any" data-g="' + h.id + '" value="' + goal(h) + '"></label>';
    }).join("");
  }

  function drawChart() {
    var days = rangeDays(), svg = el("chart"), html = "";
    var W, height = 150, top = 8, base = 124;

    if (range === "day") {
      // One bar per habit for the selected day
      W = 320;
      var bw = 44, gap = (W - 5 * bw) / 6;
      H.forEach(function (h, i) {
        var p = Math.min(1, val(sel, h) / goal(h));
        var bh = Math.max(2, p * (base - top));
        var x = gap + i * (bw + gap);
        html +=
          '<rect x="' + x + '" y="' + (base - bh) + '" width="' + bw + '" height="' + bh + '" rx="6" fill="' + h.color + '"/>' +
          '<text x="' + (x + bw / 2) + '" y="' + (base - bh - 4) + '" text-anchor="middle">' + Math.round(p * 100) + "%</text>" +
          '<text x="' + (x + bw / 2) + '" y="' + (base + 14) + '" text-anchor="middle">' + h.name + "</text>";
      });
    } else {
      // One bar per day for the week or month
      var n = days.length;
      var slot = range === "week" ? 44 : 20;
      var every = range === "week" ? 1 : (n > 28 ? 5 : 4);
      W = n * slot;
      html +=
        '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" stroke="var(--line)"/>' +
        '<line x1="0" x2="' + W + '" y1="' + top + '" y2="' + top + '" stroke="var(--line)" stroke-dasharray="3 4"/>';

      days.forEach(function (d, i) {
        var future = d > TODAY;
        var p = pct(d);
        var bh = future ? 0 : Math.max(3, p * (base - top));
        var pad = range === "week" ? 10 : 3;
        var x = i * slot + pad, bw2 = slot - pad * 2;
        var selected = key(d) === key(sel);

        html +=
          '<rect class="bar1" data-k="' + key(d) + '" x="' + x + '" y="' + (base - bh) +
          '" width="' + bw2 + '" height="' + bh + '" rx="4" fill="var(--accent)" opacity="' + (selected ? 1 : 0.55) + '">' +
          "<title>" + d.toDateString() + ": " + P(p) + "</title></rect>";

        if (range === "week" && !future) {
          html += '<text x="' + (x + bw2 / 2) + '" y="' + (base - bh - 4) + '" text-anchor="middle">' + Math.round(p * 100) + "%</text>";
        }
        if (range === "week" || i % every === 0) {
          var lbl = range === "week" ? d.toLocaleDateString(undefined, { weekday: "short" }) : d.getDate();
          html += '<text x="' + (x + bw2 / 2) + '" y="' + (base + 14) + '" text-anchor="middle">' + lbl + "</text>";
        }
      });
    }

    svg.setAttribute("viewBox", "0 0 " + W + " " + height);
    svg.innerHTML = html;
  }

  function drawRates() {
    var days = rangeDays().filter(function (d) { return d <= TODAY; });
    el("rates").innerHTML = H.map(function (h) {
      var n = days.filter(function (d) { return isDone(d, h); }).length;
      var p = days.length ? n / days.length : 0;
      return '<div class="rate" style="--c:' + h.color + '"><span>' + h.name + "</span>" +
             '<div class="bar"><i style="width:' + p * 100 + '%"></i></div>' +
             "<em>" + Math.round(p * 100) + "%</em></div>";
    }).join("");
  }

  function drawSummary() {
    var days = rangeDays();
    var a = average(days);
    var perfect = days.filter(function (d) { return d <= TODAY && count(d) === H.length; }).length;
    var label = range === "day" ? "Completion today"
              : range === "week" ? "Last 7 days"
              : sel.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    el("sumline").textContent = label + ": " + P(a) + " average" +
      (range === "day" ? "" : " · " + perfect + " perfect " + (perfect === 1 ? "day" : "days"));

    drawChart();
    drawRates();
  }

  function render() {
    var c = count(sel);
    var isToday = key(sel) === key(TODAY);

    el("dlabel").textContent = isToday
      ? "Today, " + sel.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : sel.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

    el("next").disabled = sel >= TODAY;
    el("today").disabled = isToday;

    el("pct").textContent = P(c / H.length);
    el("count").textContent = c + " of " + H.length + " habits done";
    el("msg").textContent = message(c);

    // Weekly and monthly averages shown on the hero card
    var week = [], month = [], i;
    for (i = 6; i >= 0; i--) week.push(addDays(sel, -i));
    var daysInMonth = new Date(sel.getFullYear(), sel.getMonth() + 1, 0).getDate();
    for (i = 1; i <= daysInMonth; i++) month.push(new Date(sel.getFullYear(), sel.getMonth(), i));

    el("s-streak").textContent = streak();
    el("s-week").textContent = P(average(week));
    el("s-month").textContent = P(average(month));

    drawRings();
    drawHabits();
    drawSummary();
  }

  // ---------- Events ----------
  function habitById(id) {
    return H.filter(function (h) { return h.id === id; })[0];
  }

  // + / − / Mark done buttons
  el("habits").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-a]");
    if (!b) return;
    var h = habitById(b.closest(".habit").dataset.id);
    var v = val(sel, h), a = b.dataset.a;

    if (a === "inc") setVal(h, v + h.step);
    else if (a === "dec") setVal(h, v - h.step);
    else setVal(h, v >= goal(h) ? 0 : goal(h));
  });

  // Typing an exact value
  el("habits").addEventListener("change", function (e) {
    if (e.target.tagName !== "INPUT") return;
    var h = habitById(e.target.closest(".habit").dataset.id);
    var n = parseFloat(e.target.value);
    setVal(h, isNaN(n) ? 0 : n);
  });

  // Editing goals
  el("goals").addEventListener("change", function (e) {
    var id = e.target.dataset.g;
    if (!id) return;
    var n = parseFloat(e.target.value);
    if (n > 0) store.goals[id] = n; else delete store.goals[id];
    save();
    render();
    drawGoals();
  });

  // Date navigation
  el("prev").onclick = function () { sel = addDays(sel, -1); render(); };
  el("next").onclick = function () { if (sel < TODAY) { sel = addDays(sel, 1); render(); } };
  el("today").onclick = function () { sel = TODAY; render(); };

  // Daily / Weekly / Monthly tabs
  document.querySelector(".tabs").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-r]");
    if (!b) return;
    range = b.dataset.r;
    document.querySelectorAll(".tabs button").forEach(function (x) {
      x.setAttribute("aria-pressed", x === b);
    });
    drawSummary();
  });

  // Click a bar to jump to that day
  el("chart").addEventListener("click", function (e) {
    var r = e.target.closest("rect[data-k]");
    if (!r) return;
    var p = r.dataset.k.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (d <= TODAY) { sel = d; render(); }
  });

  // ---------- Start ----------
  drawGoals();
  render();
})();