// Product IDs are the persisted v1.x IDs. Modes are parameters, never new IDs.
const mode=(id,bm,en,editor='creative',extra={})=>Object.freeze({id,bm,en,editor,...extra});
export const LAMP_MODES=Object.freeze([
 mode('drum','Silinder','Cylinder','lamp'),mode('cone','Kon terbuka','Open cone','lamp'),
 mode('vase','Pasu berperut','Bulbous vase','lamp'),mode('hourglass','Jam pasir','Hourglass','lamp'),
 mode('twist','Bintang berpintal','Twisted star','lamp'),mode('square','Petak lembut','Rounded square','lamp'),
 mode('lantern','Tanglung petak bertingkat','Tiered square lantern','lamp')
]);
export const GENERATOR_CATEGORIES=Object.freeze([
 {id:'keychain',bm:'Keychain Studio',en:'Keychain Studio'},
 {id:'identity',bm:'Identiti',en:'Identity'},
 {id:'stationery',bm:'Alat tulis',en:'Stationery'},
 {id:'signage',bm:'Papan tanda',en:'Signage Studio'},
 {id:'qr',bm:'Paparan QR',en:'QR Studio'},
 {id:'lighting',bm:'Lampu & LED',en:'Lighting & LED'}
].map(Object.freeze));
export const GENERATOR_PRODUCTS=Object.freeze([
 {id:'keychain',category:'keychain',bm:'Huruf / nama',en:'Letter / name',modes:[
  mode('classic','Huruf / nama','Letter / name','product'),mode('typography','Huruf boleh disunting','Typography Fusion','product'),
  mode('silhouette','Logo timbul daripada gambar','Silhouette Relief — import logo','image'),
  mode('topographic','Kontur berlapis','Topographic Art — contours'),mode('radial','Bulatan berlapis','Generative Art — radial'),
  mode('voronoi','Corak sel','Generative Art — Voronoi'),mode('key-waves','Corak gelombang','Generative Art — waves'),
  mode('puzzle','Puzzle pasangan','Puzzle Couple'),mode('fidget','Mainan slider','Mechanical Fidget — slider') ]},
 {id:'plate',category:'keychain',bm:'Plat Malaysia',en:'Malaysia plate',modes:[mode('classic','Plat Malaysia','Malaysia plate','product')]},
 {id:'nametag',category:'identity',bm:'Nametag kerajaan',en:'Government nametag',modes:[mode('classic','Nametag kerajaan','Government nametag','product')]},
 {id:'bookmark',category:'stationery',bm:'Penanda buku',en:'Bookmark',modes:[mode('classic','Penanda buku','Bookmark','product'),mode('image-bookmark','Bookmark daripada gambar','Bookmark from image','image')]},
 {id:'qrpay',category:'qr',bm:'QR pembayaran',en:'QR payment',modes:[
  mode('classic','QR asal / stiker','Original QR / sticker','product'),mode('qr-stand','QR dengan tapak','Sculptural QR Stand'),
  mode('qr-relief','QR timbul','Deep Relief QR'),mode('qr-organic','QR bingkai organik','Organic Frame QR'),
  mode('qr-tower','QR tiga muka','Multi-Face QR Tower'),mode('qr-lightbox','Kotak lampu QR','QR Lightbox')]},
 {id:'signage',category:'signage',bm:'Papan tanda',en:'Booth signage',modes:[
  mode('classic','Papan & tapak','Board & stand','product'),mode('signage-logo','Logo / gambar untuk papan','Logo / image for sign','image'),mode('floating','Huruf terapung','Floating 3D Letters'),
  mode('sculptural','Papan meja organik','Sculptural Desk Sign'),mode('topographic-sign','Papan kontur berlapis','Topographic Sign'),
  mode('wave','Papan gelombang','Parametric Wave Sign'),mode('shadowbox','Papan bingkai dalam','Shadowbox Sign')]},
 {id:'led',category:'lighting',bm:'Huruf / logo LED',en:'LED letters / logo',modes:[mode('classic','Huruf / logo berlampu LED','LED Channel — letters / logo','led')]},
 {id:'lamp',category:'lighting',bm:'Lampu 3D',en:'3D lamp',modes:LAMP_MODES}
].map(p=>Object.freeze({...p,modes:Object.freeze(p.modes)})));
export const CREATIVE_MODES=Object.freeze(GENERATOR_PRODUCTS.flatMap(p=>p.modes.filter(m=>m.editor==='creative').map(m=>Object.freeze({...m,product:p.id}))));
export function generatorProduct(id){return GENERATOR_PRODUCTS.find(p=>p.id===id)}
export function generatorMode(product,id){return generatorProduct(product)?.modes.find(m=>m.id===id)}
