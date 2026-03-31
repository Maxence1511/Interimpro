'use client'
import{useEffect}from 'react'
export default function AuthExchange(){
  useEffect(()=>{window.location.replace('/dashboard'+window.location.hash+window.location.search)},[])
  return<div style={{minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:36,height:36,borderRadius:'50%',border:'3px solid rgba(232,121,249,.15)',borderTop:'3px solid #e879f9',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>
}
