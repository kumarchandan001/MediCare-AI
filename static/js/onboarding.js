/* ═══════════════════════════════════════════════════════════════════════
   MEDICARE AI — Onboarding JS
   ═══════════════════════════════════════════════════════════════════════ */

let currentStep = 1;
const TOTAL_STEPS = 5;
let contactCount = 1;
let selectedConditions = [];

// ── Step Navigation ─────────────────────────────────────────────────────
function goToStep(step) {
  if (step > currentStep && !validateStep(currentStep)) return;
  if (step < 1 || step > TOTAL_STEPS) return;

  document.querySelectorAll('.onb-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + step).classList.add('active');

  // Progress bar
  const pct = (step / TOTAL_STEPS) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('step-num').textContent = step;

  // Step dots
  document.querySelectorAll('.step-dot').forEach(dot => {
    const s = parseInt(dot.dataset.step);
    dot.classList.remove('active', 'done');
    if (s < step) dot.classList.add('done');
    else if (s === step) dot.classList.add('active');
  });

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Validation ──────────────────────────────────────────────────────────
function validateStep(step) {
  clearErrors();
  let valid = true;

  if (step === 1) {
    const name = document.getElementById('full_name');
    if (!name.value.trim()) { showFieldError('full_name', 'Name is required'); valid = false; }
    const age = document.getElementById('age').value;
    if (!age) { showFieldError('age', 'Age is required'); valid = false; }
    else if (parseInt(age) < 1 || parseInt(age) > 150) { showFieldError('age', 'Age must be 1–150'); valid = false; }
    const gender = document.getElementById('gender').value;
    if (!gender) { showFieldError('gender', 'Please select gender'); valid = false; }
  }

  if (step === 2) {
    const h = document.getElementById('height').value;
    const w = document.getElementById('weight').value;
    if (h && (parseFloat(h) < 30 || parseFloat(h) > 300)) { showFieldError('height', '30–300 cm'); valid = false; }
    if (w && (parseFloat(w) < 5 || parseFloat(w) > 500)) { showFieldError('weight', '5–500 kg'); valid = false; }
  }

  if (!valid) showToast(t('Please fix the highlighted fields'));
  return valid;
}

function showFieldError(id, msg) {
  const el = document.getElementById(id + '-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  const field = document.getElementById(id);
  if (field) field.parentElement.classList.add('error');
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.onb-field.error').forEach(e => e.classList.remove('error'));
}

// ── BMI Calculator ──────────────────────────────────────────────────────
function updateBMI() {
  const h = parseFloat(document.getElementById('height').value);
  const w = parseFloat(document.getElementById('weight').value);
  const preview = document.getElementById('bmi-preview');
  const valEl = document.getElementById('bmi-value');
  const catEl = document.getElementById('bmi-category');

  if (h > 0 && w > 0) {
    const bmi = (w / ((h / 100) ** 2)).toFixed(1);
    valEl.textContent = bmi;
    preview.classList.add('calculated');

    catEl.className = 'bmi-category';
    if (bmi < 18.5) { catEl.textContent = 'Underweight'; catEl.classList.add('underweight'); }
    else if (bmi < 25) { catEl.textContent = 'Normal'; }
    else if (bmi < 30) { catEl.textContent = 'Overweight'; catEl.classList.add('overweight'); }
    else { catEl.textContent = 'Obese'; catEl.classList.add('obese'); }
  } else {
    valEl.textContent = '—';
    catEl.textContent = '';
    preview.classList.remove('calculated');
  }
}

// ── Tag Selector ────────────────────────────────────────────────────────
document.querySelectorAll('#condition-tags .tag-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const val = chip.dataset.value;
    if (val === 'None') {
      selectedConditions = ['None'];
      document.querySelectorAll('#condition-tags .tag-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    } else {
      // Remove "None" if picking a real condition
      selectedConditions = selectedConditions.filter(v => v !== 'None');
      document.querySelector('#condition-tags .tag-chip[data-value="None"]')?.classList.remove('selected');

      if (chip.classList.contains('selected')) {
        chip.classList.remove('selected');
        selectedConditions = selectedConditions.filter(v => v !== val);
      } else {
        chip.classList.add('selected');
        selectedConditions.push(val);
      }
    }
    document.getElementById('conditions').value = selectedConditions.join(', ');
  });
});

// ── Activity Level ──────────────────────────────────────────────────────
function selectActivity(el) {
  document.querySelectorAll('.activity-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('lifestyle').value = el.dataset.value;
}

// ── Sliders ─────────────────────────────────────────────────────────────
document.getElementById('sleep_hours')?.addEventListener('input', function() {
  document.getElementById('sleep-val').textContent = this.value + ' hrs';
});

document.getElementById('water_intake')?.addEventListener('input', function() {
  document.getElementById('water-val').textContent = this.value + ' L';
});

// ── BMI listeners ───────────────────────────────────────────────────────
document.getElementById('height')?.addEventListener('input', updateBMI);
document.getElementById('weight')?.addEventListener('input', updateBMI);

// ── Emergency Contacts ──────────────────────────────────────────────────
function addContact() {
  if (contactCount >= 3) { showToast(t('Maximum 3 contacts')); return; }
  contactCount++;
  const html = `
    <div class="ec-card" data-idx="${contactCount}">
      <button type="button" class="ec-remove" onclick="removeContact(this)"><i class="fas fa-times"></i></button>
      <div class="onb-grid">
        <div class="onb-field">
          <label>Contact Name</label>
          <input type="text" name="ec_name_${contactCount}" placeholder="Full name" maxlength="120">
        </div>
        <div class="onb-field">
          <label>Phone Number</label>
          <input type="tel" name="ec_phone_${contactCount}" placeholder="+91 9876543210">
        </div>
        <div class="onb-field full-width">
          <label>Relationship</label>
          <select name="ec_relation_${contactCount}">
            <option value="">Select...</option>
            <option value="Spouse">Spouse</option><option value="Parent">Parent</option>
            <option value="Sibling">Sibling</option><option value="Friend">Friend</option>
            <option value="Doctor">Doctor</option><option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>`;
  document.getElementById('ec-list').insertAdjacentHTML('beforeend', html);
  if (contactCount >= 3) document.getElementById('add-ec-btn').style.display = 'none';
}

function removeContact(btn) {
  btn.closest('.ec-card').remove();
  contactCount--;
  document.getElementById('add-ec-btn').style.display = '';
}

// ── Toast ────────────────────────────────────────────────────────────────
function showToast(msg, type) {
  const toast = document.getElementById('onb-toast');
  toast.textContent = msg;
  toast.className = 'onb-toast' + (type === 'success' ? ' success' : '');
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

// ── Form Submission ─────────────────────────────────────────────────────
document.getElementById('onboarding-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const btn = document.getElementById('submit-btn');
  const spinner = document.getElementById('submit-spinner');
  const text = document.getElementById('submit-text');
  const icon = document.getElementById('submit-icon');

  btn.disabled = true;
  spinner.classList.add('show');
  text.textContent = 'Saving...';
  icon.style.display = 'none';

  const formData = new FormData(this);
  const data = {};
  formData.forEach((val, key) => { data[key] = val; });

  try {
    const res = await fetch('/onboarding', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();

    if (result.success) {
      showToast(t('Profile saved! Redirecting...'), 'success');
      document.getElementById('progress-fill').style.width = '100%';
      document.querySelectorAll('.step-dot').forEach(d => d.classList.add('done'));
      setTimeout(() => { window.location.href = result.redirect || '/'; }, 1200);
    } else {
      const errMsg = result.errors ? result.errors.join(', ') : (result.error || 'Something went wrong');
      showToast(errMsg);
      btn.disabled = false;
      spinner.classList.remove('show');
      text.textContent = 'Submit & Continue';
      icon.style.display = '';
    }
  } catch (err) {
    showToast(t('Network error. Please try again.'));
    btn.disabled = false;
    spinner.classList.remove('show');
    text.textContent = 'Submit & Continue';
    icon.style.display = '';
  }
});
