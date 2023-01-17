const menu = document.getElementById("menu-lateral");
const btn = document.getElementById("menu-toggle");

btn.addEventListener("click", () => {
  menu.classList.toggle("active");
})