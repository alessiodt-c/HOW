(() => {
  'use strict';
  const config = window.HOW_CONFIG || {};
  const PRICE = config.pricePerPerson || 60;
  const MAX = config.maxParticipants || 30;
  const $ = (id) => document.getElementById(id);
  const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type) => dateParts.find((p) => p.type === type).value;
  const todayISO = `${part('year')}-${part('month')}-${part('day')}`;
  const parseDate = (iso) => new Date(`${iso}T12:00:00`);
  const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const today = parseDate(todayISO);
  const baseMonth = today.getFullYear() * 12 + today.getMonth();
  let shownMonth = baseMonth;
  let selected = '';
  let selectedSession = '';
  const sessions = (Array.isArray(config.sessions) ? config.sessions : []).filter((s) => s && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && /^\d{2}:\d{2}$/.test(s.time) && s.date >= todayISO);
  const scheduledMode = Array.isArray(config.sessions) && config.sessions.length > 0;
  const formatDate = (iso) => parseDate(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const dateSessions = (iso) => sessions.filter((s) => s.date === iso && Number(s.remaining) > 0);
  const validISO = (iso) => typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(parseDate(iso).getTime()) && isoDate(parseDate(iso)) === iso && iso >= todayISO;
  const dateAllowed = (iso) => validISO(iso) && (!scheduledMode || dateSessions(iso).length > 0);
  const capacity = () => scheduledMode && selectedSession ? Math.min(MAX, Number(sessions.find((s) => s.id === selectedSession)?.remaining) || MAX) : MAX;
  function participants() { return Number($('guests').value); }
  function enquiry() {
    const count = participants();
    const session = sessions.find((s) => s.id === selectedSession);
    return `Hi HOW! I'd like to request ${count} ${count === 1 ? 'place' : 'places'} for HOW TO MAKE PASTA at I LATINI, Lecce\n${scheduledMode ? 'Class date' : 'Preferred date'}: ${formatDate(selected)}${session ? ` at ${session.time} (Lecce time)` : ''}\nParticipants: ${count}\nPrice: €${PRICE} per person (€${PRICE * count} total)\nCould you confirm availability${session ? '' : ' and the class time'}?`;
  }
  function updateSummary() {
    const count = participants();
    const cap = capacity();
    const validCount = Number.isInteger(count) && count >= 1 && count <= cap;
    $('guests').max = String(cap);
    $('guests').setAttribute('aria-invalid', String(!validCount));
    $('guest-error').textContent = validCount ? '' : `Choose between 1 and ${cap} participants`;
    $('fewer-guests').disabled = !validCount || count <= 1;
    $('more-guests').disabled = !validCount || count >= cap;
    $('total-price').textContent = validCount ? `€${PRICE * count}` : '—';
    const session = sessions.find((s) => s.id === selectedSession);
    $('selected-date').textContent = selected ? `${formatDate(selected)}${session ? ` · ${session.time}` : ''}` : 'Choose a date';
    $('clear-selection').hidden = !selected;
    const number = String(config.whatsappNumber || '').replace(/[\s+()-]/g, '');
    const connected = /^[1-9]\d{6,14}$/.test(number);
    const enabled = connected && !!selected && validCount && (!scheduledMode || !!selectedSession);
    const link = $('whatsapp-link');
    link.setAttribute('aria-disabled', String(!enabled));
    if (enabled) {
      link.href = `https://wa.me/${number}?text=${encodeURIComponent(enquiry())}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.removeAttribute('tabindex');
    } else {
      link.removeAttribute('href');
      link.setAttribute('tabindex','-1');
    }
    window.dispatchEvent(new CustomEvent('how:booking-change', {detail:{selected,ready:enabled,participants:count,total:PRICE*count}}));
    $('whatsapp-note').textContent = !connected ? 'WhatsApp bookings will be available here soon' : !selected ? 'Choose a date to prepare your WhatsApp request' : !validCount ? 'Check your number of participants' : 'Opens WhatsApp with your request ready to send';
  }
  function updateSessionPicker() {
    const picker = $('session-picker');
    picker.hidden = !scheduledMode || !selected;
    const select = $('session-time');
    select.replaceChildren();
    if (!scheduledMode || !selected) { selectedSession = ''; return; }
    const available = dateSessions(selected).sort((a,b) => a.time.localeCompare(b.time));
    for (const s of available) {
      const option = document.createElement('option');
      option.value = s.id;
      option.textContent = `${s.time} · ${s.remaining} ${s.remaining === 1 ? 'place' : 'places'} available`;
      select.append(option);
    }
    selectedSession = available[0]?.id || '';
    select.value = selectedSession;
    if (participants() > capacity()) $('guests').value = String(capacity());
  }
  function chooseDate(iso) {
    if (!dateAllowed(iso)) throw new Error('Choose a valid future date with availability');
    selected = iso;
    updateSessionPicker();
    renderCalendar();
    updateSummary();
  }
  function renderCalendar(focusISO) {
    const year = Math.floor(shownMonth / 12);
    const month = shownMonth % 12;
    const first = new Date(year, month, 1, 12);
    $('calendar-month').textContent = first.toLocaleDateString('en-GB', { month:'long', year:'numeric' });
    $('previous-month').disabled = shownMonth <= baseMonth;
    $('next-month').disabled = shownMonth >= baseMonth + 11;
    const days = $('calendar-days');
    days.replaceChildren();
    for (let i=0; i<(first.getDay()+6)%7; i++) { const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');days.append(blank); }
    const last = new Date(year,month+1,0).getDate();
    for (let day=1;day<=last;day++) {
      const iso = isoDate(new Date(year,month,day,12));
      const button=document.createElement('button');
      button.type='button'; button.className='day'; button.textContent=String(day); button.dataset.date=iso;
      button.setAttribute('aria-label', `${formatDate(iso)}${scheduledMode && dateSessions(iso).length ? ', class available' : ''}`);
      button.setAttribute('aria-pressed',String(selected===iso));
      if(iso===todayISO){button.classList.add('is-today');button.setAttribute('aria-current','date');}
      if(scheduledMode&&dateSessions(iso).length)button.classList.add('has-session');
      button.disabled=!dateAllowed(iso);
      button.addEventListener('click',()=>{chooseDate(iso);$('calendar-days').querySelector(`[data-date="${iso}"]`)?.focus();});
      days.append(button);
    }
    if(focusISO)days.querySelector(`[data-date="${focusISO}"]`)?.focus();
  }
  $('previous-month').addEventListener('click',()=>{if(shownMonth>baseMonth){shownMonth--;renderCalendar();}});
  $('next-month').addEventListener('click',()=>{if(shownMonth<baseMonth+11){shownMonth++;renderCalendar();}});
  $('fewer-guests').addEventListener('click',()=>{$('guests').value=String(Math.max(1,participants()-1));updateSummary();});
  $('more-guests').addEventListener('click',()=>{$('guests').value=String(Math.min(capacity(),participants()+1));updateSummary();});
  $('guests').addEventListener('input',updateSummary);
  $('session-time').addEventListener('change',()=>{selectedSession=$('session-time').value;if(participants()>capacity())$('guests').value=String(capacity());updateSummary();});
  $('clear-selection').addEventListener('click',()=>{selected='';selectedSession='';updateSessionPicker();renderCalendar();updateSummary();$('next-month').focus();});
  $('whatsapp-link').addEventListener('click',(e)=>{if(e.currentTarget.getAttribute('aria-disabled')==='true')e.preventDefault();});
  if(scheduledMode){$('calendar-mode').textContent='CHOOSE YOUR CLASS DATE';$('calendar-note').textContent='Highlighted dates have scheduled classes — times shown are local to Lecce and places are confirmed on WhatsApp';$('date-label').textContent='Class date';}
  renderCalendar();updateSummary();
  const modelContext = document.modelContext;
  if(modelContext?.registerTool){
    const lifecycle=new AbortController();
    try { Promise.resolve(modelContext.registerTool({
      name:'prepare_pasta_class_request',title:'Prepare a pasta class request',
      description:'Select a preferred class date and number of participants in the visible calendar, without sending a WhatsApp message or confirming a booking',
      inputSchema:{type:'object',properties:{date:{type:'string',description:'Date in YYYY-MM-DD format'},participants:{type:'integer',minimum:1,maximum:MAX}},required:['date','participants'],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(input){
        if(!input||typeof input!=='object'||!dateAllowed(input.date)||!Number.isInteger(input.participants)||input.participants<1||input.participants>MAX)throw new Error('Provide a valid available date and a group size from 1 to 30');
        const requested=parseDate(input.date);const month=requested.getFullYear()*12+requested.getMonth();
        if(month>baseMonth+11)throw new Error('Choose a date within the calendar range');
        const available=dateSessions(input.date).sort((a,b)=>a.time.localeCompare(b.time));
        if(scheduledMode&&input.participants>Math.min(MAX,Number(available[0]?.remaining)||0))throw new Error('The selected class does not have enough available places');
        shownMonth=month;$('guests').value=String(input.participants);chooseDate(input.date);$('calendar').scrollIntoView({behavior:'instant'});
        return {status:'request_prepared_not_sent',date:selected,participants:participants(),totalEUR:PRICE*participants(),bookingConfirmed:false,whatsappReady:$('whatsapp-link').getAttribute('aria-disabled')==='false'};
      }
    },{signal:lifecycle.signal})).catch(()=>{}); }catch{}
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
})();
