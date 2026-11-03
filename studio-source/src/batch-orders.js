export function parseOrders(text){
 text=String(text).replace(/^\uFEFF/,'');if(text.length>1024*1024)throw Error('CSV melebihi 1 MB.');
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<=text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else if(c===undefined)throw Error('Petikan CSV tidak ditutup.');else field+=c;continue}
  if(c==='"'&&field===''){quoted=true;continue}if(c===','||c===';'||c==='\n'||c==='\r'||c===undefined){row.push(field.trim());field='';if(c!==','&&c!==';'){if(row.some(Boolean))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++}}else field+=c;
 }
 if(!rows.length)throw Error('CSV kosong.');const headers=rows[0].map(s=>s.toLowerCase()),nameAt=headers.findIndex(s=>['name','nama','text','teks','number','nombor'].includes(s)),qtyAt=headers.findIndex(s=>['qty','quantity','kuantiti'].includes(s));
 const result=[];for(const row of rows.slice(nameAt>=0?1:0)){const name=row[nameAt>=0?nameAt:0],qty=qtyAt>=0?Number(row[qtyAt]||1):1;if(!name||name.length>80||!Number.isInteger(qty)||qty<1||qty>50)throw Error('Nama atau kuantiti CSV tidak sah.');for(let i=0;i<qty;i++){result.push({name,index:result.length+1});if(result.length>100)throw Error('Maksimum 100 item setiap batch.')}}if(!result.length)throw Error('CSV tiada item.');return result;
}
export function planShelves(items,{width,height,margin=5,gap=3}){
 if(![width,height,margin,gap].every(Number.isFinite)||width<=0||height<=0||margin<0||gap<0)throw Error('Ukuran plate tidak sah.');let x=margin,y=margin,rowHeight=0;const slots=[];
 for(const item of items){if(![item.width,item.height].every(Number.isFinite)||item.width<=0||item.height<=0)throw Error('Saiz item tidak sah.');if(item.width>width-2*margin||item.height>height-2*margin)throw Error('Objek lebih besar daripada plate.');if(x+item.width>width-margin){x=margin;y+=rowHeight+gap;rowHeight=0}if(y+item.height>height-margin)throw Error('Pilihan tidak muat pada satu plate. Kurangkan item.');slots.push({x:x+item.width/2-width/2,y:y+item.height/2-height/2});x+=item.width+gap;rowHeight=Math.max(rowHeight,item.height)}return slots;
}
