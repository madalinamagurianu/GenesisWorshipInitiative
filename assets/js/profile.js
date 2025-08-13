// assets/js/profile.js
import { supabase } from './supabaseClient.js';
const $ = (s,r=document)=>r.querySelector(s);
const el = { form: $('[data-prof-form]') };

function toast(m){ console.log('[profile]', m); }

async function load() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) { toast(error.message); return; }
  el.form.full_name.value = data.full_name || '';
  el.form.email.value = data.email || user.email || '';
  el.form.preferred_language.value = data.preferred_language || 'ro';
  el.form.preferred_bible.value = data.preferred_bible || '';
  el.form.preferred_template.value = data.preferred_template || 'lyrics_chords';
}

el.form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const fd = new FormData(el.form);
  const payload = {
    full_name: fd.get('full_name')?.toString() || null,
    preferred_language: fd.get('preferred_language')?.toString() || 'ro',
    preferred_bible: fd.get('preferred_bible')?.toString() || null,
    preferred_template: fd.get('preferred_template')?.toString() || 'lyrics_chords',
  };
  const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
  if (error) toast(error.message); else toast('Saved.');
});

load();
