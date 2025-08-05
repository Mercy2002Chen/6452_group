import { useEffect, useState } from 'react';
import CurrentRole from './components/CurrentRole.jsx';

const ROLES = {
  FARMER:        'FARMER',
  RETAILER:      'RETAILER',
  INSPECTOR:     'INSPECTOR',
  DEFAULT_ADMIN: 'DEFAULT_ADMIN'
};

function App () {
  /* Basic state */
  const [account, setAccount] = useState(null);
  const [roles,   setRoles]   = useState([]);
  const [status,  setStatus]  = useState('');
  const has = (r) => roles.includes(r);
  const [roleLoading, setRoleLoading] = useState(false);

  /* Wallet listener */
  useEffect(() => {
    if (!window.ethereum) return;
    const h = (a) => setAccount(a[0] ?? null);
    window.ethereum.on('accountsChanged', h);
    return () => window.ethereum.removeListener('accountsChanged', h);
  }, []);

  useEffect(() => {
    if (!account) {
      console.log("⚠️ No account connected, clearing roles");
      setRoles([]);
      return;
    }

    console.log("🔍 Fetching roles for address:", account);
    setRoleLoading(true);

    fetch(`http://localhost:8000/read/roles/${account}`)
      .then(r => r.json())
      .then(o => {
        const r = Object.entries(o).filter(([_, v]) => v).map(([k]) => k);
        console.log("✅ Roles fetched:", r);
        setRoles(r);
      })
      .catch((err) => {
        console.error("❌ Failed to fetch roles", err);
        setRoles([]);
      })
      .finally(() => {
        console.log("⏹️ Role loading finished");
        setRoleLoading(false);
      });
  }, [account]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert('Please install MetaMask');
    const a = await window.ethereum.request({ method:'eth_requestAccounts' });
    setAccount(a[0]);
  };

  /* ---- Utility functions ---- */
  const sanitize = (raw) => ({
    from:raw.from, to:raw.to, data:raw.data,
    value:raw.value.toString(), gas:raw.gas.toString()
  });
  const postSend = async (url, body) => {
    try {
      setStatus('⏳ Building transaction...');
      const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const raw = await r.json(); if(!r.ok) throw new Error(raw?.message);
      const tx  = sanitize(raw);
      setStatus('🦊 Awaiting signature...');
      const h   = await window.ethereum.request({method:'eth_sendTransaction',params:[tx]});
      setStatus('✅ Transaction sent: '+h);
    } catch(e){ setStatus('❌ '+(e.message||e)); }
  };

  /* ---- Form states for write operations ---- */
  const [batchId,setBatchId]   = useState('');  const [metadata,setMetadata]=useState('');
  const [recBid,setRecBid]     = useState('');  const [stage,setStage]      = useState('');
  const [loc,setLoc]           = useState('');  const [ts,setTs]            = useState('');
  const [ownBid,setOwnBid]     = useState('');  const [newOwner,setNewOwner]=useState('');
  const [roleName,setRoleName] = useState('');  const [roleAcc,setRoleAcc]  = useState('');

  /* ---- Write operation calls ---- */
  const registerBatch = () => postSend('http://localhost:8000/tx/register_batch',
      {from_address:account,batch_id:+batchId,metadata});
  const recordStage   = () => postSend('http://localhost:8000/tx/record_stage',
      {from_address:account,batch_id:+recBid,stage:+stage,location:loc,timestamp:+ts});
  const transferOwner = () => postSend('http://localhost:8000/tx/transfer_ownership',
      {from_address:account,batch_id:+ownBid,new_owner:newOwner});
  const grantRole  = () => postSend('http://localhost:8000/tx/grant_role',
     {from_address: account, role: roleName, target_address: roleAcc});
  const revokeRole = () => postSend('http://localhost:8000/tx/revoke_role',
     {from_address: account, role: roleName, target_address: roleAcc});

  /* ---- Form states for read operations ---- */
  const [qBid,setQBid]     = useState(''); const [qRes,setQRes]   = useState(null);
  const [sBid,setSBid]     = useState(''); const [sIdx,setSIdx]   = useState('');
  const [sRes,setSRes]     = useState(null);
  const [oBid,setOBid]     = useState(''); const [owner,setOwner] = useState('');

  /* ---- Read operation functions ---- */
  const queryBatch = async () => {
    try{
      setStatus('🔍 Querying batch...');
      const r = await fetch(`http://localhost:8000/read/batch_overview/${qBid}`);
      setQRes(await r.json()); setStatus('✅');
    }catch(e){setStatus('❌ '+(e.message||e));}
  };
  const queryStage = async () => {
    try{
      setStatus('🔍 Querying stage...');
      const r = await fetch(`http://localhost:8000/read/stage/${sBid}/${sIdx}`);
      setSRes(await r.json()); setStatus('✅');
    }catch(e){setStatus('❌ '+(e.message||e));}
  };
  const queryOwner = async () => {
    try{
      setStatus('🔍 Querying owner...');
      const r = await fetch(`http://localhost:8000/read/current_owner/${oBid}`);
      const j = await r.json(); setOwner(j.owner); setStatus('✅');
    }catch(e){setStatus('❌ '+(e.message||e));}
  };

  /* ---- UI ---- */
  return (
    <div style={{padding:20}}>
      <h1>🍇 Fruit Supply Chain DApp</h1>
      <button onClick={connectWallet}>🔗 Connect Wallet</button>
      <p>👤 {account || 'Not connected'}</p>
      <CurrentRole roles={roles} loading={roleLoading} />


      <hr/>

      {has(ROLES.FARMER) && (
        <>
          <h3>📦 Register Batch</h3>
          <input placeholder="Batch ID" value={batchId} onChange={e=>setBatchId(e.target.value)}/>
          <input placeholder="Metadata" value={metadata} onChange={e=>setMetadata(e.target.value)}/>
          <button onClick={registerBatch}>Submit</button><hr/>
        </>
      )}

      {(has(ROLES.RETAILER)||has(ROLES.INSPECTOR)) && (
        <>
          <h3>📝 Record Stage</h3>
          <input placeholder="Batch ID" value={recBid} onChange={e=>setRecBid(e.target.value)}/>
          <input placeholder="Stage#"  value={stage}  onChange={e=>setStage(e.target.value)}/>
          <input placeholder="Location" value={loc}   onChange={e=>setLoc(e.target.value)}/>
          <input placeholder="Timestamp" value={ts}   onChange={e=>setTs(e.target.value)}/>
          <button onClick={recordStage}>Submit</button><hr/>
        </>
      )}

      {has(ROLES.FARMER) && (
        <>
          <h3>🔄 Transfer Ownership</h3>
          <input placeholder="Batch ID" value={ownBid} onChange={e=>setOwnBid(e.target.value)}/>
          <input placeholder="New Owner" value={newOwner} onChange={e=>setNewOwner(e.target.value)}/>
          <button onClick={transferOwner}>Submit</button><hr/>
        </>
      )}

      {has(ROLES.DEFAULT_ADMIN) && (
        <>
          <h3>🛡️ Role Management</h3>
          <input placeholder="Role Name" value={roleName} onChange={e=>setRoleName(e.target.value)}/>
          <input placeholder="Account"   value={roleAcc}  onChange={e=>setRoleAcc(e.target.value)}/>
          <button onClick={grantRole}>Grant</button>
          <button onClick={revokeRole}>Revoke</button><hr/>
        </>
      )}

      <h3>🔍 Batch Overview</h3>
      <input placeholder="Batch ID" value={qBid} onChange={e=>setQBid(e.target.value)}/>
      <button onClick={queryBatch}>Query</button>
      {qRes && <pre>{JSON.stringify(qRes,null,2)}</pre>}
      <hr/>

      <h3>🔍 Query Stage</h3>
      <input placeholder="Batch ID" value={sBid} onChange={e=>setSBid(e.target.value)}/>
      <input placeholder="Index"   value={sIdx} onChange={e=>setSIdx(e.target.value)}/>
      <button onClick={queryStage}>Query</button>
      {sRes && <pre>{JSON.stringify(sRes,null,2)}</pre>}
      <hr/>

      <h3>👤 Current Owner</h3>
      <input placeholder="Batch ID" value={oBid} onChange={e=>setOBid(e.target.value)}/>
      <button onClick={queryOwner}>Query</button>
      {owner && <p>Owner: {owner}</p>}

      <hr/><p>{status}</p>
    </div>
  );
}

export default App;
