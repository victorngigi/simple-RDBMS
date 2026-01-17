import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Database, FolderPlus, Table as TableIcon, Rows, Plus, 
  RefreshCcw, ChevronRight, LayoutGrid, Key, Link as LinkIcon, 
  Loader2, AlertCircle, DatabaseZap, Inbox, Trash2, Edit3, X, 
  MousePointer2, GitBranch, Terminal as TerminalIcon
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_URL = "http://localhost:8000";

const App = () => {
  const [databases, setDatabases] = useState([]);
  const [activeDb, setActiveDb] = useState(null);
  const [currentView, setCurrentView] = useState("db-overview"); 
  const [selectedTable, setSelectedTable] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Schema & Data States
  const [tables, setTables] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);

  // Form States
  const [rowPayload, setRowPayload] = useState({});
  const [newDbName, setNewDbName] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [columnInput, setColumnInput] = useState("");
  const [pkInput, setPkInput] = useState("");
  const [fkInput, setFkInput] = useState("");
  const [editingPk, setEditingPk] = useState(null);
  
  // Relational/Terminal State
  const [joinConfig, setJoinConfig] = useState({ tableA: "", tableB: "", colA: "", colB: "" });
  const [terminalHistory, setTerminalHistory] = useState([
    { type: "system", text: "PesaDB v1.0.0 Shell - Session Established" },
    { type: "system", text: 'Type "USE <db_name>" or "SELECT FROM <table_name>" to query.' },
  ]);
  const [commandInput, setCommandInput] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, target: null });

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_URL}/databases`);
        setDatabases(res.data);
      } catch (err) { toast.error("Connection failed"); }
      finally { setIsLoading(false); }
    };
    init();
  }, []);

  // --- ACTIONS ---
  const triggerDelete = (type, target) => setDeleteConfirm({ show: true, type, target });

  const handleShellCommand = async (e) => {
    if (e.key !== "Enter" || !commandInput) return;
    const cmd = commandInput.trim();

    if (cmd.toUpperCase() === "CLEAR") {
      setTerminalHistory([]);
      setCommandInput("");
      return;
    }
    setCommandInput("");
    setTerminalHistory(prev => [...prev, { type: "user", text: `➜ ${cmd}` }]);
    try {
      const res = await axios.post(`${API_URL}/shell`, { command: cmd });
      setTerminalHistory(prev => [...prev, { type: res.data.status, text: res.data.message }]);
      if (cmd.toUpperCase().includes("USE") || cmd.toUpperCase().includes("CREATE")) {
         const resDbs = await axios.get(`${API_URL}/databases`);
         setDatabases(resDbs.data);
      }
    } catch (err) { setTerminalHistory(prev => [...prev, { type: "error", text: "Engine execution error" }]); }
  };

  const executeJoin = async () => {
    const { tableA, tableB, colA, colB } = joinConfig;
    if (!tableA || !tableB || !colA || !colB) {
      toast.warning("Missing join parameters");
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/${activeDb}/join`, {
        params: { table_a: tableA, table_b: tableB, col_a: colA, col_b: colB },
      });
      setTableData(res.data.rows);
      setTableColumns(res.data.columns);
      setSelectedTable(`View: ${tableA} + ${tableB}`);
      setCurrentView("table-rows");
      toast.success("Relational view created");
    } catch (err) { toast.error("Relational error"); }
    finally { setIsLoading(false); }
  };

  const fetchTables = async (dbName) => {
    setActiveDb(dbName);
    setSelectedTable(null);
    setCurrentView("db-overview");
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/${dbName}/tables`);
      setTables(res.data);
    } catch (err) { setTables([]); }
    finally { setIsLoading(false); }
  };

  const fetchRows = async (tableName) => {
    setSelectedTable(tableName);
    setCurrentView("table-rows");
    setEditingPk(null);
    setRowPayload({});
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/${activeDb}/${tableName}/rows`);
      setTableData(res.data.rows);
      setTableColumns(res.data.columns);
    } catch (err) { setTableData([]); setTableColumns([]); }
    finally { setIsLoading(false); }
  };

  const handleInsertRow = async () => {
    if (!activeDb || !selectedTable || Object.keys(rowPayload).length === 0) return;
    setIsActionLoading(true);
    try {
      await axios.post(`${API_URL}/${activeDb}/${selectedTable}/rows`, rowPayload);
      setRowPayload({});
      toast.success("Record committed");
      fetchRows(selectedTable);
    } catch (err) { toast.error("Constraint Violation"); }
    finally { setIsActionLoading(false); }
  };

  const createDatabase = async () => {
    if (!newDbName) return;
    setIsActionLoading(true);
    try {
      await axios.post(`${API_URL}/databases`, { name: newDbName });
      setDatabases([...databases, newDbName]);
      setNewDbName("");
      toast.success("DB Created");
    } catch (err) { toast.error("Failed"); }
    finally { setIsActionLoading(false); }
  };

  const createTableInDb = async () => {
    setIsActionLoading(true);
    const columnsObj = {};
    columnInput.split(",").forEach(c => columnsObj[c.trim()] = "str");
    try {
      await axios.post(`${API_URL}/${activeDb}/tables`, {
        name: newTableName, columns: columnsObj, primary_key: pkInput || "id"
      });
      setNewTableName(""); setColumnInput(""); setPkInput("");
      toast.success("Table Ready");
      fetchTables(activeDb);
    } catch (err) { toast.error("Schema Fail"); }
    finally { setIsActionLoading(false); }
  };

  const executeDelete = async () => {
    const { type, target } = deleteConfirm;
    setIsActionLoading(true);
    try {
      if (type === "database") {
        await axios.delete(`${API_URL}/databases/${target}`);
        setDatabases(databases.filter(d => d !== target));
        if (activeDb === target) setActiveDb(null);
        toast.success("Database dropped");
      } else {
        await axios.delete(`${API_URL}/${activeDb}/${target}`);
        setTables(tables.filter(t => t !== target));
        setCurrentView("db-overview");
        toast.success("Table dropped");
      }
    } finally { setIsActionLoading(false); setDeleteConfirm({ show: false, type: null, target: null }); }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Toaster position="top-right" richColors />

      {/* Confirmation Modal */}
      <AlertDialog open={deleteConfirm.show} onOpenChange={(v) => !v && setDeleteConfirm({...deleteConfirm, show: false})}>
        <AlertDialogContent className="bg-white border-slate-200 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-red-500" size={20}/> Confirm destruction</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to drop <b>{deleteConfirm.target}</b>? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 text-white hover:bg-red-700">Drop Entity</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- SIDEBAR --- */}
      <aside className="w-80 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 text-white">
          <DatabaseZap className="text-blue-500 animate-pulse" size={24} />
          <span className="font-bold text-xl tracking-tighter uppercase">PesaDB Console</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-8">
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold mb-3 px-2 tracking-widest">Database Manager</p>
            <div className="flex gap-2 px-2 mb-6">
              <Input placeholder="New DB..." value={newDbName} onChange={(e) => setNewDbName(e.target.value)} className="h-8 bg-slate-900 border-slate-800 text-xs text-white" />
              <Button size="icon" className="h-8 w-10 bg-blue-600" onClick={createDatabase} disabled={isActionLoading}><Plus size={14} /></Button>
            </div>

            <p className="text-[10px] uppercase text-slate-500 font-bold mb-3 px-2 tracking-widest">Active Databases</p>
            <div className="space-y-1">
              {databases.map(db => (
                <div key={db} className="flex items-center group px-1">
                  <Button variant="ghost" className={`flex-1 justify-start h-9 text-xs transition-all ${activeDb === db ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900"}`} onClick={() => fetchTables(db)}>
                    <Database size={14} className="mr-2" /> {db}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={() => triggerDelete("database", db)}><Trash2 size={12} /></Button>
                </div>
              ))}
            </div>
          </div>

          {activeDb && (
            <div className="animate-in slide-in-from-left duration-300 border-t border-slate-900 pt-6 space-y-1">
              <p className="text-[10px] uppercase text-slate-500 font-bold mb-3 px-2 tracking-widest">Workspace Views</p>
              <button onClick={() => setCurrentView("db-overview")} className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm ${currentView === 'db-overview' ? 'text-blue-400 bg-slate-900 shadow-inner' : 'text-slate-500 hover:bg-slate-900'}`}>
                <LayoutGrid size={14} /> Schema Overview
              </button>
              <button onClick={() => setCurrentView("relational-explorer")} className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm ${currentView === 'relational-explorer' ? 'text-amber-400 bg-slate-900' : 'text-slate-500 hover:bg-slate-900'}`}>
                <GitBranch size={14} /> Relational Explorer
              </button>
              <button onClick={() => setCurrentView("terminal")} className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm ${currentView === 'terminal' ? 'text-emerald-400 bg-slate-900' : 'text-slate-500 hover:bg-slate-900'}`}>
                <TerminalIcon size={14} /> Terminal Shell
              </button>
              
              <div className="pt-4 px-2">
                <p className="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest">Logical Entities</p>
                {tables.map(t => (
                  <button key={t} onClick={() => fetchRows(t)} className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-all ${selectedTable === t && currentView === 'table-rows' ? "text-white bg-slate-900" : "text-slate-500 hover:bg-slate-900"}`}>
                    <div className="flex items-center gap-3"><TableIcon size={14} /> {t}</div>
                    <ChevronRight size={12} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 text-slate-600 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 uppercase font-mono text-[10px]">{activeDb ? `ACTIVE: ${activeDb}` : "NO SESSION"}</Badge>
            {selectedTable && <><ChevronRight size={14} /><span className="text-slate-900 font-bold uppercase tracking-tight">Table: {selectedTable}</span></>}
          </div>
          <Button variant="outline" size="sm" onClick={() => (activeDb ? fetchTables(activeDb) : null)} className="gap-2">
            <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} /> Sync
          </Button>
        </header>

        <section className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
               <Loader2 className="animate-spin text-blue-500" size={40} />
               <p className="text-xs font-mono tracking-widest uppercase">Executing Instruction...</p>
            </div>
          ) : !activeDb ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
               <DatabaseZap size={64} className="opacity-10" />
               <p className="font-bold tracking-tight">Open a database to establish a logical session</p>
            </div>
          ) : (
            <>
              {currentView === "db-overview" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-xs font-bold uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><LayoutGrid size={16} /> Schema Designer</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Entity Name</label><Input placeholder="e.g. students" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Attributes</label><Input placeholder="id, name, age" value={columnInput} onChange={(e) => setColumnInput(e.target.value)} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1"><Key size={10} className="text-blue-500"/> Primary Key</label><Input placeholder="e.g. id" value={pkInput} onChange={(e) => setPkInput(e.target.value)} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1"><LinkIcon size={10} className="text-amber-500"/> Foreign Key</label><Input placeholder="col:table.col" value={fkInput} onChange={(e) => setFkInput(e.target.value)} /></div>
                    </div>
                    <Button onClick={createTableInDb} className="mt-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/10">Initialize Collection</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tables.map(t => (
                      <Card key={t} onClick={() => fetchRows(t)} className="hover:border-blue-500 cursor-pointer transition-all shadow-sm group bg-white relative">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); triggerDelete("table", t); }}><Trash2 size={14} /></Button>
                        <CardHeader className="flex flex-row items-center gap-4">
                          <div className="bg-slate-50 p-3 rounded-xl group-hover:bg-blue-600 transition-colors"><TableIcon className="text-slate-400 group-hover:text-white" size={24} /></div>
                          <CardTitle className="text-lg capitalize font-bold">{t}</CardTitle>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {currentView === "relational-explorer" && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <Card className="p-8 border-blue-200 bg-blue-50/20 shadow-xl shadow-blue-900/5">
                    <h2 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2"><GitBranch size={20} className="text-blue-500" /> Relational Query Builder</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">Table (A)</label><Select onValueChange={(v) => setJoinConfig({...joinConfig, tableA: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Select Table" /></SelectTrigger><SelectContent>{tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">Table (B)</label><Select onValueChange={(v) => setJoinConfig({...joinConfig, tableB: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Select Table" /></SelectTrigger><SelectContent>{tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">Key Column (A)</label><Input placeholder="e.g. id" className="bg-white" value={joinConfig.colA} onChange={(e) => setJoinConfig({...joinConfig, colA: e.target.value})} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">Key Column (B)</label><Input placeholder="e.g. sid" className="bg-white" value={joinConfig.colB} onChange={(e) => setJoinConfig({...joinConfig, colB: e.target.value})} /></div>
                    </div>
                    <Button onClick={executeJoin} className="mt-8 bg-blue-600 hover:bg-blue-700 px-10">Run Inner Join</Button>
                  </Card>
                </div>
              )}

              {currentView === "terminal" && (
                <div className="h-[calc(100vh-12rem)] flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in duration-500">
                  <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
                     <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/50" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" /><div className="w-2.5 h-2.5 rounded-full bg-green-500/50" /></div>
                     <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">pesadb-bash-v1.0</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-1.5 custom-scrollbar bg-slate-950/50">
                    {terminalHistory.map((line, i) => (
                      <div key={i} className={`whitespace-pre-wrap leading-relaxed${line.type === 'user' ? 'text-blue-400' : line.type === 'error' ? 'text-red-400' : line.type === 'success' ? 'text-emerald-400' : 'text-slate-500 italic'}`}>
                        {line.text}
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">➜</span>
                      <span className="text-blue-400 font-bold">{activeDb || "root"}</span>
                      <input autoFocus className="flex-1 bg-transparent border-none outline-none text-slate-100 caret-blue-500 font-mono" value={commandInput} onChange={(e) => setCommandInput(e.target.value)} onKeyDown={handleShellCommand} />
                    </div>
                  </div>
                </div>
              )}

              {currentView === "table-rows" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-end">
                    <div className="space-y-1">
                       <h1 className="text-2xl font-black tracking-tighter capitalize underline decoration-blue-500 decoration-4">Table: {selectedTable}</h1>
                       <Badge className="bg-green-100 text-green-700 font-mono text-[9px] uppercase">Integrity Active</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 items-end">
                      {tableColumns.map(col => (
                        <div key={col} className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">{col === pkInput && <Key size={8} className="text-blue-500" />} {col}</span>
                          <Input placeholder={col} className="w-32 bg-slate-50" value={rowPayload[col] || ""} onChange={(e) => setRowPayload({...rowPayload, [col]: e.target.value})} />
                        </div>
                      ))}
                      <Button onClick={handleInsertRow} className="bg-blue-600 hover:bg-blue-700">Commit Record</Button>
                    </div>
                  </div>
                  <Card className="shadow-lg border-slate-200 overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-slate-900">
                        <TableRow>
                          {tableColumns.map(k => <TableHead key={k} className="font-bold text-slate-300 uppercase text-[10px] tracking-widest">{k}</TableHead>)}
                          <TableHead className="text-right text-slate-300 uppercase text-[10px] tracking-widest">Disk Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.length === 0 ? (
                          <TableRow><TableCell colSpan={tableColumns.length + 1} className="h-40 text-center text-slate-400 italic bg-slate-50/50">Null set found in logical block</TableCell></TableRow>
                        ) : (
                          tableData.map((row, i) => (
                            <TableRow key={i} className="hover:bg-blue-50/30">
                              {Object.values(row).map((v, j) => <TableCell key={j} className="text-slate-600 font-medium">{String(v)}</TableCell>)}
                              <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => deleteRow(row)}><Trash2 size={14} /></Button></TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;