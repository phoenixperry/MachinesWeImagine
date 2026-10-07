/* Meetup sign-up form (meetup.html).
   Checks name + email, then sends them — plus whether they want a
   show and tell slot (and what they'll share) and whether the
   mailing-list box is ticked — to the same Google Apps Script as the
   Join us modal. The script writes a row to the "Meetup signups" tab,
   and also to "Signups" (the mailing list) when that box is ticked.
   Show and tell is capped at six: on load we ask the script how many
   slots are left and grey out the box when there are none.

   NEXT MEETUP: change MEETUP_ID and MEETUP_DATE below, add the same id
   to MEETUPS in apps-script.gs, and update the dates in meetup.html. */

// Which meetup sign-ups go to (its id in MEETUPS in apps-script.gs)
const MEETUP_ID = '2026-11-04';
const MEETUP_DATE = '4 November';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby7iZ0Pm7Fj7r4nG21KjCG-yX1Au_dctv4189Azmg9vI-wwLGdbLAHGD7ZdF0soQGd1/exec';

const form = document.getElementById('meetup-form');
const errorEl = document.getElementById('meetup-error');
const doneEl = document.getElementById('meetup-done');
const button = form.querySelector('button[type="submit"]');
const topicField = document.getElementById('topic-field');

// "What will you share?" only shows once the show and tell box is ticked
function syncTopic() { topicField.hidden = !form.present.checked; }
form.present.addEventListener('change', syncTopic);

// Links to meetup.html#present (e.g. from the home page) pre-tick the box
if (location.hash === '#present') form.present.checked = true;
syncTopic();

// Ask how many show and tell slots are left. If this fails, the box stays
// usable — the script still caps it and records extras as "Waitlist".
const presentText = document.getElementById('present-text');
// An older deployment of apps-script.gs ignores the meetup id and reports
// the last meetup's count, so we also ask about an id that doesn't exist:
// if that still gets a number, the count isn't for this meetup.
const askSlots = (id) => fetch(SCRIPT_URL + '?slots=1&meetup=' + id).then((res) => res.json());
Promise.all([askSlots(MEETUP_ID), askSlots('not-a-meetup').catch(() => ({}))])
  .then(([{ slotsLeft }, probe]) => {
    if (typeof slotsLeft !== 'number' || typeof probe.slotsLeft === 'number') return;
    if (slotsLeft > 0) {
      presentText.textContent = `I’d like a show and tell slot (five minutes, slides optional — ${slotsLeft} of 6 left)`;
      return;
    }
    form.present.checked = false;
    form.present.disabled = true;
    presentText.textContent = 'All six show and tell slots are taken. You can still sign up to come along.';
    syncTopic();
  })
  .catch(() => {});

// Same format check as the modal: something@something.tld
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function showError(message, field) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  if (field) field.focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const mailingList = form.mailingList.checked;
  const present = form.present.checked;
  const topic = present ? form.topic.value.trim() : '';

  if (!name) return showError('Please enter your name.', form.name);
  if (!isValidEmail(email)) return showError('That email doesn’t look right — please check it.', form.email);

  button.disabled = true;
  button.textContent = 'Signing up…';
  try {
    // no-cors: Apps Script doesn't send CORS headers, so we can't read the
    // reply — but the row is still written. Check the Sheet when testing.
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ type: 'meetup', meetup: MEETUP_ID, name, email, mailingList, present, topic }),
    });
    form.hidden = true;
    doneEl.textContent = 'You’re signed up'
      + (present ? ' and down for a show and tell slot' : '')
      + (mailingList ? ', and on the mailing list' : '')
      + '. See you on ' + MEETUP_DATE + '.';
    doneEl.hidden = false;
  } catch (err) {
    showError('Something went wrong — please try again, or email hello@machinesweimagine.com.');
    button.disabled = false;
    button.textContent = 'Sign up';
  }
});
