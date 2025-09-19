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
const RESET_ON_RELOAD = true;

const uniqSorted = (arr: string[]) =>
  Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
const has = (list: string[] | undefined, p: string) =>
  Array.isArray(list) && list.includes(p) ? "✓" : "";
const parseProps = (s: string) =>
  s.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);

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

  async function resetBackend() {
    try {
      await fetch(`${V1}/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class1: { name: "", properties: [] as string[] },
          class2: { name: "", properties: [] as string[] },
        }),
      });

      await fetch(`${V1}/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class1: { name: "Class1", properties: [] as string[] },
          class2: { name: "Class2", properties: [] as string[] },
        }),
      });
    } catch {}
  }

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`${V1}/state`);
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
      if (RESET_ON_RELOAD) await resetBackend();
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
      const res = await fetch(`${V1}/init`, {
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
      const res = await fetch(`${V1}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties: inputList }),
      });
      if (!res.ok) throw new Error(`/api/v1/classify -> ${res.status}`);
      const data: ClassifyAny = await res.json();
      const guess =
        data.predicted ?? data.guess ?? data.class ?? data.result ?? null;
      setPrediction(
        JSON.stringify(
          {
            guess: typeof guess === "string" ? guess : "",
            reason: data.reason ?? "",
            knownHits: Array.isArray(data.knownHits) ? data.knownHits : [],
            unknown: Array.isArray(data.unknown) ? data.unknown : [],
            recommendation: data.recommendation ?? "",
          },
          null,
          2
        )
      );
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendFeedback(variant: "class1" | "class2" | "none") {
    if (!inputList.length) {
      alert("Enter properties first");
      return;
    }
    try {
      setBusy(true);
      const res = await fetch(`${V1}/feedback`, {
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

  const c1Name = snap?.class1?.name || c1 || "Class 1";
  const c2Name = snap?.class2?.name || c2 || "Class 2";

  return (
    <div style={page}>
      <div style={shell}>
        <header style={header}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Self-Learning Classifier — UI</h1>
            <div style={{ color: "#6b7280", fontSize: 13 }}>
              API: <code>{V1}</code>
            </div>
          </div>
        </header>

        <main style={main}>
          <section style={panel}>
            <h2 style={h2}>Init (names + properties)</h2>
            <div style={formGrid}>
              <div style={field}>
                <label style={label}>Class 1 name</label>
                <input
                  placeholder="Class 1 name"
                  value={c1}
                  onChange={(e) => setC1(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={field}>
                <label style={label}>Class 1 properties</label>
                <input
                  placeholder="comma or space separated"
                  value={c1Props}
                  onChange={(e) => setC1Props(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={field}>
                <label style={label}>Class 2 name</label>
                <input
                  placeholder="Class 2 name"
                  value={c2}
                  onChange={(e) => setC2(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={field}>
                <label style={label}>Class 2 properties</label>
                <input
                  placeholder="comma or space separated"
                  value={c2Props}
                  onChange={(e) => setC2Props(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <button onClick={onInit} disabled={busy} style={btnPrimary}>
                  Init
                </button>
              </div>
            </div>
            {loading && <p>Loading…</p>}
            {err && <p style={{ color: "crimson" }}>{err}</p>}
          </section>

          <section style={{ ...panel, overflow: "hidden" }}>
            <h2 style={h2}>Properties</h2>
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={th}>Property</th>
                    <th style={th}>{snap?.class1?.name ?? "Class 1"}</th>
                    <th style={th}>{snap?.class2?.name ?? "Class 2"}</th>
                    <th style={th}>General</th>
                    <th style={th}>None</th>
                  </tr>
                </thead>
                <tbody>
                  {allProps.map((p) => (
                    <tr key={p}>
                      <td style={{ ...td, fontWeight: 600 }}>{p}</td>
                      <td style={td}>{has(snap?.class1?.properties, p)}</td>
                      <td style={td}>{has(snap?.class2?.properties, p)}</td>
                      <td style={td}>{has(snap?.generalClass, p)}</td>
                      <td style={td}>{has(snap?.noneClass, p)}</td>
                    </tr>
                  ))}
                  {!allProps.length && (
                    <tr>
                      <td style={td} colSpan={5}>
                        No properties yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={panel}>
            <h2 style={h2}>Classify</h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                placeholder="Enter properties separated by spaces or commas"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={onClassify}
                disabled={!inputList.length || busy}
                style={btnPrimary}
              >
                Classify
              </button>
            </div>

            {prediction && (
              <div style={card}>
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>Prediction</h3>
                <PredictionView jsonString={prediction} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button onClick={() => sendFeedback("class1")} disabled={busy} style={btnPrimary}>
                    It is {c1Name}
                  </button>
                  <button onClick={() => sendFeedback("class2")} disabled={busy} style={btnPrimary}>
                    It is {c2Name}
                  </button>
                  <button onClick={() => sendFeedback("none")} disabled={busy} style={btnOutline}>
                    None class
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function PredictionView({ jsonString }: { jsonString: string }) {
  try {
    const obj = JSON.parse(jsonString);
    const hasAnything =
      obj.guess || obj.reason || (obj.knownHits?.length ?? 0) || (obj.unknown?.length ?? 0);
    if (!hasAnything) return <pre style={pre}>{jsonString}</pre>;
    return (
      <div>
        <p><b>Guess:</b> {obj.guess || "—"}</p>
        {obj.reason && <p><b>Reason:</b> {obj.reason}</p>}
        {Array.isArray(obj.knownHits) && obj.knownHits.length > 0 && (
          <p><b>Matched properties:</b> {obj.knownHits.join(", ")}</p>
        )}
        {Array.isArray(obj.unknown) && obj.unknown.length > 0 && (
          <p><b>Unknown properties:</b> {obj.unknown.join(", ")}</p>
        )}
        {obj.recommendation && <p style={{ color: "#6b7280" }}>{obj.recommendation}</p>}
      </div>
    );
  } catch {
    return <pre style={pre}>{jsonString}</pre>;
  }
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  width: "100vw",
  overflow: "hidden",
  background: "#0f172a",
  color: "#111827",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
};
const shell: React.CSSProperties = {
  height: "100vh",
  width: "100%",
  display: "flex",
  flexDirection: "column",
};
const header: React.CSSProperties = {
  padding: "14px 20px",
  borderBottom: "1px solid #e5e7eb",
  background: "#ffffff",
};
const main: React.CSSProperties = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  padding: 16,
  overflow: "auto",
};
const panel: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  minHeight: 0,
};
const h2: React.CSSProperties = { margin: "0 0 8px 0", fontSize: 18 };
const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  alignItems: "start",
};
const field: React.CSSProperties = { display: "grid", gap: 6 };
const label: React.CSSProperties = { fontSize: 13, color: "#374151" };
const tableWrap: React.CSSProperties = {
  height: "calc(100% - 36px)",
  overflow: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
};
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse" };
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  position: "sticky",
  top: 0,
  background: "#f9fafb",
  zIndex: 1,
};
const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f3f4f6",
};
const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  width: "100%",
  boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
};
const btnOutline: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #9ca3af",
  background: "#fff",
  color: "#111827",
  cursor: "pointer",
};
const card: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
};
const pre: React.CSSProperties = {
  margin: 0,
  padding: 10,
  background: "#f8fafc",
  borderRadius: 8,
  overflowX: "auto",
};
