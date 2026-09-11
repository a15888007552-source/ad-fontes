export const RELATION_STYLE={
 '师承':{kind:0,color:'#ffce66',name:'金色传递光束'},
 '影响':{kind:1,color:'#65b5ff',name:'蓝色流动波纹'},
 '对峙':{kind:2,color:'#ff6279',name:'红色相向折线'},
 '知交':{kind:3,color:'#56e7b7',name:'绿色并行双线'},
 '亲缘':{kind:4,color:'#ce90ff',name:'紫色交织双线'}
};
export function relationSwatch(category){
 const kind=RELATION_STYLE[category]?.kind??1;
 const paths=[
  '<path d="M1 8H43"/><path class="rel-mover" d="m5 4 6 4-6 4"/>',
  '<path class="rel-wave" d="M1 8Q5 0 9 8T17 8T25 8T33 8T41 8"/>',
  '<path d="M1 8H8L12 3 17 13 22 3 27 13 32 8H43"/><circle class="rel-confront" cx="22" cy="8" r="2"/>',
  '<path d="M1 4H43M1 12H43"/><circle class="rel-mover" cx="5" cy="4" r="2"/><circle class="rel-return" cx="39" cy="12" r="2"/>',
  '<path d="M1 3C8 3 8 13 15 13S22 3 29 3 36 13 43 13M1 13C8 13 8 3 15 3S22 13 29 13 36 3 43 3"/>'
 ];
 return `<svg class="rel-swatch rel-style-${kind}" viewBox="0 0 44 16" aria-hidden="true">${paths[kind]}</svg>`;
}
