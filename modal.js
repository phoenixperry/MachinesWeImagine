/* Join-us modal: opens on the section-01 "Join us" button and sends
   name + email to a Google Sheet via a Google Apps Script web app.

   SETUP: follow the steps at the top of apps-script.gs, then paste
   your web app URL (ends in /exec) into SCRIPT_URL below. Until you
   do, submissions fall back to opening the visitor's email app. */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKkXDOD59nz74W_Wv-IxOjEWfX9z6mhe1baDeBZd6LOaDpsBbhoBODEzHAIEErpiwa6A/exec'; // ← paste your Apps Script web app URL here

const joinModal = document.getElementById('join-modal');
const joinForm = document.getElementById('join-form');
const joinDone = document.getElementById('join-done');
const submitButton = joinForm.querySelector('button[type="submit"]');

function setModal(open) {
  joinModal.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : ''; // stop page scroll behind the modal
  if (open) {
    joinForm.hidden = false;
    joinDone.hidden = true;
    joinForm.querySelector('input').focus();
  }
}

document.getElementById('join-button').addEventListener('click', () => setModal(true));
document.getElementById('join-close').addEventListener('click', () => setModal(false));
// click on the dark backdrop (not the panel) also closes
joinModal.addEventListener('click', (e) => { if (e.target === joinModal) setModal(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setModal(false); });

joinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = joinForm.name.value.trim();
  const email = joinForm.email.value.trim();

  // Fallback while SCRIPT_URL is empty: pre-filled email instead
  if (!SCRIPT_URL) {
    const subject = encodeURIComponent('Mailing list signup');
    const body = encodeURIComponent(`Please add me to the Machines We Imagine mailing list.\n\nName: ${name}\nEmail: ${email}`);
    window.location.href = `mailto:phoenix@machinesweimagine.com?subject=${subject}&body=${body}`;
    showDone('Thanks. Your email app should have opened with the signup message ready to send.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Signing up…';
  try {
    // mode:'no-cors' is needed because Apps Script sends no CORS headers, so the
    // browser can't read the response, but the row still gets written.
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ name, email }),
    });
    showDone("Thanks, you're on the list.");
  } catch (err) {
    showDone('Something went wrong. Please email us instead at phoenix@machinesweimagine.com.');
  }
  submitButton.disabled = false;
  submitButton.textContent = 'Sign up';
});

function showDone(message) {
  joinDone.textContent = message;
  joinForm.hidden = true;
  joinDone.hidden = false;
}
