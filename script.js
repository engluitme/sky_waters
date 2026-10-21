(function(){var sl=document.getElementById('sl'),sd=document.getElementById('sd');if(!sl)return;
var n=sl.children.length,cur=0,t;
for(var i=0;i<n;i++){(function(i){var b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Photo '+(i+1));b.onclick=function(){go(i);restart()};sd.appendChild(b)})(i)}
function mark(){cur=Math.round(sl.scrollLeft/sl.clientWidth)||0;[].forEach.call(sd.children,function(b,i){b.setAttribute('aria-current',i===cur)})}
function go(i){cur=(i+n)%n;sl.scrollTo({left:cur*sl.clientWidth,behavior:'smooth'})}
sl.addEventListener('scroll',function(){clearTimeout(sl._t);sl._t=setTimeout(mark,60);mark()},{passive:true});
document.querySelector('.sb.p').onclick=function(){go(cur-1);restart()};
document.querySelector('.sb.n').onclick=function(){go(cur+1);restart()};
sl.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){go(cur-1);restart()}if(e.key==='ArrowRight'){go(cur+1);restart()}});
var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function stop(){clearInterval(t)}function restart(){stop();if(!rm)t=setInterval(function(){go(cur+1)},5000)}
['pointerdown','touchstart','mouseenter','focusin'].forEach(function(ev){sl.parentNode.addEventListener(ev,stop,{passive:true})});
['mouseleave','focusout'].forEach(function(ev){sl.parentNode.addEventListener(ev,restart)});
sl.addEventListener('touchend',restart,{passive:true});
window.addEventListener('resize',function(){sl.scrollTo({left:cur*sl.clientWidth})});
mark();restart();
})();

(function(){
var form=document.getElementById('contact-form');
if(!form)return;
var status=document.getElementById('contact-status');
form.addEventListener('submit',function(event){
event.preventDefault();
var name=form.elements.name.value.trim();
var phone=form.elements.phone.value.trim();
var email=form.elements.email.value.trim();
var service=form.elements.service.value;
var details=form.elements.message.value.trim();
var message=[
  'Quote request',
  'Name: '+name,
  'Phone / WhatsApp: '+phone,
  'Email: '+(email||'Not provided'),
  'Service: '+service,
  'Project details: '+details
].join('\n');
var whatsappUrl='https://wa.me/263713041100?text='+encodeURIComponent(message);
var whatsappWindow=window.open(whatsappUrl,'_blank');
if(whatsappWindow){
  whatsappWindow.opener=null;
  status.textContent='WhatsApp opened with your request. Send the message there to complete your enquiry.';
}else{
  var link=document.createElement('a');
  link.href=whatsappUrl;
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.textContent='Open WhatsApp to send your request';
  status.replaceChildren(link);
}
});
})();

(function(){
var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
[].forEach.call(document.querySelectorAll('.sl2'),function(sl,k){
var box=sl.parentNode,sd=box.querySelector('.sd2'),n=sl.children.length,cur=0,t;
for(var i=0;i<n;i++){(function(i){var b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Photo '+(i+1));b.onclick=function(){go(i);restart()};sd.appendChild(b)})(i)}
function mark(){cur=Math.round(sl.scrollLeft/sl.clientWidth)||0;[].forEach.call(sd.children,function(b,i){b.setAttribute('aria-current',i===cur)})}
function go(i){cur=(i+n)%n;sl.scrollTo({left:cur*sl.clientWidth,behavior:'smooth'})}
sl.addEventListener('scroll',mark,{passive:true});
box.querySelector('.sb2.p').onclick=function(){go(cur-1);restart()};
box.querySelector('.sb2.n').onclick=function(){go(cur+1);restart()};
sl.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){go(cur-1);restart()}if(e.key==='ArrowRight'){go(cur+1);restart()}});
function stop(){clearInterval(t)}function restart(){stop();if(!rm)t=setInterval(function(){go(cur+1)},6000+k*1500)}
['pointerdown','touchstart','mouseenter','focusin'].forEach(function(ev){box.addEventListener(ev,stop,{passive:true})});
['mouseleave','focusout'].forEach(function(ev){box.addEventListener(ev,restart)});
sl.addEventListener('touchend',restart,{passive:true});
window.addEventListener('resize',function(){sl.scrollTo({left:cur*sl.clientWidth})});
mark();restart();
});
})();