import {buildStellarData} from './stellar-volumes.js?v=20260911-epochs2';
self.onmessage=({data:{id,key}})=>{
 try{
  const volume=buildStellarData(key);
  const transfers=[volume.dustData.buffer,volume.fogData.buffer,volume.lineData.buffer,volume.candidates.buffer];
  for(const path of volume.paths)transfers.push(path.positions.buffer,path.colors.buffer);
  self.postMessage({id,volume},transfers);
 }catch(error){self.postMessage({id,error:String(error.message||error)});}
};
