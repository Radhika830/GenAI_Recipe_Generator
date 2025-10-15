// ---------- ELEMENTS ----------
const generateBtn = document.getElementById('generateBtn');
const surpriseBtn = document.getElementById('surpriseBtn');
const ingredientsEl = document.getElementById('ingredients');
const dietEl = document.getElementById('diet');
const timeEl = document.getElementById('time');
const timeValueEl = document.getElementById('time-value');
const servingsEl = document.getElementById('servings');
const styleEl = document.getElementById('style');

const recipeOutput = document.getElementById('recipe-output');
const recipeTitle = document.getElementById('recipe-title');
const recipeBody = document.getElementById('recipe-body');
const recipeImage = document.getElementById('recipe-image');
const recipeTime = document.getElementById('recipe-time');
const recipeServings = document.getElementById('recipe-servings');

const saveBtn = document.getElementById('saveBtn');
const printBtn = document.getElementById('printBtn');
const regenerateBtn = document.getElementById('regenerateBtn');

let lastGenerated = null; // store the last generated recipe

// ---------- RANGE INPUT ----------
timeEl.addEventListener('input', () => timeValueEl.textContent = timeEl.value);

// ---------- EXAMPLE CHIPS ----------
document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    ingredientsEl.value = btn.textContent;
  });
});

// ---------- SURPRISE BUTTON ----------
surpriseBtn.addEventListener('click', () => {
  const examples = [
    'tomato, basil, mozzarella',
    'rice, chicken, soy sauce',
    'potato, spinach, cheese',
    'canned chickpeas, curry powder, tomato'
  ];
  const pick = examples[Math.floor(Math.random()*examples.length)];
  ingredientsEl.value = pick;
  dietEl.value = ['none','vegetarian','vegan','gluten-free'][Math.floor(Math.random()*4)];
  timeEl.value = [15,20,25,30,45][Math.floor(Math.random()*5)];
  timeValueEl.textContent = timeEl.value;
  generateRecipe(); // auto-generate for surprise
});

// ---------- GENERATE BUTTON ----------
generateBtn.addEventListener('click', generateRecipe);

async function generateRecipe(){
  const ingredients = ingredientsEl.value.trim();
  if(!ingredients){
    window.alert('Please enter ingredients first (e.g., onion, tomato, pasta).');
    return;
  }

  setLoading(true);

  const payload = {
    ingredients: ingredients.split(',').map(s=>s.trim()).filter(Boolean),
    dietary: dietEl.value,
    max_time: Number(timeEl.value),
    servings: Number(servingsEl.value),
    style: styleEl.value
  };

  try {
    // Call backend /api/generate
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error('API offline or returned error');
    const data = await resp.json();
    renderRecipe(data);

  } catch (err) {
    console.warn('API generation failed — using local fallback. Error:', err.message);
    // fallback recipe
    const title = buildTitle(payload);
    const steps = [
      `Prep the ${payload.ingredients.slice(0,3).join(', ')}: wash, chop, and measure.`,
      `Heat a pan. Add oil and sauté aromatics until fragrant.`,
      `Add main ingredients and cook for ${Math.max(5, Math.round(payload.max_time/3))} mins.`,
      `Season to taste. Simmer until fully cooked.`,
      `Serve for ${payload.servings} and garnish with fresh herbs. Enjoy!`
    ];
    const data = {
      title,
      ingredients: payload.ingredients,
      steps,
      time: payload.max_time,
      servings: payload.servings,
      image: chooseImageForStyle(payload.style),
      notes: 'This is a local fallback. Connect your backend for AI-generated recipes.'
    };
    setTimeout(()=>{ renderRecipe(data); }, 700);
  } finally {
    setLoading(false);
  }
}

// ---------- LOADING STATE ----------
function setLoading(isLoading){
  if(isLoading){
    generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
    generateBtn.disabled = true;
    surpriseBtn.disabled = true;
    recipeBody.innerHTML = `<div class="placeholder"><i class="fa-solid fa-hourglass-half"></i><p>Preparing your recipe…</p></div>`;
  } else {
    generateBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Generate Recipe';
    generateBtn.disabled = false;
    surpriseBtn.disabled = false;
  }
}

// ---------- RENDER RECIPE ----------
function renderRecipe(data){
  lastGenerated = data;

  recipeTitle.textContent = data.title || 'Generated Recipe';
  recipeTime.innerHTML = `<i class="fa-solid fa-clock"></i> ${data.time ?? '—'} mins`;
  recipeServings.innerHTML = `<i class="fa-solid fa-user"></i> ${data.servings ?? '—'}`;
  if (data.image) recipeImage.src = data.image;

  const ingHtml = (data.ingredients || []).map(i => `<li>${escapeHtml(i)}</li>`).join('');
  const stepsHtml = (data.steps || []).map((s,idx) => `<li><strong>Step ${idx+1}:</strong> ${escapeHtml(s)}</li>`).join('');
  const notesHtml = data.notes ? `<div class="notes"><em>${escapeHtml(data.notes)}</em></div>` : '';

  recipeBody.innerHTML = `
    <h3>${escapeHtml(data.title)}</h3>
    <div><strong>Ingredients</strong></div>
    <ul class="ingredients-list">${ingHtml}</ul>
    <div><strong>Steps</strong></div>
    <ol class="steps-list">${stepsHtml}</ol>
    ${notesHtml}
  `;

  saveBtn.disabled = false;
  printBtn.disabled = false;
  regenerateBtn.disabled = false;
}

// ---------- HELPERS ----------
function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
}

function chooseImageForStyle(style){
  const mapping = {
    italian: 'https://images.unsplash.com/photo-1604908176943-6b2a9a0d9d19?q=80&w=1200&auto=format&fit=crop',
    indian: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop',
    mexican: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop',
    fusion: 'https://images.unsplash.com/photo-1526318472351-c75fcf0704f3?q=80&w=1200&auto=format&fit=crop',
    any: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop'
  };
  return mapping[style] || mapping.any;
}

function buildTitle(payload){
  const main = payload.ingredients[0] || 'Delight';
  const style = payload.style && payload.style !== 'any' ? `${payload.style} ` : '';
  return `${style}${capitalize(main)} ${payload.dietary !== 'none' ? '('+payload.dietary+')' : ''} Recipe`;
}

function capitalize(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }

// ---------- SAVE RECIPE TO MONGODB ----------
saveBtn.addEventListener('click', async () => {
  if(!lastGenerated) return;

  try {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const payload = {
      title: lastGenerated.title,
      ingredients: lastGenerated.ingredients,
      steps: lastGenerated.steps,
      cooking_time: lastGenerated.time,
      servings: lastGenerated.servings,
      image_url: lastGenerated.image,
      dietary: lastGenerated.dietary || 'none',
      cuisine: lastGenerated.style || 'any'
    };

    const resp = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if(!resp.ok) throw new Error(data.message || 'Error saving recipe');

    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
    setTimeout(()=> saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save', 1200);
  } catch (err) {
    console.error(err);
    alert('Failed to save recipe: ' + err.message);
  } finally {
    saveBtn.disabled = false;
  }
});

// ---------- PRINT RECIPE ----------
printBtn.addEventListener('click', () => {
  if(!lastGenerated) return;
  const w = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
  const html = `
    <html><head><title>${escapeHtml(lastGenerated.title)}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin-bottom:4px}ul,ol{line-height:1.5}</style>
    </head><body>
    <h1>${escapeHtml(lastGenerated.title)}</h1>
    <p><strong>Time:</strong> ${lastGenerated.time} mins &nbsp; <strong>Servings:</strong> ${lastGenerated.servings}</p>
    <h3>Ingredients</h3><ul>${(lastGenerated.ingredients||[]).map(i=>`<li>${escapeHtml(i)}</li>`).join('')}</ul>
    <h3>Steps</h3><ol>${(lastGenerated.steps||[]).map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ol>
    </body></html>
  `;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=> w.print(), 500);
});

// ---------- REGENERATE ----------
regenerateBtn.addEventListener('click', () => {
  if(!lastGenerated) return;
  regenerateBtn.classList.add('busy');
  setTimeout(()=> regenerateBtn.classList.remove('busy'), 700);
  generateRecipe();
});

// ---------- KEYBOARD SHORTCUT ----------
ingredientsEl.addEventListener('keydown', (e) => {
  if(e.ctrlKey && e.key === 'Enter'){ generateBtn.click(); }
});
