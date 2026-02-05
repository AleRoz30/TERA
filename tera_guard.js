/* tera_guard.js
   TERA Guard v1.0 — архитектура не-власти
*/

export const TERA_GUARD = {
  forbiddenNodeFields: [
    "score","rank","weight","priority",
    "recommended","relevance"
  ],
  forbiddenUiWords: [
    "рекомендуем","лучше","важно","следующий",
    "правильный","ключевой",
    "recommended","important","next"
  ],

  checkNode(node){
    for(const k of this.forbiddenNodeFields){
      if(k in node){
        throw new Error(`[TERA-GUARD] Forbidden node field: ${k}`);
      }
    }
  },

  checkNodes(nodes){
    (nodes || []).forEach(n => this.checkNode(n));
  },

  checkUIText(text){
    const low = String(text||"").toLowerCase();
    for(const w of this.forbiddenUiWords){
      if(low.includes(w)){
        throw new Error(`[TERA-GUARD] System voice detected: "${w}"`);
      }
    }
  },

  checkOnboarding(steps){
    (steps || []).forEach(s => this.checkUIText(s?.t));
  }
};
