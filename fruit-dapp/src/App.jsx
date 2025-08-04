import { useEffect, useState } from 'react';
import CurrentRole from './components/CurrentRole.jsx';

const ROLES = {
  FARMER:        'FARMER',
  RETAILER:      'RETAILER',
  INSPECTOR:     'INSPECTOR',
  DEFAULT_ADMIN: 'DEFAULT_ADMIN'
};

function App () {
  /* 基本状态 */
  const [account, setAccount] = useState(null);
  const [roles,   setRoles]   = useState([]);
  const [status,  setStatus]  = useState('');
  const has = (r) => roles.includes(r);
  const [roleLoading, setRoleLoading] = useState(false);


  /* 钱包监听 */
  useEffect(() => {
    if (!window.ethereum) return;
    const h = (a) => setAccount(a[0] ?? null);
    window.ethereum.on('accountsChanged', h);
    return () => window.ethereum.removeListener('accountsChanged', h);
  }, []);


  useEffect(() => {
  if (!account) {
    console.log("⚠️ 未连接账户，清空角色");
    setRoles([]);
    return;
  }

  console.log("🔍 开始获取角色，地址:", account);
  setRoleLoading(true);

  fetch(`http://localhost:8000/read/roles/${account}`)
    .then(r => r.json())
    .then(o => {
      const r = Object.entries(o).filter(([_, v]) => v).map(([k]) => k);
      console.log("✅ 获取到角色列表:", r);
      setRoles(r);
    })
    .catch((err) => {
      console.error("❌ 获取角色失败", err);
      setRoles([]);
    })
    .finally(() => {
      console.log("⏹️ 角色加载结束");
      setRoleLoading(false);
    });
}, [account]);



  const connectWallet = async () => {
    if (!window.ethereum) return alert('请安装 MetaMask');
    const a = await window.ethereum.request({ method:'eth_requestAccounts' });
    setAccount(a[0]);
  };

  /* ---- 共用函数 ---- */
  const sanitize = (raw) => ({
    from:raw.from, to:raw.to, data:raw.data,
    value:raw.value.toString(), gas:raw.gas.toString()
  });
  const postSend = async (url, body) => {
    try {
      setStatus('⏳ 构造交易...');
      const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const raw = await r.json(); if(!r.ok) throw new Error(raw?.message);
      const tx  = sanitize(raw);
      setStatus('🦊 等待签名...');
      const h   = await window.ethereum.request({method:'eth_sendTransaction',params:[tx]});
      setStatus('✅ 交易已发送: '+h);
    } catch(e){ setStatus('❌ '+(e.message||e)); }
  };

  /* ---- 写操作表单状态 ---- */
  const [batchId,setBatchId]   = useState('');  const [metadata,setMetadata]=useState('');
  const [recBid,setRecBid]     = useState('');  const [stage,setStage]      = useState('');
  const [loc,setLoc]           = useState('');  const [ts,setTs]            = useState('');
  const [ownBid,setOwnBid]     = useState('');  const [newOwner,setNewOwner]=useState('');
  const [roleName,setRoleName] = useState('');  const [roleAcc,setRoleAcc]  = useState('');

  /* ---- 写操作调用 ---- */
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

  /* ---- 读操作新表单状态 ---- */
  const [qBid,setQBid]     = useState(''); const [qRes,setQRes]   = useState(null);
  const [sBid,setSBid]     = useState(''); const [sIdx,setSIdx]   = useState('');
  const [sRes,setSRes]     = useState(null);
  const [oBid,setOBid]     = useState(''); const [owner,setOwner] = useState('');

  /* ---- 读操作函数 ---- */
  const queryBatch = async () => {
    try{
      setStatus('🔍 查询批次...');
      const r = await fetch(`http://localhost:8000/read/batch_overview/${qBid}`);
      setQRes(await r.json()); setStatus('✅');
    }catch(e){setStatus('❌ '+(e.message||e));}
  };
  const queryStage = async () => {
    try{
      setStatus('🔍 查询阶段...');
      const r = await fetch(`http://localhost:8000/read/stage/${sBid}/${sIdx}`);
      setSRes(await r.json()); setStatus('✅');
    }catch(e){setStatus('❌ '+(e.message||e));}
  };
  const queryOwner = async () => {
    try{
      setStatus('🔍 查询所有者...');
      const r = await fetch(`http://localhost:8000/read/current_owner/${oBid}`);
      const j = await r.json(); setOwner(j.owner); setStatus('✅');
    }catch(e){setStatus('❌ '+(e.message||e));}
  };

  /* ---- UI ---- */
  return (
    <div style={{padding:20}}>
      <h1>🍇 Fruit Supply Chain DApp</h1>
      <button onClick={connectWallet}>🔗 连接钱包</button>
      <p>👤 {account||'未连接'}</p>
      <CurrentRole roles={roles} loading={roleLoading} />

      <p style={{fontSize:14}}>Roles: {roles.join(', ')||'None'}</p>

      <hr/>

      {has(ROLES.FARMER) && (
        <>
          <h3>📦 注册批次</h3>
          <input placeholder="Batch ID" value={batchId} onChange={e=>setBatchId(e.target.value)}/>
          <input placeholder="Metadata" value={metadata} onChange={e=>setMetadata(e.target.value)}/>
          <button onClick={registerBatch}>提交</button><hr/>
        </>
      )}

      {(has(ROLES.RETAILER)||has(ROLES.INSPECTOR)) && (
        <>
          <h3>📝 记录阶段</h3>
          <input placeholder="Batch ID" value={recBid} onChange={e=>setRecBid(e.target.value)}/>
          <input placeholder="Stage#"  value={stage}  onChange={e=>setStage(e.target.value)}/>
          <input placeholder="Location" value={loc}   onChange={e=>setLoc(e.target.value)}/>
          <input placeholder="Timestamp" value={ts}   onChange={e=>setTs(e.target.value)}/>
          <button onClick={recordStage}>提交</button><hr/>
        </>
      )}

      {has(ROLES.FARMER) && (
        <>
          <h3>🔄 转移所有权</h3>
          <input placeholder="Batch ID" value={ownBid} onChange={e=>setOwnBid(e.target.value)}/>
          <input placeholder="New Owner" value={newOwner} onChange={e=>setNewOwner(e.target.value)}/>
          <button onClick={transferOwner}>提交</button><hr/>
        </>
      )}

      {has(ROLES.DEFAULT_ADMIN) && (
        <>
          <h3>🛡️ 角色管理</h3>
          <input placeholder="Role Name" value={roleName} onChange={e=>setRoleName(e.target.value)}/>
          <input placeholder="Account"   value={roleAcc}  onChange={e=>setRoleAcc(e.target.value)}/>
          <button onClick={grantRole}>Grant</button>
          <button onClick={revokeRole}>Revoke</button><hr/>
        </>
      )}

      <h3>🔍 批次概览</h3>
      <input placeholder="Batch ID" value={qBid} onChange={e=>setQBid(e.target.value)}/>
      <button onClick={queryBatch}>查询</button>
      {qRes && <pre>{JSON.stringify(qRes,null,2)}</pre>}
      <hr/>

      <h3>🔍 查询阶段</h3>
      <input placeholder="Batch ID" value={sBid} onChange={e=>setSBid(e.target.value)}/>
      <input placeholder="Index"   value={sIdx} onChange={e=>setSIdx(e.target.value)}/>
      <button onClick={queryStage}>查询</button>
      {sRes && <pre>{JSON.stringify(sRes,null,2)}</pre>}
      <hr/>

      <h3>👤 当前所有者</h3>
      <input placeholder="Batch ID" value={oBid} onChange={e=>setOBid(e.target.value)}/>
      <button onClick={queryOwner}>查询</button>
      {owner && <p>Owner: {owner}</p>}

      <hr/><p>{status}</p>
    </div>
  );
}

export default App;
