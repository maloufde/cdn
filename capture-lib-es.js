/*!
* capture-lib
* (c) 2026 Christian Malouf
* Released under the MIT License.
*
* Uses JSZip, used under the MIT license option.
*/
//#region src/capture-ui.js
var e = class extends HTMLElement {
	connectedCallback() {
		this.innerHTML = "\n      <div id=\"cap-toggle\">\n        <div id=\"cap-dot\"></div>\n        <span id=\"cap-toggle-label\">Capture</span>\n        <span id=\"cap-count-badge\">0</span>\n      </div>\n      <div id=\"cap-panel\">\n        <div id=\"cap-panel-header\">\n          <div id=\"cap-tab-bar\">\n            <button id=\"cap-tab-session\" class=\"cap-tab active\" type=\"button\">Session</button>\n            <button id=\"cap-tab-picker\" class=\"cap-tab\" type=\"button\">Picker</button>\n            <button id=\"cap-tab-settings\" class=\"cap-tab\" type=\"button\">Settings</button>\n          </div>\n          <span id=\"cap-session-id\">—</span>\n        </div>\n\n        <!-- Oberer Bereich: je nach Tab zeigt er Session-Inputs oder Settings -->\n        <div id=\"cap-input-area\">\n          <!-- Session Inputs (Tag oben, Kommentar neben Save-Button) -->\n          <div id=\"cap-session-inputs\">\n            <div id=\"cap-session-tag\">\n              <input id=\"cap-tag-input\" type=\"text\" placeholder=\"Tag eingeben...\">\n              <button id=\"cap-tag-btn\" type=\"button\">Setzen</button>\n            </div>\n            <div id=\"cap-comment-area\">\n              <input id=\"cap-comment-input\" type=\"text\" placeholder=\"Kommentar eingeben...\">\n              <button id=\"cap-comment-btn\" type=\"button\">+ Kommentar</button>\n            </div>\n          </div>\n\n          <!-- Settings Inputs (Upload Endpoint) -->\n          <div id=\"cap-settings-inputs\" style=\"display:none;\">\n            <div style=\"padding:8px 10px;display:flex;gap:8px;align-items:center;\">\n              <input id=\"cap-upload-url-input\" type=\"text\" placeholder=\"Upload-Endpoint (z. B. http://localhost:5555/api/uploads)\" style=\"flex:1\">\n              <button id=\"cap-save-settings-btn\" type=\"button\">Speichern</button>\n            </div>\n            <div style=\"padding:0 10px 8px 10px;font-size:11px;color:#666;\">\n              Wird hier eine URL eingetragen, wird der ZIP-Export an diese URL per POST hochgeladen.\n            </div>\n          </div>\n        </div>\n\n        <div id=\"cap-steps-list\">\n          <div class=\"empty-hint\">Noch keine Steps erfasst</div>\n        </div>\n\n        <div id=\"cap-picker-list\" style=\"display:none;\">\n          <div class=\"empty-hint\">Noch keine Elemente ausgewählt</div>\n        </div>\n\n        <div id=\"cap-actions\">\n          <button class=\"cap-action-btn\" type=\"button\" id=\"cap-clear-btn\">Session leeren</button>\n          <button class=\"cap-action-btn\" type=\"button\" id=\"cap-picker-btn\">Element‑Picker</button>\n          <button class=\"cap-action-btn primary\" type=\"button\" id=\"cap-export-btn\">↓ Export ZIP</button>\n        </div>\n      </div>\n\n      <!-- Modal / Dialog für Step-Details -->\n      <div id=\"cap-modal\" class=\"cap-modal\" aria-hidden=\"true\" role=\"dialog\" aria-modal=\"true\">\n        <div class=\"cap-modal-backdrop\" data-action=\"close\"></div>\n        <div class=\"cap-modal-dialog\" role=\"document\">\n          <div class=\"cap-modal-header\">\n            <div class=\"cap-modal-title\">Step Details</div>\n            <button class=\"cap-modal-close\" data-action=\"close\" aria-label=\"Schließen\">✕</button>\n          </div>\n          <div id=\"cap-modal-body\" class=\"cap-modal-body\">\n            <pre class=\"cap-modal-pre\">Lade...</pre>\n          </div>\n        </div>\n      </div>\n    ";
	}
};
customElements.define("capture-ui", e);
//#endregion
//#region src/capture-db.js
var t = "__capture_db__", n = 1, r = class {
	#e = null;
	async open() {
		return this.#e ||= await new Promise((e, r) => {
			let i = indexedDB.open(t, n);
			i.onupgradeneeded = (e) => {
				let t = e.target.result;
				if (!t.objectStoreNames.contains("steps")) {
					let e = t.createObjectStore("steps", { keyPath: ["sessionId", "seqNr"] });
					e.createIndex("bySession", "sessionId", { unique: !1 }), e.createIndex("byType", ["sessionId", "type"], { unique: !1 });
				}
				t.objectStoreNames.contains("stepPayloads") || t.createObjectStore("stepPayloads", { keyPath: ["sessionId", "seqNr"] }).createIndex("bySession", "sessionId", { unique: !1 });
			}, i.onsuccess = (t) => e(t.target.result), i.onerror = (e) => r(e.target.error);
		}), this;
	}
	#t(e, t, n) {
		return new Promise((r, i) => {
			let a = this.#e.transaction(e, t), o = Array.isArray(e) ? e.map((e) => a.objectStore(e)) : a.objectStore(e);
			a.oncomplete = () => r(), a.onerror = (e) => i(e.target.error), n(o, r, i);
		});
	}
	async addStep(e, t) {
		return e.seqNr ??= await this.#n(e.sessionId), t === void 0 ? await this.#t("steps", "readwrite", (t) => t.put(e)) : await this.#t(["steps", "stepPayloads"], "readwrite", (n) => {
			let [r, i] = n;
			r.put(e), i.put({
				sessionId: e.sessionId,
				seqNr: e.seqNr,
				payload: t
			});
		}), e.seqNr;
	}
	async getSteps(e) {
		return new Promise((t, n) => {
			let r = this.#e.transaction("steps", "readonly").objectStore("steps").index("bySession").getAll(IDBKeyRange.only(e));
			r.onsuccess = (e) => t((e.target.result ?? []).sort((e, t) => e.seqNr - t.seqNr)), r.onerror = (e) => n(e.target.error);
		});
	}
	async getStep(e, t) {
		return new Promise((n, r) => {
			let i = this.#e.transaction("steps", "readonly").objectStore("steps").get([e, t]);
			i.onsuccess = (e) => n(e.target.result ?? null), i.onerror = (e) => r(e.target.error);
		});
	}
	async getStepWithPayload(e, t) {
		let n = await this.getStep(e, t);
		if (!n) return null;
		let r = await new Promise((n, r) => {
			let i = this.#e.transaction("stepPayloads", "readonly").objectStore("stepPayloads").get([e, t]);
			i.onsuccess = (e) => {
				let t = e.target.result;
				n(t ? t.payload : null);
			}, i.onerror = (e) => r(e.target.error);
		});
		return Object.assign({}, n, { payload: r });
	}
	async countSteps(e) {
		return new Promise((t, n) => {
			let r = this.#e.transaction("steps", "readonly").objectStore("steps").index("bySession").count(IDBKeyRange.only(e));
			r.onsuccess = (e) => t(e.target.result), r.onerror = (e) => n(e.target.error);
		});
	}
	async clearSession(e) {
		let t = new Promise((t, n) => {
			let r = this.#e.transaction("steps", "readwrite").objectStore("steps").index("bySession").openCursor(IDBKeyRange.only(e));
			r.onsuccess = (e) => {
				let n = e.target.result;
				n ? (n.delete(), n.continue()) : t();
			}, r.onerror = (e) => n(e.target.error);
		}), n = new Promise((t, n) => {
			let r = this.#e.transaction("stepPayloads", "readwrite").objectStore("stepPayloads").index("bySession").openCursor(IDBKeyRange.only(e));
			r.onsuccess = (e) => {
				let n = e.target.result;
				n ? (n.delete(), n.continue()) : t();
			}, r.onerror = (e) => n(e.target.error);
		});
		await Promise.all([t, n]);
	}
	async #n(e) {
		return await this.countSteps(e) + 1;
	}
}, i = null;
async function a() {
	return i ||= await new r().open(), i;
}
//#endregion
//#region src/capture.js
var o = "#app", s = "__cap_open__", c = "__cap_steps__", l = "__cap_session_id__", u = "__cap_tag__", d = "__cap_upload_url__", f = "__cap_pending_nav__", p = "__cap_remote_steps__", m = localStorage.getItem(l) || x(), h = JSON.parse(localStorage.getItem(c) || "[]"), g = localStorage.getItem(u) || "", _ = !1, v = null, y = null, b = [];
function x() {
	let e = Math.random().toString(36).slice(2, 10).toUpperCase();
	return localStorage.setItem(l, e), e;
}
function ee() {
	return Math.random().toString(36).slice(2, 9);
}
function S() {
	localStorage.setItem(c, JSON.stringify(h));
}
async function C() {
	te(), await re(), await Se(), await ne(), ie(), G(), K();
}
function te() {
	document.getElementById("cap-session-id").textContent = m, g && (document.getElementById("cap-tag-input").value = g);
	try {
		let e = localStorage.getItem(d), t = document.getElementById("cap-upload-url-input");
		t && e && (t.value = e), E();
	} catch (e) {
		console.warn("initSessionUI: load upload url failed", e);
	}
	localStorage.getItem(s) === "1" && J();
}
async function ne() {
	try {
		let e = await (await a()).getSteps(m);
		e && e.length ? (h = e.map((e) => ({
			seq: e.seqNr,
			type: e.type,
			label: e.label,
			sub: e.sub,
			time: e.time
		})), S()) : h = JSON.parse(localStorage.getItem(c) || "[]");
	} catch (e) {
		console.error("CaptureDB init failed", e), h = JSON.parse(localStorage.getItem(c) || "[]");
	}
	X();
}
async function re() {
	try {
		let e = JSON.parse(localStorage.getItem(c) || "[]"), t = e.filter((e) => e && (e.seq == null || e.seq === void 0));
		if (!t.length) return;
		let n = await a();
		for (let e of t) try {
			let t = {
				sessionId: m,
				type: e.type,
				label: e.label,
				sub: e.sub || "",
				time: e.time || $()
			}, r;
			if (e.pendingId) try {
				let i = sessionStorage.getItem(f);
				if (i) {
					let a = JSON.parse(i);
					if (a && a.pid === e.pendingId) {
						a.payload && (r = a.payload), a.requestId && (t.requestId = a.requestId), e.seq = await n.addStep(t, r), sessionStorage.removeItem(f);
						continue;
					}
				}
			} catch (e) {
				console.error("reading session pending payload failed", e);
			}
			e.seq = await n.addStep(t);
		} catch (t) {
			console.error("persistLocalPending failed for", e, t);
		}
		localStorage.setItem(c, JSON.stringify(e));
	} catch (e) {
		console.error("persistLocalPending failed overall", e);
	}
}
function ie() {
	let e = document.getElementById("cap-toggle");
	e && e.addEventListener("click", q);
	let t = document.getElementById("cap-tag-btn");
	t && t.addEventListener("click", oe);
	let n = document.getElementById("cap-comment-btn");
	n && n.addEventListener("click", se);
	let r = document.getElementById("cap-clear-btn");
	r && r.addEventListener("click", de);
	let i = document.getElementById("cap-export-btn");
	i && i.addEventListener("click", he);
	let a = document.getElementById("cap-picker-btn");
	a && a.addEventListener("click", D);
	let o = document.getElementById("cap-tab-session"), s = document.getElementById("cap-tab-settings"), c = document.getElementById("cap-tab-picker");
	o && o.addEventListener("click", () => w("session")), s && s.addEventListener("click", () => w("settings")), c && c.addEventListener("click", () => w("picker"));
	let l = document.getElementById("cap-picker-list");
	l && l.addEventListener("click", (e) => {
		let t = e.target && e.target.id;
		t === "cap-picker-clear-btn" && P(), t === "cap-picker-create-step-btn" && F();
	});
	let u = document.getElementById("cap-save-settings-btn");
	u && u.addEventListener("click", T);
	let d = document.getElementById("cap-steps-list");
	d && d.addEventListener("click", async (e) => {
		let t = e.target && e.target.closest && e.target.closest(".cap-step");
		if (!t) return;
		let n = parseInt(t.getAttribute("data-seq"), 10);
		isNaN(n) || await U(n);
	});
	let f = document.getElementById("cap-overlay");
	f && f.addEventListener("click", (e) => {
		(e.target && e.target.getAttribute && e.target.getAttribute("data-action")) === "close" && W();
	});
}
function w(e) {
	let t = document.getElementById("cap-session-inputs"), n = document.getElementById("cap-settings-inputs"), r = document.getElementById("cap-steps-list"), i = document.getElementById("cap-picker-list"), a = document.getElementById("cap-input-area"), o = document.getElementById("cap-tab-session"), s = document.getElementById("cap-tab-settings"), c = document.getElementById("cap-tab-picker");
	!t || !n || ([
		o,
		s,
		c
	].forEach((e) => e && e.classList.remove("active")), e === "settings" ? (a && (a.style.display = ""), t.style.display = "none", n.style.display = "", r && (r.style.display = ""), i && (i.style.display = "none"), s && s.classList.add("active")) : e === "picker" ? (a && (a.style.display = "none"), r && (r.style.display = "none"), i && (i.style.display = ""), c && c.classList.add("active")) : (a && (a.style.display = ""), t.style.display = "", n.style.display = "none", r && (r.style.display = ""), i && (i.style.display = "none"), o && o.classList.add("active")));
}
function T() {
	try {
		let e = document.getElementById("cap-upload-url-input");
		if (!e) return;
		let t = e.value.trim();
		t ? localStorage.setItem(d, t) : localStorage.removeItem(d), E(), alert("Settings gespeichert");
	} catch (e) {
		console.error("saveSettingsToLS failed", e), alert("Speichern fehlgeschlagen");
	}
}
function E() {
	try {
		let e = document.getElementById("cap-export-btn");
		if (!e) return;
		let t = localStorage.getItem(d);
		t && t.trim() ? e.textContent = "↑ Zip-Transfer" : e.textContent = "↓ Zip-Download";
	} catch {}
}
function D() {
	_ ? L() : O();
}
function O() {
	if (_) return;
	_ = !0, document.body.classList.add("element-picker-active");
	let e = document.getElementById("cap-picker-btn");
	e && e.classList.add("active"), w("picker"), v = function(e) {
		if (e.target && e.target.closest && e.target.closest("#cap-overlay, capture-ui")) return;
		let t = e.target && e.target.closest && e.target.closest("form, p");
		t && (e.preventDefault(), e.stopPropagation(), ae(t));
	}, y = function(e) {
		e.key === "Escape" && L();
	}, document.addEventListener("click", v, !0), document.addEventListener("keydown", y, !0);
}
function k(e, t) {
	if (e.id) {
		let n = (t || document).querySelector(`label[for="${CSS.escape(e.id)}"]`);
		if (n) return n.textContent.trim();
	}
	let n = e.closest("label");
	if (n) {
		let e = n.cloneNode(!0);
		return e.querySelectorAll("input, select, textarea").forEach((e) => e.remove()), e.textContent.trim();
	}
	return e.getAttribute("aria-label") || e.getAttribute("placeholder") || e.getAttribute("name") || "";
}
function A(e) {
	let t = [], n = e.querySelectorAll("input, select, textarea");
	for (let r of n) {
		let n = (r.type || "").toLowerCase();
		if (n === "hidden" || n === "submit" || n === "button" || n === "reset" || n === "image") continue;
		let i = k(r, e), a = "";
		if (r.tagName === "SELECT") a = r.options[r.selectedIndex] ? r.options[r.selectedIndex].text : r.value;
		else if (n === "checkbox") a = r.checked ? "ja" : "nein";
		else if (n === "radio") {
			if (!r.checked) continue;
			a = r.value;
		} else a = r.value;
		t.push({
			label: i,
			value: a
		});
	}
	return t;
}
function j(e) {
	return [{
		label: "",
		value: (e.textContent || "").trim()
	}];
}
function M(e) {
	let t = e.tagName.toUpperCase();
	return t === "FORM" ? A(e) : t === "P" ? j(e) : [{
		label: "",
		value: (e.textContent || "").trim().slice(0, 300)
	}];
}
function N(e) {
	let t = e.tagName.toUpperCase();
	return t === "FORM" ? e.getAttribute("title") || e.getAttribute("aria-label") || e.getAttribute("name") || "Formular" : t === "P" ? (e.textContent || "").trim().slice(0, 60) || "Absatz" : t;
}
function ae(e) {
	let t = e.tagName.toUpperCase(), n = M(e);
	if (!n.length) return;
	let r = {
		id: Date.now(),
		tag: t,
		title: N(e),
		time: $(),
		fields: n
	};
	b.push(r), I();
}
function P() {
	b = [], I();
}
async function F() {
	if (!b.length) return;
	let e = {
		type: "pick",
		label: b.map((e) => e.tag + ": " + e.title).join(" | "),
		sub: b.length + " Element(e)",
		payload: { items: b }
	};
	try {
		await Y(e), P(), w("session");
	} catch (e) {
		console.error("createStepFromPickerItems failed", e);
	}
}
function I() {
	let e = document.getElementById("cap-picker-list");
	if (!e) return;
	if (!b.length) {
		e.innerHTML = "<div class=\"empty-hint\">Noch keine Elemente ausgewählt</div>";
		return;
	}
	let t = {
		FORM: "badge-xml",
		P: "badge-comment"
	};
	e.innerHTML = `
    <div class="cap-picker-toolbar">
      <button id="cap-picker-clear-btn" type="button" class="cap-picker-clear-btn">Liste leeren</button>
      <button id="cap-picker-create-step-btn" type="button" class="cap-picker-create-step-btn">Step erstellen</button>
    </div>
    ${b.map((e) => `
      <div class="cap-picker-item">
        <div class="cap-picker-item-header">
          <span class="cap-type-badge ${t[e.tag] || "badge-nav"}">${e.tag}</span>
          <span class="cap-picker-item-title">${Z(e.title)}</span>
          <span class="cap-picker-item-time">${e.time}</span>
        </div>
        <table class="cap-picker-fields">
          ${e.fields.map((e) => `
            <tr>
              <td class="cap-field-label">${Z(e.label)}</td>
              <td class="cap-field-value">${Z(e.value)}</td>
            </tr>
          `).join("")}
        </table>
      </div>
    `).join("")}
  `;
}
function L() {
	if (!_) return;
	_ = !1, document.body.classList.remove("element-picker-active");
	let e = document.getElementById("cap-picker-btn");
	e && e.classList.remove("active"), v &&= (document.removeEventListener("click", v, !0), null), y &&= (document.removeEventListener("keydown", y, !0), null);
}
function R(e) {
	let t = atob(e), n = Uint8Array.from(t, (e) => e.charCodeAt(0));
	return new TextDecoder("utf-8").decode(n);
}
function z(e) {
	if (!e || typeof e != "string") return e;
	try {
		let t = new DOMParser().parseFromString(e, "application/xml");
		return t.querySelector("parsererror") ? e : B(t.documentElement, 0);
	} catch {
		return e;
	}
}
function B(e, t) {
	let n = "  ".repeat(t);
	if (e.nodeType === Node.TEXT_NODE) {
		let t = e.textContent.trim();
		return t ? n + t : "";
	}
	if (e.nodeType !== Node.ELEMENT_NODE) return "";
	let r = e.tagName, i = Array.from(e.attributes).map((e) => ` ${e.name}="${e.value}"`).join(""), a = Array.from(e.childNodes);
	if (a.length === 0) return `${n}<${r}${i}/>`;
	if (a.every((e) => e.nodeType === Node.TEXT_NODE)) {
		let t = e.textContent.trim();
		return t ? `${n}<${r}${i}>${t}</${r}>` : `${n}<${r}${i}/>`;
	}
	return `${n}<${r}${i}>\n${a.map((e) => B(e, t + 1)).filter((e) => e).join("\n")}\n${n}</${r}>`;
}
function V(e) {
	if (!e) return e;
	let t;
	try {
		t = JSON.parse(JSON.stringify(e));
	} catch {
		t = e;
	}
	try {
		if (t.type === "xml" && t.payload && t.payload.base64) {
			for (let e of [
				"request",
				"response",
				"data"
			]) {
				let n = t.payload[e];
				if (!(!n || typeof n != "string")) try {
					let r = R(n);
					t.payload[e] = r.trimStart().startsWith("<") ? z(r) : r;
				} catch (t) {
					console.warn("prepareStepForDisplay: base64 decode failed for", e, t);
				}
			}
			t.payload.decoded = !0;
		}
	} catch (e) {
		console.error("prepareStepForDisplay failed", e);
	}
	return t;
}
function H(e, t) {
	e.innerHTML = "";
	let { payload: n, ...r } = t, i = document.createElement("div");
	i.className = "cap-modal-top-row";
	let a = document.createElement("pre");
	if (a.className = "cap-modal-pre", a.textContent = JSON.stringify(r, null, 2), i.appendChild(a), n && typeof n == "object") {
		let t = [
			"request",
			"response",
			"data"
		], r = /* @__PURE__ */ new Set(), a = Object.fromEntries(Object.entries(n).filter(([e]) => !t.includes(e)));
		if (Object.keys(a).length > 0) {
			let e = document.createElement("div");
			e.className = "cap-modal-payload-section cap-modal-top-col";
			let t = document.createElement("div");
			t.className = "cap-modal-payload-label", t.textContent = "Payload";
			let n = document.createElement("pre");
			n.className = "cap-modal-pre", n.textContent = JSON.stringify(a, null, 2), e.appendChild(t), e.appendChild(n), i.appendChild(e);
		}
		e.appendChild(i);
		for (let i of t) {
			let t = n[i];
			if (!t || typeof t != "string") continue;
			r.add(i);
			let a = document.createElement("div");
			a.className = "cap-modal-payload-section";
			let o = document.createElement("div");
			o.className = "cap-modal-payload-label", o.textContent = i.charAt(0).toUpperCase() + i.slice(1);
			let s = document.createElement("pre");
			s.className = "cap-modal-payload-pre", s.textContent = t, a.appendChild(o), a.appendChild(s), e.appendChild(a);
		}
	} else e.appendChild(i);
}
async function U(e) {
	let t = document.getElementById("cap-overlay");
	if (!t) return;
	let n = t.querySelector("#cap-modal"), r = t.querySelector("#cap-modal-body");
	if (!(!n || !r)) {
		n.setAttribute("aria-hidden", "false"), n.classList.add("open"), r.innerHTML = "<pre class=\"cap-modal-pre\">Lade...</pre>";
		try {
			let t = await (await a()).getStepWithPayload(m, e);
			t ? H(r, V(t)) : H(r, V(h.find((t) => t.seq === e) || { error: "Step nicht gefunden" }));
		} catch (t) {
			console.error("openStepModal failed", t), H(r, V(h.find((t) => t.seq === e) || { error: String(t) }));
		}
	}
}
function W() {
	let e = document.getElementById("cap-overlay");
	if (!e) return;
	let t = e.querySelector("#cap-modal");
	t && (t.setAttribute("aria-hidden", "true"), t.classList.remove("open"));
}
function G() {
	let e = document.querySelector("capture-ui"), t = e && e.getAttribute("app-root") || o, n = document.querySelector(t);
	n ? be(n) : console.warn("Capture: app-root nicht gefunden:", t);
}
function K() {
	window.addEventListener("beforeunload", () => {
		try {
			xe();
		} catch (e) {
			console.error("beforeunload flush pending nav failed", e);
		}
	});
}
function q() {
	let e = document.getElementById("cap-panel");
	e.classList.contains("open") ? (e.classList.remove("open"), localStorage.setItem(s, "0")) : J();
}
function J() {
	document.getElementById("cap-panel").classList.add("open"), localStorage.setItem(s, "1");
}
async function oe() {
	if (g = document.getElementById("cap-tag-input").value.trim(), g) {
		localStorage.setItem(u, g);
		try {
			await Y({
				type: "comment",
				label: "Tag gesetzt: " + g,
				sub: ""
			});
		} catch (e) {
			console.error("setTag failed", e);
		}
	}
}
async function se() {
	let e = document.getElementById("cap-comment-input").value.trim();
	if (e) try {
		await Y({
			type: "comment",
			label: e,
			sub: ""
		}), document.getElementById("cap-comment-input").value = "";
	} catch (e) {
		console.error("addComment failed", e);
	}
}
async function ce(e) {
	let t = {
		sessionId: m,
		type: e.type,
		label: e.label,
		sub: e.sub || "",
		time: e.time
	}, n = e.payload;
	try {
		let r = await (await a()).addStep(t, n);
		return e.seq = r, r;
	} catch (t) {
		return console.error("addStep to CaptureDB failed", t), e.seq = (h.length ? Math.max(...h.map((e) => e.seq || 0)) : 0) + 1, e.seq;
	}
}
function le() {
	X(), E();
	let e = document.getElementById("cap-dot");
	e && (e.classList.add("active"), setTimeout(() => e.classList.remove("active"), 800));
}
function ue(e) {
	h.push({
		seq: e.seq,
		type: e.type,
		label: e.label,
		sub: e.sub || "",
		time: e.time
	}), S();
}
async function Y(e) {
	return e.time = e.time || $(), e.seq = await ce(e), ue(e), le(), e.seq;
}
function X() {
	let e = document.getElementById("cap-steps-list"), t = document.getElementById("cap-count-badge");
	if (t && (t.textContent = h.length), !h.length) {
		e.innerHTML = "<div class=\"empty-hint\">Noch keine Steps erfasst</div>";
		return;
	}
	let n = {
		nav: "badge-nav",
		xml: "badge-xml",
		comment: "badge-comment",
		error: "badge-error",
		pick: "badge-pick"
	}, r = {
		nav: "NAV",
		xml: "XML",
		comment: "KOM",
		error: "ERR",
		pick: "PCK"
	};
	e.innerHTML = [...h].reverse().map((e) => `
    <div class="cap-step" data-seq="${e.seq}">
      <span class="cap-seq">${e.seq}</span>
      <span class="cap-type-badge ${n[e.type] || "badge-nav"}">${r[e.type] || "NAV"}</span>
      <div>
        <div class="cap-step-label">${Z(e.label)}</div>
        <div class="cap-step-sub">${e.time}${e.sub ? " · " + Z(e.sub) : ""}</div>
      </div>
    </div>`).join("");
}
async function de() {
	if (confirm("Session wirklich leeren?")) {
		try {
			await (await a()).clearSession(m);
		} catch (e) {
			console.error("clearSession IndexedDB failed", e);
		}
		h = [], m = x(), localStorage.removeItem(c), localStorage.removeItem(u), g = "", document.getElementById("cap-session-id").textContent = m, document.getElementById("cap-tag-input").value = "", X();
	}
}
async function fe(e) {
	return new Promise((t, n) => {
		if (window.JSZip) return t();
		let r = document.createElement("script");
		r.src = e, r.async = !0, r.onload = () => t(), r.onerror = (t) => n(/* @__PURE__ */ Error("Script load failed: " + e)), document.head.appendChild(r);
	});
}
function pe(e) {
	return String(e || "").replace(/\s+/g, "_").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").slice(0, 120) || "item";
}
function me(e, t = 3) {
	let n = String(e);
	return n.length >= t ? n : "0".repeat(t - n.length) + n;
}
async function he() {
	try {
		let e = await a();
		if (!window.JSZip && (await fe("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"), !window.JSZip)) throw Error("JSZip not available after script load");
		let t = await e.getSteps(m);
		if (!Array.isArray(t) || t.length === 0) {
			alert("Export abgebrochen: Keine Steps in der Session vorhanden.");
			return;
		}
		let n = new window.JSZip(), r = {
			sessionId: m,
			tag: g || null,
			stepCount: t.length,
			exportedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		n.file("session.json", JSON.stringify(r, null, 2));
		for (let r of t) {
			let t = r.seqNr ?? r.seq, i = V(await e.getStepWithPayload(m, t)), a = (i.type || "step").toString().toUpperCase(), o = i.label ? pe(i.label) : "", s = `${me(t)}_${a}${o ? "_" + o : ""}`;
			n.file(`${s}.json`, JSON.stringify(i, null, 2));
		}
		let i = await n.generateAsync({
			type: "blob",
			compression: "DEFLATE",
			compressionOptions: { level: 6 }
		}), o = localStorage.getItem(d);
		if (o && o.trim()) try {
			let e = new FormData(), t = `capture-${m}.zip`;
			e.append("file", i, t), e.append("sessionId", m), g && e.append("tag", g);
			let n = await fetch(o, {
				method: "POST",
				body: e
			});
			if (!n.ok) {
				let e = await n.text().catch(() => "");
				throw Error(`Upload fehlgeschlagen (${n.status}) ${e}`);
			}
			alert("Upload erfolgreich");
		} catch (e) {
			console.error("ZIP upload failed", e), alert("Upload fehlgeschlagen: " + (e && e.message ? e.message : String(e)));
		}
		else {
			let e = URL.createObjectURL(i), t = document.createElement("a");
			t.href = e, t.download = `capture-${m}.zip`, document.body.appendChild(t), t.click(), t.remove(), setTimeout(() => URL.revokeObjectURL(e), 5e3);
		}
	} catch (e) {
		console.error("exportZip failed", e), alert("Export fehlgeschlagen: " + (e && e.message ? e.message : String(e)));
	}
}
function Z(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function ge(e) {
	return {
		type: "nav",
		label: (e.textContent || e.getAttribute("title") || e.getAttribute("href")).trim(),
		sub: e.getAttribute("href") || "",
		time: $()
	};
}
function _e(e) {
	let t = new FormData(e), n = [];
	for (let [e, r] of t.entries()) n.push({
		name: e,
		value: String(r)
	});
	return {
		type: "nav",
		label: e.getAttribute("title") || "Form",
		sub: e.getAttribute("action") || "",
		time: $(),
		payload: {
			action: e.getAttribute("action") || "",
			method: e.getAttribute("method") || "GET",
			formData: n
		}
	};
}
function Q(e) {
	try {
		let t = ee(), n = Object.assign({ pid: t }, e);
		sessionStorage.setItem(f, JSON.stringify(n));
	} catch (e) {
		console.error("set pending nav failed", e);
	}
}
function ve(e) {
	let t = e.target && e.target.closest && e.target.closest("a[href]");
	t && Q(ge(t));
}
function ye(e) {
	let t = e.target;
	t && Q(_e(t));
}
function be(e) {
	e.addEventListener("click", ve), e.addEventListener("submit", ye);
}
function xe() {
	let e = sessionStorage.getItem(f);
	if (!e) return;
	let t;
	try {
		t = JSON.parse(e);
	} catch (e) {
		console.error("failed to parse pending nav", e);
		return;
	}
	let n = JSON.parse(localStorage.getItem(c) || "[]"), r = {
		type: t.type,
		label: t.label,
		sub: t.sub || "",
		time: t.time || $(),
		pendingId: t.pid
	};
	n.push(r), localStorage.setItem(c, JSON.stringify(n));
}
function $() {
	return (/* @__PURE__ */ new Date()).toLocaleTimeString("de-DE", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	});
}
document.readyState === "loading" ? window.addEventListener("DOMContentLoaded", () => C()) : C();
async function Se() {
	try {
		let e = document.getElementById(p);
		if (!e) return;
		let t;
		try {
			let n = (e.textContent ?? e.innerText ?? e.innerHTML ?? "").trim();
			if (!n) {
				console.warn(p);
				return;
			}
			t = JSON.parse(n);
		} catch (e) {
			console.error("Parsing " + p + " failed", e);
			return;
		}
		let n = Array.isArray(t.steps) ? t.steps : [];
		for (let e of n) await Y({
			type: e.type || "rstep",
			label: e.label || "Remote Step ...",
			sub: "",
			time: $(),
			payload: e
		});
		console.info("Stored remote steps");
	} catch (e) {
		console.error("processRemoteSteps failed", e);
	}
}
//#endregion
