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
const RESET_ON_RELOAD = false; // ★ было true — провоцировало /init с пустыми именами

// ★ стабильный uid + общий fetch-хелпер с X-User-ID
const UID = (() => {
    const k = "slc_uid";
    let v = localStorage.getItem(k);
    if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v); }
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

    // ★ УБРАН resetBackend() с пустыми именами — больше не дергаем /init дважды с 400
    async function load() {
        try {
            setLoading(true);
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
            await load();
            const t = setInterval(load, 4000);
            return () => clearInterval(t);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            await load();
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
            await load();
        } catch (e: any) {
            alert(e?.message ?? String(e));
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                <h1 className="text-xl font-bold">Self-Learning Classifier — React UI</h1>
                <p>Loading…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-gray-900">
            <div className="max-w-5xl mx-auto p-6 space-y-6">
                <header>
                    <h1 className="text-2xl font-bold">Self-Learning Classifier — React UI</h1>
                    <p className="text-sm text-gray-600">API: <code>{V1}</code></p>
                    <p className="text-sm text-gray-600">User: <code>{UID}</code></p>
                </header>

                {error && <div className="p-3 border rounded-xl text-red-700 bg-red-50">{error}</div>}

                {/* Init */}
                <section className="p-4 border rounded-2xl space-y-3">
                    <h2 className="text-lg font-semibold">Init classes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <input className="w-full px-3 py-2 border rounded-xl" placeholder="Class 1 name"
                                   value={c1Name} onChange={(e) => setC1Name(e.target.value)} />
                            <input className="w-full px-3 py-2 border rounded-xl" placeholder="Class 1 properties (space/comma separated)"
                                   value={c1PropsText} onChange={(e) => setC1PropsText(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <input className="w-full px-3 py-2 border rounded-xl" placeholder="Class 2 name"
                                   value={c2Name} onChange={(e) => setC2Name(e.target.value)} />
                            <input className="w-full px-3 py-2 border rounded-xl" placeholder="Class 2 properties (space/comma separated)"
                                   value={c2PropsText} onChange={(e) => setC2PropsText(e.target.value)} />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onInit}
                        disabled={sending || !c1Name.trim() || !c2Name.trim()}
                        className="px-4 py-2 rounded-xl border bg-gray-900 text-white disabled:opacity-60"
                    >
                        Init
                    </button>
                </section>

                {/* Properties */}
                {state && (
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold">Properties</h2>
                        <div className="overflow-x-auto border rounded-2xl">
                            <table className="min-w-full border-collapse">
                                <thead>
                                <tr className="bg-gray-50">
                                    <Th>Property</Th>
                                    <Th>{state.class1?.name || "Class 1"}</Th>
                                    <Th>{state.class2?.name || "Class 2"}</Th>
                                    <Th>General</Th>
                                    <Th>None</Th>
                                </tr>
                                </thead>
                                <tbody>
                                {Array.from(new Set(allProps)).map((p) => (
                                    <tr key={p} className="odd:bg-white even:bg-gray-50">
                                        <Td className="font-medium">{p}</Td>
                                        <Td>{mark(state.class1?.properties, p)}</Td>
                                        <Td>{mark(state.class2?.properties, p)}</Td>
                                        <Td>{mark(state.generalClass, p)}</Td>
                                        <Td>{mark(state.noneClass, p)}</Td>
                                    </tr>
                                ))}
                                {!allProps.length && (
                                    <tr><Td colSpan={5}>No properties yet</Td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Classify + Feedback */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">Classify</h2>
                    <div className="flex gap-2 items-center">
                        <input className="flex-1 px-3 py-2 border rounded-xl"
                               placeholder="Enter properties separated by spaces or commas"
                               value={inputText} onChange={(e) => setInputText(e.target.value)} />
                        <button onClick={onClassify} disabled={sending || inputList.length === 0}
                                className="px-4 py-2 rounded-xl border bg-gray-900 text-white disabled:opacity-60">
                            Classify
                        </button>
                    </div>

                    {!!guess && state && (
                        <div className="p-3 border rounded-2xl">
                            <div className="mb-2">Prediction: <b>{guess || "—"}</b></div>
                            {reason && <div className="text-sm text-gray-600 mb-3">{reason}</div>}
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => sendFeedback(toVariant(guess, state))}
                                        disabled={sending} className="px-4 py-2 rounded-xl border bg-gray-900 text-white disabled:opacity-60">
                                    Correct
                                </button>
                                <button onClick={() => sendFeedback("class1")} disabled={sending} className="px-4 py-2 rounded-xl border">
                                    It is {state.class1?.name || "Class 1"}
                                </button>
                                <button onClick={() => sendFeedback("class2")} disabled={sending} className="px-4 py-2 rounded-xl border">
                                    It is {state.class2?.name || "Class 2"}
                                </button>
                                <button onClick={() => sendFeedback("none")} disabled={sending} className="px-4 py-2 rounded-xl border">
                                    None class
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return <th className="text-left px-3 py-2 border-b">{children}</th>;
}
function Td({
                children,
                className = "",
                ...rest
            }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLTableCellElement>) {
    return (
        <td className={`px-3 py-2 border-b ${className}`} {...rest}>
            {children}
        </td>
    );
}
function mark(list: string[] | undefined, prop: string) {
    return Array.isArray(list) && list.includes(prop) ? "✓" : "";
}
