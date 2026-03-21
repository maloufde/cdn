//#region src/capture-ui.js
var e = class extends HTMLElement {
	connectedCallback() {
		this.innerHTML = "\n      <div id=\"cap-toggle\">\n        <div id=\"cap-dot\"></div>\n        <span id=\"cap-toggle-label\">Capture</span>\n        <span id=\"cap-count-badge\">0</span>\n      </div>\n      <div id=\"cap-panel\">\n        <div id=\"cap-panel-header\">\n          <span>Capture-Session</span>\n          <span id=\"cap-session-id\">—</span>\n        </div>\n        <div id=\"cap-session-tag\">\n          <input id=\"cap-tag-input\" type=\"text\" placeholder=\"Tag eingeben...\">\n          <button id=\"cap-tag-btn\" type=\"button\">Setzen</button>\n        </div>\n        <div id=\"cap-steps-list\">\n          <div class=\"empty-hint\">Noch keine Steps erfasst</div>\n        </div>\n        <div id=\"cap-comment-area\">\n          <input id=\"cap-comment-input\" type=\"text\" placeholder=\"Kommentar eingeben...\">\n          <button id=\"cap-comment-btn\" type=\"button\">+ Kommentar</button>\n        </div>\n        <div id=\"cap-actions\">\n          <button class=\"cap-action-btn\" type=\"button\" id=\"cap-clear-btn\">Session leeren</button>\n          <button class=\"cap-action-btn\" type=\"button\" id=\"cap-picker-btn\">Element‑Picker</button>\n          <button class=\"cap-action-btn primary\" type=\"button\" id=\"cap-export-btn\">↓ Export ZIP</button>\n        </div>\n      </div>\n\n      <!-- Modal / Dialog für Step-Details -->\n      <div id=\"cap-modal\" class=\"cap-modal\" aria-hidden=\"true\" role=\"dialog\" aria-modal=\"true\">\n        <div class=\"cap-modal-backdrop\" data-action=\"close\"></div>\n        <div class=\"cap-modal-dialog\" role=\"document\">\n          <div class=\"cap-modal-header\">\n            <div class=\"cap-modal-title\">Step Details</div>\n            <button class=\"cap-modal-close\" data-action=\"close\" aria-label=\"Schließen\">✕</button>\n          </div>\n          <div id=\"cap-modal-body\" class=\"cap-modal-body\">\n            <pre class=\"cap-modal-pre\">Lade...</pre>\n          </div>\n        </div>\n      </div>\n    ";
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
var o = "#sim-content", s = "__cap_open__", c = "__cap_steps__", l = "__cap_session_id__", u = "__cap_tag__", d = "__cap_pending_nav__", f = "__cap_remote_steps__", p = localStorage.getItem(l) || y(), m = JSON.parse(localStorage.getItem(c) || "[]"), h = localStorage.getItem(u) || "", g = !1, _ = null, v = null;
function y() {
	let e = Math.random().toString(36).slice(2, 10).toUpperCase();
	return localStorage.setItem(l, e), e;
}
function b() {
	return Math.random().toString(36).slice(2, 9);
}
function x() {
	localStorage.setItem(c, JSON.stringify(m));
}
async function S() {
	C(), await T(), await ae(), await w(), E(), N(), P();
}
function C() {
	document.getElementById("cap-session-id").textContent = p, h && (document.getElementById("cap-tag-input").value = h), localStorage.getItem(s) === "1" && I();
}
async function w() {
	try {
		let e = await (await a()).getSteps(p);
		e && e.length ? (m = e.map((e) => ({
			seq: e.seqNr,
			type: e.type,
			label: e.label,
			sub: e.sub,
			time: e.time
		})), x()) : m = JSON.parse(localStorage.getItem(c) || "[]");
	} catch (e) {
		console.error("CaptureDB init failed", e), m = JSON.parse(localStorage.getItem(c) || "[]");
	}
	U();
}
async function T() {
	try {
		let e = JSON.parse(localStorage.getItem(c) || "[]"), t = e.filter((e) => e && (e.seq == null || e.seq === void 0));
		if (!t.length) return;
		let n = await a();
		for (let e of t) try {
			let t = {
				sessionId: p,
				type: e.type,
				label: e.label,
				sub: e.sub || "",
				time: e.time || $()
			}, r;
			if (e.pendingId) try {
				let i = sessionStorage.getItem(d);
				if (i) {
					let a = JSON.parse(i);
					if (a && a.pid === e.pendingId) {
						a.payload && (r = a.payload), a.requestId && (t.requestId = a.requestId), e.seq = await n.addStep(t, r), sessionStorage.removeItem(d);
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
function E() {
	let e = document.getElementById("cap-toggle");
	e && e.addEventListener("click", F);
	let t = document.getElementById("cap-tag-btn");
	t && t.addEventListener("click", L);
	let n = document.getElementById("cap-comment-btn");
	n && n.addEventListener("click", R);
	let r = document.getElementById("cap-clear-btn");
	r && r.addEventListener("click", W);
	let i = document.getElementById("cap-export-btn");
	i && i.addEventListener("click", J);
	let a = document.getElementById("cap-picker-btn");
	a && a.addEventListener("click", D);
	let o = document.getElementById("cap-steps-list");
	o && o.addEventListener("click", async (e) => {
		let t = e.target && e.target.closest && e.target.closest(".cap-step");
		if (!t) return;
		let n = parseInt(t.getAttribute("data-seq"), 10);
		isNaN(n) || await j(n);
	});
	let s = document.getElementById("cap-overlay");
	s && s.addEventListener("click", (e) => {
		(e.target && e.target.getAttribute && e.target.getAttribute("data-action")) === "close" && M();
	});
}
function D() {
	g ? k() : O();
}
function O() {
	if (g) return;
	g = !0, document.body.classList.add("element-picker-active");
	let e = document.getElementById("cap-picker-btn");
	e && e.classList.add("active"), _ = function(e) {
		let t = e.target && e.target.closest && e.target.closest("form, p");
		t && (e.preventDefault(), e.stopPropagation(), console.info("Element-Picker: ausgewählt", {
			tag: t.tagName,
			id: t.id || null,
			classes: t.className || null,
			textSnippet: (t.textContent || "").trim().slice(0, 160)
		}));
	}, v = function(e) {
		e.key === "Escape" && k();
	}, document.addEventListener("click", _, !0), document.addEventListener("keydown", v, !0);
}
function k() {
	if (!g) return;
	g = !1, document.body.classList.remove("element-picker-active");
	let e = document.getElementById("cap-picker-btn");
	e && e.classList.remove("active"), _ &&= (document.removeEventListener("click", _, !0), null), v &&= (document.removeEventListener("keydown", v, !0), null);
}
function ee(e) {
	let t = atob(e), n = Uint8Array.from(t, (e) => e.charCodeAt(0));
	return new TextDecoder("utf-8").decode(n);
}
function A(e) {
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
					t.payload[e] = ee(n);
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
async function j(e) {
	let t = document.getElementById("cap-overlay");
	if (!t) return;
	let n = t.querySelector("#cap-modal"), r = t.querySelector("#cap-modal-body pre");
	if (!(!n || !r)) {
		n.setAttribute("aria-hidden", "false"), n.classList.add("open"), r.textContent = "Lade...";
		try {
			let t = await (await a()).getStepWithPayload(p, e);
			if (t) {
				let e = A(t);
				r.textContent = JSON.stringify(e, null, 2);
			} else {
				let t = A(m.find((t) => t.seq === e) || { error: "Step nicht gefunden" });
				r.textContent = JSON.stringify(t, null, 2);
			}
		} catch (t) {
			console.error("openStepModal failed", t);
			let n = A(m.find((t) => t.seq === e) || { error: String(t) });
			r.textContent = JSON.stringify(n, null, 2);
		}
	}
}
function M() {
	let e = document.getElementById("cap-overlay");
	if (!e) return;
	let t = e.querySelector("#cap-modal");
	t && (t.setAttribute("aria-hidden", "true"), t.classList.remove("open"));
}
function N() {
	let e = document.querySelector(o);
	e ? re(e) : console.warn("Capture: APP_ROOT_SELECTOR nicht gefunden:", o);
}
function P() {
	window.addEventListener("beforeunload", () => {
		try {
			ie();
		} catch (e) {
			console.error("beforeunload flush pending nav failed", e);
		}
	});
}
function F() {
	let e = document.getElementById("cap-panel");
	e.classList.contains("open") ? (e.classList.remove("open"), localStorage.setItem(s, "0")) : I();
}
function I() {
	document.getElementById("cap-panel").classList.add("open"), localStorage.setItem(s, "1");
}
async function L() {
	if (h = document.getElementById("cap-tag-input").value.trim(), h) {
		localStorage.setItem(u, h);
		try {
			await H({
				type: "comment",
				label: "Tag gesetzt: " + h,
				sub: ""
			});
		} catch (e) {
			console.error("setTag failed", e);
		}
	}
}
async function R() {
	let e = document.getElementById("cap-comment-input").value.trim();
	if (e) try {
		await H({
			type: "comment",
			label: e,
			sub: ""
		}), document.getElementById("cap-comment-input").value = "";
	} catch (e) {
		console.error("addComment failed", e);
	}
}
async function z(e) {
	let t = {
		sessionId: p,
		type: e.type,
		label: e.label,
		sub: e.sub || "",
		time: e.time
	}, n = e.payload;
	try {
		let r = await (await a()).addStep(t, n);
		return e.seq = r, r;
	} catch (t) {
		return console.error("addStep to CaptureDB failed", t), e.seq = (m.length ? Math.max(...m.map((e) => e.seq || 0)) : 0) + 1, e.seq;
	}
}
function B() {
	U();
	let e = document.getElementById("cap-dot");
	e && (e.classList.add("active"), setTimeout(() => e.classList.remove("active"), 800));
}
function V(e) {
	m.push({
		seq: e.seq,
		type: e.type,
		label: e.label,
		sub: e.sub || "",
		time: e.time
	}), x();
}
async function H(e) {
	return e.time = e.time || $(), e.seq = await z(e), V(e), B(), e.seq;
}
function U() {
	let e = document.getElementById("cap-steps-list"), t = document.getElementById("cap-count-badge");
	if (t && (t.textContent = m.length), !m.length) {
		e.innerHTML = "<div class=\"empty-hint\">Noch keine Steps erfasst</div>";
		return;
	}
	let n = {
		nav: "badge-nav",
		xml: "badge-xml",
		comment: "badge-comment",
		error: "badge-error"
	}, r = {
		nav: "NAV",
		xml: "XML",
		comment: "KOM",
		error: "ERR"
	};
	e.innerHTML = [...m].reverse().map((e) => `
    <div class="cap-step" data-seq="${e.seq}">
      <span class="cap-seq">${e.seq}</span>
      <span class="cap-type-badge ${n[e.type] || "badge-nav"}">${r[e.type] || "NAV"}</span>
      <div>
        <div class="cap-step-label">${Y(e.label)}</div>
        <div class="cap-step-sub">${e.time}${e.sub ? " · " + Y(e.sub) : ""}</div>
      </div>
    </div>`).join("");
}
async function W() {
	if (confirm("Session wirklich leeren?")) {
		try {
			await (await a()).clearSession(p);
		} catch (e) {
			console.error("clearSession IndexedDB failed", e);
		}
		m = [], p = y(), localStorage.removeItem(c), localStorage.removeItem(u), h = "", document.getElementById("cap-session-id").textContent = p, document.getElementById("cap-tag-input").value = "", U();
	}
}
async function G(e) {
	return new Promise((t, n) => {
		if (window.JSZip) return t();
		let r = document.createElement("script");
		r.src = e, r.async = !0, r.onload = () => t(), r.onerror = (t) => n(/* @__PURE__ */ Error("Script load failed: " + e)), document.head.appendChild(r);
	});
}
function K(e) {
	return String(e || "").replace(/\s+/g, "_").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").slice(0, 120) || "item";
}
function q(e, t = 3) {
	let n = String(e);
	return n.length >= t ? n : "0".repeat(t - n.length) + n;
}
async function J() {
	try {
		let e = await a();
		if (!window.JSZip && (await G("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"), !window.JSZip)) throw Error("JSZip not available after script load");
		let t = await e.getSteps(p);
		if (!Array.isArray(t) || t.length === 0) {
			alert("Export abgebrochen: Keine Steps in der Session vorhanden.");
			return;
		}
		let n = new window.JSZip(), r = {
			sessionId: p,
			tag: h || null,
			stepCount: t.length,
			exportedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		n.file("session.json", JSON.stringify(r, null, 2));
		for (let r of t) {
			let t = r.seqNr ?? r.seq, i = A(await e.getStepWithPayload(p, t)), a = (i.type || "step").toString().toUpperCase(), o = i.label ? K(i.label) : "", s = `${q(t)}_${a}${o ? "_" + o : ""}`;
			n.file(`${s}.json`, JSON.stringify(i, null, 2));
		}
		let i = await n.generateAsync({
			type: "blob",
			compression: "DEFLATE",
			compressionOptions: { level: 6 }
		}), o = URL.createObjectURL(i), s = document.createElement("a");
		s.href = o, s.download = `capture-${p}.zip`, document.body.appendChild(s), s.click(), s.remove(), setTimeout(() => URL.revokeObjectURL(o), 5e3);
	} catch (e) {
		console.error("exportZip failed", e), alert("Export fehlgeschlagen: " + (e && e.message ? e.message : String(e)));
	}
}
function Y(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function X(e) {
	return {
		type: "nav",
		label: (e.textContent || e.getAttribute("title") || e.getAttribute("href")).trim(),
		sub: e.getAttribute("href") || "",
		time: $()
	};
}
function Z(e) {
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
		let t = b(), n = Object.assign({ pid: t }, e);
		sessionStorage.setItem(d, JSON.stringify(n));
	} catch (e) {
		console.error("set pending nav failed", e);
	}
}
function te(e) {
	let t = e.target && e.target.closest && e.target.closest("a[href]");
	t && Q(X(t));
}
function ne(e) {
	let t = e.target;
	t && Q(Z(t));
}
function re(e) {
	e.addEventListener("click", te), e.addEventListener("submit", ne);
}
function ie() {
	let e = sessionStorage.getItem(d);
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
document.readyState === "loading" ? window.addEventListener("DOMContentLoaded", () => S()) : S();
async function ae() {
	try {
		let e = document.getElementById(f);
		if (!e) return;
		let t;
		try {
			let n = (e.textContent ?? e.innerText ?? e.innerHTML ?? "").trim();
			if (!n) {
				console.warn(f);
				return;
			}
			t = JSON.parse(n);
		} catch (e) {
			console.error("Parsing " + f + " failed", e);
			return;
		}
		let n = Array.isArray(t.steps) ? t.steps : [];
		for (let e of n) await H({
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
