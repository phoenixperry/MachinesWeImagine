/* Hamburger menu: toggles the .open class on the full-screen nav.
   The nav links are plain anchor links (#who, #remit, ...) so the
   browser handles the jump; we just close the overlay on click. */
const overlay = document.getElementById('nav-overlay');
const menuButton = document.getElementById('menu-button');
const menuLabel = document.getElementById('menu-label');

function setMenu(open) {
  overlay.classList.toggle('open', open);
  menuLabel.textContent = open ? 'Close' : 'Menu';
}

menuButton.addEventListener('click', () => setMenu(!overlay.classList.contains('open')));
document.getElementById('close-button').addEventListener('click', () => setMenu(false));
overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
