/* Shared speech helpers: text-to-speech, speech recognition, answer checking */
var SP=(function(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition,synth=window.speechSynthesis,cur=null;
  function $(i){return document.getElementById(i)}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function speak(text,rate,pitch,cb){
    if(!synth){if(cb)cb();return}
    synth.cancel();
    var u=new SpeechSynthesisUtterance(text.replace(/Mr\./g,"Mister"));u.lang="en-US";u.rate=rate||1;u.pitch=pitch||1;
    var vs=synth.getVoices(),v=vs.filter(function(x){return /^en[-_]US/i.test(x.lang)})[0]||vs.filter(function(x){return /^en/i.test(x.lang)})[0];
    if(v)u.voice=v;
    var done=false;function fin(){if(!done){done=true;if(cb)cb()}}
    u.onend=fin;u.onerror=function(e){if(e.error!=="interrupted"&&e.error!=="canceled")fin()};
    synth.speak(u);
  }
  /* lowercase, expand a few contractions, drop punctuation and apostrophes */
  function clean(s){
    s=s.toLowerCase().replace(/[’']/g,"'").replace(/\bi'm\b/g,"i am").replace(/\bit's\b/g,"it is").replace(/\bwhat's\b/g,"what is").replace(/\bthat's\b/g,"that is").replace(/\bhow's\b/g,"how is");
    return s.replace(/'/g,"").replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim();
  }
  /* true if any heard alternative matches any pattern */
  function any(pats,alts){
    for(var i=0;i<alts.length;i++){var t=clean(alts[i]);for(var j=0;j<pats.length;j++){if(pats[j].test(t))return true}}
    return false;
  }
  function stop(){if(cur){try{cur.abort()}catch(e){}cur=null}}
  /* listen once: done({alts:[...]}) or done({err:"code"}) */
  function once(done,onstart){
    if(!SR){done({err:"unsupported"});return}
    stop();if(synth)synth.cancel();
    var r=new SR(),got=false;cur=r;r.lang="en-US";r.maxAlternatives=3;r.interimResults=false;
    r.onstart=function(){if(onstart)onstart()};
    r.onresult=function(e){got=true;var a=[];for(var i=0;i<e.results[0].length;i++)a.push(e.results[0][i].transcript);done({alts:a})};
    r.onerror=function(e){if(!got){got=true;done({err:e.error})}};
    r.onend=function(){if(!got){got=true;done({err:"no-speech"})}};
    try{r.start()}catch(e){got=true;done({err:"busy"})}
  }
  /* listen continuously: onText(fullTextSoFar), onEnd(err or null). returns {stop:fn} */
  function many(onText,onEnd){
    if(!SR){onEnd("unsupported");return{stop:function(){}}}
    stop();if(synth)synth.cancel();
    var r=new SR(),fin="",ended=false,err=null;cur=r;
    r.lang="en-US";r.continuous=true;r.interimResults=true;
    r.onresult=function(e){
      var interim="";
      for(var i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal)fin+=e.results[i][0].transcript+" ";else interim+=e.results[i][0].transcript;
      }
      onText((fin+interim).trim());
    };
    r.onerror=function(e){if(e.error!=="no-speech"&&e.error!=="aborted")err=e.error};
    r.onend=function(){if(!ended){ended=true;onEnd(err)}};
    try{r.start()}catch(e){ended=true;onEnd("busy")}
    return{stop:function(){try{r.stop()}catch(e){}}};
  }
  function errMsg(c){
    if(c==="not-allowed"||c==="service-not-allowed")return"The microphone is blocked. Allow microphone access in your browser, then try again.";
    if(c==="no-speech")return"I didn’t hear anything. Speak a little louder and try again.";
    if(c==="network")return"Speech checking needs an internet connection.";
    if(c==="unsupported")return"This browser can’t check speech. Please use Google Chrome or Microsoft Edge.";
    if(c==="aborted"||c==="busy")return"Please tap the microphone button again.";
    return"Something went wrong ("+c+"). Please try again.";
  }
  return{supported:!!SR,speak:speak,clean:clean,any:any,once:once,many:many,stop:stop,errMsg:errMsg,esc:esc,$:$,
    cancelSpeech:function(){if(synth)synth.cancel()}};
})();
if(window.speechSynthesis)window.speechSynthesis.getVoices();
