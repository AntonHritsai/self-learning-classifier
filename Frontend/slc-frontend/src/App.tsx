import React, { useEffect, useMemo, useRef, useState } from "react";

type Snapshot = {
  class1: { name: string; properties: string[] };
  class2: { name: string; properties: string[] };
  generalClass: string[];
  noneClass: string[];
};
type ClassifyAny = Record<string, any>;

const RESET_ON_RELOAD = false;

async function api(path: string, init?: RequestInit) {
  const h = new Headers(init?.headers || {});
  return fetch(`/api/v1${path}`, { ...init, headers: h });
}

const uniqSorted = (arr: string[]) =>
  Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
const has = (list: string[] | undefined, p: string) =>
  Array.isArray(list) && list.includes(p) ? "✓" : "";
const parseProps = (s: string) =>
  s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

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

  const [addArea, setAddArea] = useState<"class1" | "class2" | "general" | "none">("class1");
  const [addProp, setAddProp] = useState("");

  const [remArea, setRemArea] = useState<"class1" | "class2" | "general" | "none">("class1");
  const [remProp, setRemProp] = useState("");

  const [mvFrom, setMvFrom] = useState<"class1" | "class2" | "general" | "none">("class1");
  const [mvTo, setMvTo] = useState<"class1" | "class2" | "general" | "none">("class2");
  const [mvProp, setMvProp] = useState("");

  const [rpArea, setRpArea] = useState<"class1" | "class2" | "general" | "none" | "all">("class1");
  const [rpFrom, setRpFrom] = useState("");
  const [rpTo, setRpTo] = useState("");

  const [rnClass, setRnClass] = useState<"class1" | "class2">("class1");
  const [rnName, setRnName] = useState("");

  const didPrefillNamesRef = useRef(false);

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
      if (RESET_ON_RELOAD) {
        try { await api(`/reset`, { method: "POST" }); } catch {}
      }
      await load();
      const t = setInterval(load, 4000);
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
      if (!res.ok) throw new Error(`/api/v1/init -> ${res.status}: ${await res.text()}`);
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
      if (!res.ok) throw new Error(`/api/v1/classify -> ${res.status}: ${await res.text()}`);
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
      const res = await api(`/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant, properties: inputList }),
      });
      if (!res.ok) throw new Error(`/api/v1/feedback -> ${res.status}: ${await res.text()}`);
      setPrediction(null);
      setInput("");
      await load();
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    try {
      setBusy(true);
      const res = await api(`/reset`, { method: "POST" });
      if (!res.ok) throw new Error(`/api/v1/reset -> ${res.status}: ${await res.text()}`);
      await load();
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onAddProp() {
    const p = addProp.trim();
    if (!p) return;
    try {
      setBusy(true);
      const res = await api(`/prop/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: addArea, property: p }),
      });
      if (!res.ok) throw new Error(`/api/v1/prop/add -> ${res.status}: ${await res.text()}`);
      setAddProp("");
      await load();
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveProp() {
    const p = remProp.trim();
    if (!p) return;
    try {
      setBusy(true);
      const res = await api(`/prop/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: remArea, property: p }),
      });
      if (!res.ok) throw new Error(`/api/v1/prop/remove -> ${res.status}: ${await res.text()}`);
      setRemProp("");
      await load();
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onMoveProp() {
    const p = mvProp.trim();
    if (!p || mvFrom === mvTo) return;
    try {
      setBusy(true);
      const res = await api(`/prop/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: mvFrom, to: mvTo, property: p }),
      });
      if (!res.ok) throw new Error(`/api/v1/prop/move -> ${res.status}: ${await res.text()}`);
      setMvProp("");
      await load();
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRenameProp() {
    const from = rpFrom.trim();
    const to = rpTo.trim();
    if (!from || !to || from === to) return;
    try {
      setBusy(true);
      const res = await api(`/prop/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: rpArea, from, to }),
      });
      if (!res.ok) throw new Error(`/api/v1/prop/rename -> ${res.status}: ${await res.text()}`);
      setRpFrom("");
      setRpTo("");
      await load();
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRenameClass() {
    const name = rnName.trim();
    if (!name) return;
    try {
      setBusy(true);
      const res = await api(`/classes/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class: rnClass, name }),
      });
      if (!res.ok) throw new Error(`/api/v1/classes/rename -> ${res.status}: ${await res.text()}`);
      setRnName("");
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
    <div className="bg-dark text-light min-vh-100">
      <header className="py-3 mb-4 border-bottom bg-light">
        <div className="container d-flex flex-wrap justify-content-center">
          <a href="/" className="d-flex align-items-center mb-3 mb-lg-0 me-lg-auto text-dark text-decoration-none">
            <span className="fs-4">Self-Learning Classifier</span>
          </a>
        </div>
      </header>

      <div className="container" role="main">
        <div className="row">
          <div className="col-lg-6 mb-4">
            <div className="card">
              <div className="card-body">
                <h2 className="card-title">Init (names + properties)</h2>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Class 1 name</label>
                    <input placeholder="Class 1 name" value={c1} onChange={(e) => setC1(e.target.value)} className="form-control"/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Class 1 properties</label>
                    <input placeholder="comma or space separated" value={c1Props} onChange={(e) => setC1Props(e.target.value)} className="form-control"/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Class 2 name</label>
                    <input placeholder="Class 2 name" value={c2} onChange={(e) => setC2(e.target.value)} className="form-control"/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Class 2 properties</label>
                    <input placeholder="comma or space separated" value={c2Props} onChange={(e) => setC2Props(e.target.value)} className="form-control"/>
                  </div>
                  <div className="col-12">
                    <button type="button" onClick={onInit} disabled={busy || !c1.trim() || !c2.trim()} className="btn btn-primary">
                      Init
                    </button>
                    <button type="button" onClick={onReset} disabled={busy} className="btn btn-outline-secondary ms-2">
                      Reset (user state)
                    </button>
                  </div>
                </div>
                {loading && <p className="mt-3">Loading…</p>}
                {err && <p className="mt-3 text-danger">{err}</p>}
              </div>
            </div>
          </div>

          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="card-title">Properties</h2>
                <div className="table-responsive">
                  <table className="table table-striped table-bordered">
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>{snap?.class1?.name ?? "Class 1"}</th>
                        <th>{snap?.class2?.name ?? "Class 2"}</th>
                        <th>General</th>
                        <th>None</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProps.map((p) => (
                        <tr key={p}>
                          <td>{p}</td>
                          <td>{has(snap?.class1?.properties, p)}</td>
                          <td>{has(snap?.class2?.properties, p)}</td>
                          <td>{has(snap?.generalClass, p)}</td>
                          <td>{has(snap?.noneClass, p)}</td>
                        </tr>
                      ))}
                      {!allProps.length && (
                        <tr>
                          <td colSpan={5} className="text-center">No properties yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 mb-4">
            <div className="card">
              <div className="card-body">
                <h2 className="card-title">Classify</h2>
                <div className="input-group mb-3">
                  <input
                    placeholder="Enter properties separated by spaces or commas"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="form-control"
                  />
                  <button onClick={onClassify} disabled={!inputList.length || busy} className="btn btn-primary">
                    Classify
                  </button>
                </div>

                {prediction && (
                  <div className="card bg-light">
                    <div className="card-body">
                      <h3 className="card-title">Prediction</h3>
                      <PredictionView jsonString={prediction} />
                      <div className="mt-3">
                        <button onClick={() => sendFeedback("class1")} disabled={busy} className="btn btn-primary me-2">
                          It is {c1Name}
                        </button>
                        <button onClick={() => sendFeedback("class2")} disabled={busy} className="btn btn-primary me-2">
                          It is {c2Name}
                        </button>
                        <button onClick={() => sendFeedback("none")} disabled={busy} className="btn btn-outline-secondary">
                          None class
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 mb-4">
            <div className="card">
              <div className="card-body">
                <h2 className="card-title">Manage</h2>
                <div className="vstack gap-3">
                  <div className="row g-2 align-items-center">
                    <div className="col-sm-2"><b>Add property</b></div>
                    <div className="col-sm">
                      <select value={addArea} onChange={(e) => setAddArea(e.target.value as any)} className="form-select">
                        <option value="class1">{snap?.class1?.name || "Class 1"}</option>
                        <option value="class2">{snap?.class2?.name || "Class 2"}</option>
                        <option value="general">General</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div className="col-sm">
                      <input placeholder="property" value={addProp} onChange={(e) => setAddProp(e.target.value)} className="form-control"/>
                    </div>
                    <div className="col-sm-auto">
                      <button onClick={onAddProp} disabled={busy || !addProp.trim()} className="btn btn-primary w-100">Add</button>
                    </div>
                  </div>

                  <div className="row g-2 align-items-center">
                    <div className="col-sm-2"><b>Remove property</b></div>
                    <div className="col-sm">
                      <select value={remArea} onChange={(e) => setRemArea(e.target.value as any)} className="form-select">
                        <option value="class1">{snap?.class1?.name || "Class 1"}</option>
                        <option value="class2">{snap?.class2?.name || "Class 2"}</option>
                        <option value="general">General</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div className="col-sm">
                      <input placeholder="property" value={remProp} onChange={(e) => setRemProp(e.target.value)} className="form-control"/>
                    </div>
                    <div className="col-sm-auto">
                      <button onClick={onRemoveProp} disabled={busy || !remProp.trim()} className="btn btn-primary w-100">Remove</button>
                    </div>
                  </div>

                  <div className="row g-2 align-items-center">
                    <div className="col-sm-2"><b>Move property</b></div>
                    <div className="col-sm">
                      <select value={mvFrom} onChange={(e) => setMvFrom(e.target.value as any)} className="form-select">
                        <option value="class1">{snap?.class1?.name || "Class 1"}</option>
                        <option value="class2">{snap?.class2?.name || "Class 2"}</option>
                        <option value="general">General</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div className="col-auto">→</div>
                    <div className="col-sm">
                      <select value={mvTo} onChange={(e) => setMvTo(e.target.value as any)} className="form-select">
                        <option value="class1">{snap?.class1?.name || "Class 1"}</option>
                        <option value="class2">{snap?.class2?.name || "Class 2"}</option>
                        <option value="general">General</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div className="col-sm">
                      <input placeholder="property" value={mvProp} onChange={(e) => setMvProp(e.target.value)} className="form-control"/>
                    </div>
                    <div className="col-sm-auto">
                      <button onClick={onMoveProp} disabled={busy || !mvProp.trim() || mvFrom === mvTo} className="btn btn-primary w-100">Move</button>
                    </div>
                  </div>

                  <div className="row g-2 align-items-center">
                    <div className="col-sm-2"><b>Rename property</b></div>
                    <div className="col-sm">
                      <select value={rpArea} onChange={(e) => setRpArea(e.target.value as any)} className="form-select">
                        <option value="class1">{snap?.class1?.name || "Class 1"}</option>
                        <option value="class2">{snap?.class2?.name || "Class 2"}</option>
                        <option value="general">General</option>
                        <option value="none">None</option>
                        <option value="all">All zones</option>
                      </select>
                    </div>
                    <div className="col-sm">
                      <input placeholder="from" value={rpFrom} onChange={(e) => setRpFrom(e.target.value)} className="form-control"/>
                    </div>
                     <div className="col-auto">→</div>
                    <div className="col-sm">
                      <input placeholder="to" value={rpTo} onChange={(e) => setRpTo(e.target.value)} className="form-control"/>
                    </div>
                    <div className="col-sm-auto">
                      <button onClick={onRenameProp} disabled={busy || !rpFrom.trim() || !rpTo.trim() || rpFrom.trim() === rpTo.trim()} className="btn btn-primary w-100">Rename</button>
                    </div>
                  </div>

                  <div className="row g-2 align-items-center">
                    <div className="col-sm-2"><b>Rename class</b></div>
                    <div className="col-sm">
                      <select value={rnClass} onChange={(e) => setRnClass(e.target.value as any)} className="form-select">
                        <option value="class1">{snap?.class1?.name || "Class 1"}</option>
                        <option value="class2">{snap?.class2?.name || "Class 2"}</option>
                      </select>
                    </div>
                    <div className="col-sm">
                      <input placeholder="new name" value={rnName} onChange={(e) => setRnName(e.target.value)} className="form-control"/>
                    </div>
                    <div className="col-sm-auto">
                      <button onClick={onRenameClass} disabled={busy || !rnName.trim()} className="btn btn-primary w-100">Rename</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PredictionView({ jsonString }: { jsonString: string }) {
  try {
    const obj = JSON.parse(jsonString);
    const hasAnything =
      obj.guess || obj.reason || (obj.knownHits?.length ?? 0) || (obj.unknown?.length ?? 0);
    if (!hasAnything) return <pre className="bg-light p-2 rounded">{jsonString}</pre>;
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
        {obj.recommendation && <p className="text-muted">{obj.recommendation}</p>}
      </div>
    );
  } catch {
    return <pre className="bg-light p-2 rounded">{jsonString}</pre>;
  }
}
