// TODO: profile form save/load
// assets/js/profile.js
import { supa } from './app.js';

const form = document.querySelector('[data-prof-form]');

async function load() {
  const { data:{ user } } = await supa.auth.getUser();
  if (!user) return;
  const { data: p } = await supa.from('profiles').select('*').eq('id', user.id).single();

  form.full_name.value = p?.full_name||'';
  form.email.value = p?.email||'';
  form.preferred_language.value = p?.preferred_language||'ro';
  form.preferred_bible.value = p?.preferred_bible||'NTR';
  form.preferred_template.value = p?.preferred_template||'lyrics_chords';
}

form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(form);
  const { data:{ user } } = await supa.auth.getUser();
  await supa.from('profiles').update({
    full_name: fd.get('full_name'),
    preferred_language: fd.get('preferred_language'),
    preferred_bible: fd.get('preferred_bible'),
    preferred_template: fd.get('preferred_template')
  }).eq('id', user.id);
  alert('Saved!');
});

load();
