import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Database, Table as TableIcon, Plus, RefreshCcw, ChevronRight, 
  LayoutGrid, Key, Link as LinkIcon, Loader2, AlertCircle, 
  DatabaseZap, Trash2, Edit3, X, GitBranch, Terminal as TerminalIcon,
  Columns
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
  // --- SYSTEM STATES ---
  const [databases, setDatabases] = useState([]);
  const [activeDb, setActiveDb] = useState(null);
  const [currentView, setCurrentView] = useState("db-overview");
  const [selectedTable, setSelectedTable] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // --- TERMINAL STATES ---
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [terminalHistory, setTerminalHistory] = useState([
    { type: "system", text: "PesaDB v1.0.0 Shell - Session Established" },
    { type: "system", text: 'Type "HELP" for instructions.' },
  ]);
  const [commandInput, setCommandInput] = useState("");
  const terminalInputRef = useRef(null);

  // --- SCHEMA & DATA STATES ---
  const [tables, setTables] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [joinConfig, setJoinConfig] = useState({ tableA: "", tableB: "", colA: "", colB: "" });

  // --- FORM STATES ---
  const [rowPayload, setRowPayload] = useState({});
  const [newDbName, setNewDbName] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [columnInput, setColumnInput] = useState("");
  const [newColName, setNewColName] = useState(""); 
  const [pkInput, setPkInput] = useState("");
  const [fkInput, setFkInput] = useState("");
  const [editingPk, setEditingPk] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, target: null });

  // --- AUTO-FOCUS TERMINAL ---
  useEffect(() => {
    if (currentView === "terminal" && terminalInputRef.current) terminalInputRef.current.focus();
  }, [currentView, terminalHistory]);

  // --- INITIAL LOAD ---
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

  // --- DATA FETCHERS ---
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

  // --- ENGINE MUTATIONS ---
  const createDatabase = async () => {
    if (!newDbName) return;
    setIsActionLoading(true);
    try {
      await axios.post(`${API_URL}/databases`, { name: newDbName });
      setDatabases([...databases, newDbName]);
      setNewDbName("");
      toast.success("Logical cluster initialized");
    } catch (err) { toast.error("Creation failed"); }
    finally { setIsActionLoading(false); }
  };

  const createTableInDb = async () => {
    if (!newTableName) return;
    setIsActionLoading(true);
    const columnsObj = {};
    columnInput.split(",").forEach(c => (columnsObj[c.trim()] = "str"));
    try {
      await axios.post(`${API_URL}/${activeDb}/tables`, {
        name: newTableName,
        columns: columnsObj,
        primary_key: pkInput || "id",
      });
      setNewTableName(""); setColumnInput(""); setPkInput("");
      toast.success("Entity schema committed");
      fetchTables(activeDb);
    } catch (err) { toast.error("Schema violation"); }
    finally { setIsActionLoading(false); }
  };

  const addAttribute = async () => {
    if (!newColName) return;
    setIsActionLoading(true);
    try {
      await axios.post(`${API_URL}/${activeDb}/${selectedTable}/columns`, { name: newColName });
      toast.success(`Attribute '${newColName}' appended to ${selectedTable}`);
      setNewColName("");
      fetchRows(selectedTable);
    } catch (err) { toast.error("Backend does not support dynamic columns yet"); }
    finally { setIsActionLoading(false); }
  };

  // --- RECORD ACTIONS ---
  const handleInsertRow = async () => {
    try {
      await axios.post(`${API_URL}/${activeDb}/${selectedTable}/rows`, rowPayload);
      setRowPayload({});
      fetchRows(selectedTable);
      toast.success("Record committed");
    } catch (err) { toast.error("Integrity check failed"); }
  };

  const startEdit = (row) => {
    const pkVal = row[pkInput || tableColumns[0]];
    setEditingPk(pkVal);
    setRowPayload(row);
  };

  const handleCommitUpdate = async () => {
    try {
      await axios.put(`${API_URL}/${activeDb}/${selectedTable}/rows/${editingPk}`, rowPayload);
      setEditingPk(null); setRowPayload({});
      fetchRows(selectedTable);
      toast.success("Record updated");
    } catch (err) { toast.error("Disk write failure"); }
  };

  const deleteRow = async (row) => {
    const pkVal = row[pkInput || tableColumns[0]];
    try {
      await axios.delete(`${API_URL}/${activeDb}/${selectedTable}/rows/${pkVal}`);
      fetchRows(selectedTable);
      toast.success("Record purged");
    } catch (err) { toast.error("Purge failed"); }
  };

  // --- GLOBAL DELETION ---
  const triggerDelete = (type, target) => setDeleteConfirm({ show: true, type, target });

  const executeDelete = async () => {
    const { type, target } = deleteConfirm;
    setIsActionLoading(true);
    try {
      if (type === "database") {
        await axios.delete(`${API_URL}/databases/${target}`);
        setDatabases(databases.filter(d => d !== target));
        if (activeDb === target) setActiveDb(null);
      } else {
        await axios.delete(`${API_URL}/${activeDb}/${target}`);
        setTables(tables.filter(t => t !== target));
        setCurrentView("db-overview");
      }
      toast.success("Disk segment cleared");
    } finally { setIsActionLoading(false); setDeleteConfirm({ show: false, type: null, target: null }); }
  };

  // --- TERMINAL & RELATIONAL ---
  const handleShellCommand = async (e) => {
    if (e.key === "ArrowUp") {
        e.preventDefault();
        if (historyStack.length > 0) {
            const nextIndex = historyIndex + 1;
            if (nextIndex < historyStack.length) {
                setHistoryIndex(nextIndex);
                setCommandInput(historyStack[historyStack.length - 1 - nextIndex]);
            }
        }
        return;
    }
    if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = historyIndex - 1;
        if (nextIndex >= 0) {
            setHistoryIndex(nextIndex);
            setCommandInput(historyStack[historyStack.length - 1 - nextIndex]);
        } else {
            setHistoryIndex(-1);
            setCommandInput("");
        }
        return;
    }
    if (e.key !== "Enter" || !commandInput) return;
    const cmd = commandInput.trim();
    const cmdUpper = cmd.toUpperCase();
    setHistoryStack(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    if (cmdUpper === "CLEAR") { setTerminalHistory([]); setCommandInput(""); return; }
    setCommandInput("");
    setTerminalHistory(prev => [...prev, { type: "user", text: `➜ ${cmd}` }]);

    try {
      const res = await axios.post(`${API_URL}/shell`, { command: cmd });
      if (cmdUpper.startsWith("USE ")) {
        const dbName = cmd.split(" ")[1];
        setActiveDb(dbName);
        const tableRes = await axios.get(`${API_URL}/${dbName}/tables`);
        setTables(tableRes.data);
      }
      setTerminalHistory(prev => [...prev, { type: res.data.status, text: res.data.message }]);
    } catch (err) {
      setTerminalHistory(prev => [...prev, { type: "error", text: "Instruction failed: No session or syntax error" }]);
    }
  };

  const executeJoin = async () => {
    const { tableA, tableB, colA, colB } = joinConfig;
    if (!tableA || !tableB || !colA || !colB) { toast.warning("Check join keys"); return; }
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/${activeDb}/join`, { params: { table_a: tableA, table_b: tableB, col_a: colA, col_b: colB } });
      setTableData(res.data.rows); setTableColumns(res.data.columns);
      setSelectedTable(`Relational View`); setCurrentView("table-rows");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Toaster position="top-right" richColors />
      
      <AlertDialog open={deleteConfirm.show} onOpenChange={(v) => !v && setDeleteConfirm({ ...deleteConfirm, show: false })}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-red-500" /> Confirm Purge</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to drop <b>{deleteConfirm.target}</b>? This action is non-recoverable.</AlertDialogDescription>
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
            <p className="text-[10px] uppercase text-slate-500 font-bold mb-3 px-2 tracking-widest">Global Engine</p>
            <button onClick={() => setCurrentView("terminal")} className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-all group ${currentView === "terminal" ? "text-emerald-400 bg-slate-900" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}>
              <TerminalIcon size={14} className={currentView === "terminal" ? "animate-pulse" : "group-hover:text-emerald-400"} /> Terminal Shell
            </button>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold mb-3 px-2 tracking-widest">Active Clusters</p>
            <div className="space-y-1">
              {databases.map(db => (
                <div key={db} className="flex items-center group px-1 rounded-md transition-colors hover:bg-slate-900/50">
                  <Button variant="ghost" className={`flex-1 justify-start h-9 text-xs transition-all ${activeDb === db ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`} onClick={() => fetchTables(db)}>
                    <Database size={14} className="mr-2" /> {db}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" onClick={() => triggerDelete("database", db)}><Trash2 size={12} /></Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2 px-2">
              <Input placeholder="New DB..." value={newDbName} onChange={(e) => setNewDbName(e.target.value)} className="h-8 bg-slate-900 border-slate-800 text-xs text-white" />
              <Button size="icon" className="h-8 w-10 bg-blue-600" onClick={createDatabase} disabled={isActionLoading}><Plus size={14} /></Button>
            </div>
          </div>
          {activeDb && (
            <div className="animate-in slide-in-from-left duration-300 border-t border-slate-900 pt-6 space-y-1">
              <p className="text-[10px] uppercase text-slate-500 font-bold mb-3 px-2 tracking-widest">Logical Session</p>
              <button onClick={() => setCurrentView("db-overview")} className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-all ${currentView === "db-overview" ? "text-blue-400 bg-slate-900" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}><LayoutGrid size={14} /> Schema Overview</button>
              <button onClick={() => setCurrentView("relational-explorer")} className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-all ${currentView === "relational-explorer" ? "text-amber-400 bg-slate-900" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}><GitBranch size={14} /> Relational Explorer</button>
              <div className="pt-4 space-y-1">
                {tables.map(t => (
                  <button key={t} onClick={() => fetchRows(t)} className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-all ${selectedTable === t && currentView === 'table-rows' ? "text-white bg-slate-800 shadow-md" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}><div className="flex items-center gap-3"><TableIcon size={14} /> {t}</div><ChevronRight size={12} className="opacity-0 group-hover:opacity-100" /></button>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 text-slate-600 shadow-sm">
          <Badge variant="outline" className={`font-mono text-[10px] cursor-pointer transition-all uppercase ${activeDb ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-slate-400'}`} onClick={() => { setCurrentView("db-overview"); setSelectedTable(null); }}>
            {activeDb ? `ACTIVE SESSION: ${activeDb}` : "NO SESSION"}
          </Badge>
          <div className="flex items-center gap-2">
            {activeDb && (
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500 transition-colors" onClick={() => triggerDelete(selectedTable ? "table" : "database", selectedTable || activeDb)}><Trash2 size={14} /> Drop Entity</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => (activeDb ? fetchTables(activeDb) : null)}><RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} /></Button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400"><Loader2 className="animate-spin text-blue-500" size={40} /><p className="text-xs font-mono tracking-widest uppercase">Executing Instruction...</p></div>
          ) : !activeDb && currentView !== "terminal" ? (
             <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 transition-all"><DatabaseZap size={64} className="opacity-10" /><p className="font-bold tracking-tight">Open a database cluster to begin</p></div>
          ) : (
            <>
              {currentView === "db-overview" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-xs font-bold uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><LayoutGrid size={16} /> Schema Designer</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Entity Name</label><Input placeholder="e.g. users" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Attributes</label><Input placeholder="id, name, age" value={columnInput} onChange={(e) => setColumnInput(e.target.value)} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1"><Key size={10} className="text-blue-500"/> PK</label><Input placeholder="id" value={pkInput} onChange={(e) => setPkInput(e.target.value)} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1"><LinkIcon size={10} className="text-amber-500"/> FK</label><Input placeholder="col:tbl.col" value={fkInput} onChange={(e) => setFkInput(e.target.value)} /></div>
                    </div>
                    <Button onClick={createTableInDb} className="mt-6 bg-blue-600 hover:bg-blue-700 shadow-lg px-10">Initialize Collection</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tables.map(t => (
                      <Card key={t} onClick={() => fetchRows(t)} className="hover:border-blue-500 cursor-pointer group bg-white relative transition-all shadow-sm">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); triggerDelete("table", t); }}><Trash2 size={14} /></Button>
                        <CardHeader className="flex flex-row items-center gap-4">
                          <div className="bg-slate-50 p-3 rounded-xl group-hover:bg-blue-600 transition-all"><TableIcon className="text-slate-400 group-hover:text-white" size={24} /></div>
                          <CardTitle className="text-lg capitalize font-bold">{t}</CardTitle>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {currentView === "table-rows" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  <div className={`flex justify-between items-end p-6 rounded-xl border shadow-sm transition-all ${editingPk ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
                    <div className="space-y-4">
                       <div>
                          <h1 className="text-2xl font-black tracking-tighter capitalize underline decoration-blue-500 decoration-4">Table: {selectedTable}</h1>
                          <Badge className={editingPk ? "bg-amber-500 text-white" : "bg-green-100 text-green-700 font-mono text-[9px] uppercase"}>{editingPk ? `EDIT_MODE: ${editingPk}` : "INTEGRITY: ACTIVE"}</Badge>
                       </div>
                       
                       {/* Schema Evolution Section */}
                       <div className="flex gap-2 items-center pt-2">
                         <div className="relative">
                            <Columns size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <Input placeholder="New column name..." value={newColName} onChange={(e) => setNewColName(e.target.value)} className="h-9 w-40 pl-8 bg-slate-50/50 text-xs border-dashed" />
                         </div>
                         <Button size="sm" variant="outline" className="h-9 text-[10px] uppercase font-bold" onClick={addAttribute}><Plus size={12} className="mr-1" /> Add Attribute</Button>
                       </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 items-end">
                      {tableColumns.map(col => (
                        <div key={col} className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">{col === pkInput && <Key size={8} className="text-blue-500" />} {col}</span>
                          <Input placeholder={col} className="w-32 bg-white" value={rowPayload[col] || ""} onChange={(e) => setRowPayload({...rowPayload, [col]: e.target.value})} disabled={editingPk && col === pkInput} />
                        </div>
                      ))}
                      <div className="flex gap-1">
                        <Button onClick={editingPk ? handleCommitUpdate : handleInsertRow} className={editingPk ? "bg-amber-600 text-white" : "bg-blue-600 text-white"}>{editingPk ? "Update" : "Insert"}</Button>
                        {editingPk && <Button variant="ghost" size="icon" onClick={() => { setEditingPk(null); setRowPayload({}); }}><X size={16} /></Button>}
                      </div>
                    </div>
                  </div>
                  <Card className="shadow-lg border-slate-200 overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-slate-900">
                        <TableRow>
                          {tableColumns.map(k => <TableHead key={k} className="font-bold text-slate-300 uppercase text-[10px] tracking-widest">{k}</TableHead>)}
                          <TableHead className="text-right text-slate-300 uppercase text-[10px] tracking-widest px-6">Disk Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.length === 0 ? (
                          <TableRow><TableCell colSpan={tableColumns.length + 1} className="h-40 text-center text-slate-400 italic bg-slate-50/50">Null set found in logical block</TableCell></TableRow>
                        ) : (
                          tableData.map((row, i) => (
                            <TableRow key={i} className="hover:bg-blue-50/30 transition-colors">
                              {Object.values(row).map((v, j) => <TableCell key={j} className="text-slate-600 font-medium">{String(v)}</TableCell>)}
                              <TableCell className="text-right space-x-2 px-6">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-blue-500" onClick={() => startEdit(row)}><Edit3 size={14} /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => deleteRow(row)}><Trash2 size={14} /></Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}

              {currentView === "relational-explorer" && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <Card className="p-8 border-blue-200 bg-blue-50/20 shadow-xl shadow-blue-900/5">
                    <h2 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2"><GitBranch size={20} className="text-blue-500" /> Relational Query Builder</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">Table (A)</label><Select onValueChange={(v) => setJoinConfig({...joinConfig, tableA: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Select Table" /></SelectTrigger><SelectContent>{tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">Table (B)</label><Select onValueChange={(v) => setJoinConfig({...joinConfig, tableB: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Select Table" /></SelectTrigger><SelectContent>{tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">Join Key (A)</label><Input placeholder="id" className="bg-white" value={joinConfig.colA} onChange={(e) => setJoinConfig({...joinConfig, colA: e.target.value})} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">Join Key (B)</label><Input placeholder="sid" className="bg-white" value={joinConfig.colB} onChange={(e) => setJoinConfig({...joinConfig, colB: e.target.value})} /></div>
                    </div>
                    <Button onClick={executeJoin} className="mt-8 bg-blue-600 hover:bg-blue-700 px-10 text-white">Generate Relational View</Button>
                  </Card>
                </div>
              )}

              {currentView === "terminal" && (
                <div className="h-[calc(100vh-12rem)] flex flex-col bg-[#020617] rounded-xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in duration-500">
                  <div className="bg-[#0f172a] px-4 py-2 flex items-center justify-between border-b border-slate-800">
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><div className="w-2.5 h-2.5 rounded-full bg-green-500" /></div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">pesadb-bash-v1.0</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 font-mono text-[13px] space-y-1.5 custom-scrollbar selection:bg-blue-500/30 text-slate-300">
                    {terminalHistory.map((line, i) => (
                      <div key={i} className={`whitespace-pre-wrap leading-relaxed ${line.type === "user" ? "text-cyan-400 font-bold" : line.type === "error" ? "text-red-400 font-semibold" : line.type === "success" ? "text-emerald-400 font-medium" : "text-slate-500 italic"}`}>{line.text}</div>
                    ))}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50 mt-4">
                      <span className="text-emerald-500 font-black animate-pulse">➜</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded uppercase text-[10px] tracking-widest border transition-all ${activeDb ? "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" : "text-slate-500 bg-slate-500/10 border-slate-500/20"}`}>{activeDb || "system"}</span>
                      <input ref={terminalInputRef} className="flex-1 bg-transparent border-none outline-none text-slate-100 caret-emerald-500 font-bold font-mono placeholder:text-slate-800" value={commandInput} onChange={(e) => setCommandInput(e.target.value)} onKeyDown={handleShellCommand} placeholder="Type HELP for instructions..." />
                    </div>
                  </div>
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