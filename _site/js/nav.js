// const nav = document.querySelector('.nav-content');
// const navMenu = document.querySelector('.nav');
// const closeButton = document.querySelector('.close-nav');
// const openButton = document.querySelector('.open-nav');

// openButton.addEventListener("click", () => {
//     nav.classList.add('navigation-open');
//     openButton.classList.add('move-left'); // Add move-left class
// }); 

// closeButton.addEventListener("click", () => {
//     nav.classList.remove('navigation-open');
//     openButton.classList.remove('move-left'); // Remove move-left class
// }); 


const navContainer = document.querySelector('.nav-container');
const hamburger = document.querySelector('.hamburger');

hamburger.addEventListener('click', () => {
  navContainer.classList.toggle('active');
  document.body.style.overflow = navContainer.classList.contains('active') ? 'hidden' : 'auto';
});