import React, { useEffect, useMemo, useRef, useState } from "react";

type Snapshot = {
    class1: { name: string; properties: string[] };
    class2: { name: string; properties: string[] };
    generalClass: string[];
    noneClass: string[];
};
type ClassifyAny = Record<string, any>;

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const V1 = `${API}/api/v1`;

function secureRandomString(length: number) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(36)).join('');
}

const UID = (() => {
    const k = "slc_uid";
    let v = localStorage.getItem(k);
    if (!v) { v = secureRandomString(12) + Date.now().toString(36); localStorage.setItem(k, v); }
    return v;
})();
async function api(path: string, init?: RequestInit) {
    const h = new Headers(init?.headers || {});
    h.set("X-User-ID", UID);
    return fetch(`${V1}${path}`, { ...init, headers: h });
}

const uniqSorted = (arr: string[]) => Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
const has = (list: string[] | undefined, p: string) => (Array.isArray(list) && list.includes(p) ? "✓" : "");
const parseProps = (s: string) => s.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);

export default function App() {
    const [snap, setSnap] = useState<Snapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [c1, setC1] = useState("");
    const [c2, setC2] = useState("");
    const [c1Props, setC1Props] = useState("");
    const [c2Props, setC2Props] = useState("");

    const [input, setInput] = useState("");
    const [prediction, setPrediction] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const didPrefillNamesRef = useRef(false);

    async function load() {
        try {
            setErr("");
            const res = await api(`/state`);
            if (!res.ok) throw new Error(`/api/v1/state -> ${res.status}`);
            const data: Snapshot = await res.json();
            setSnap(data);
            if (!didPrefillNamesRef.current) {
                if (!c1) setC1(data?.class1?.name ?? "");
                if (!c2) setC2(data?.class2?.name ?? "");
                didPrefillNamesRef.current = true;
            }
        } catch (e: any) {
            setErr(e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        (async () => {
            const t = setInterval(load, 4000);
            await load();  
            return () => clearInterval(t);
        })();
    }, []);

    const allProps = useMemo(() => {
        if (!snap) return [];
        return uniqSorted([
            ...(snap.class1?.properties || []),
            ...(snap.class2?.properties || []),
            ...(snap.generalClass || []),
            ...(snap.noneClass || []),
        ]);
    }, [snap]);

    const inputList = useMemo(() => parseProps(input), [input]);

    async function onInit() {
        if (!c1.trim() || !c2.trim()) {
            alert("Fill both class names");
            return;
        }
        try {
            setBusy(true);
            const res = await api(`/init`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    class1: { name: c1.trim(), properties: parseProps(c1Props) },
                    class2: { name: c2.trim(), properties: parseProps(c2Props) },
                }),
            });
            if (!res.ok) throw new Error(`/api/v1/init -> ${res.status}`);
            setPrediction(null);
        } catch (e: any) {
            alert(e?.message ?? String(e));
        } finally {
            setBusy(false);
        }
    }

    async function onClassify() {
        if (!inputList.length) return;
        try {
            setBusy(true);
            const res = await api(`/classify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ properties: inputList }),
            });
            if (!res.ok) throw new Error(`/api/v1/classify -> ${res.status}`);
            const data: ClassifyAny = await res.json();
            const guess = data.predicted ?? data.guess ?? data.class ?? data.result ?? null;
            setPrediction(JSON.stringify({
                guess: typeof guess === "string" ? guess : "",
                reason: data.reason ?? "",
                knownHits: Array.isArray(data.knownHits) ? data.knownHits : [],
                unknown: Array.isArray(data.unknown) ? data.unknown : [],
                recommendation: data.recommendation ?? "",
            }, null, 2));
        } catch (e: any) {
            alert(e?.message ?? String(e));
        } finally {
            setBusy(false);
        }
    }

    async function sendFeedback(variant: "class1" | "class2" | "none") {
        if (!inputList.length) { alert("Enter properties first"); return; }
        try {
            setBusy(true);
            const res = await api(`/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ variant, properties: inputList }),
            });
            if (!res.ok) throw new Error(`/api/v1/feedback -> ${res.status}`);
            setPrediction(null);
            setInput("");
        } catch (e: any) {
            alert(e?.message ?? String(e));
        } finally {
            setBusy(false);
        }
    }
}