const messageContainer = document.getElementById("chat");
const chatBox = document.getElementById("input");
const input = document.getElementById("message");
const socket = io("https://chat-server-b7qg.onrender.com");

messageContainer.innerHTML = "Aguarda unos segundos mientras te conectas a la sala...";

socket.on("connect", () => {
  messageContainer.innerHTML = "Te uniste al chat";
});

socket.on("receive-message", message => {
 displayMessage(message);
})

chatBox.addEventListener("submit", e => {
  e.preventDefault();
  if(input.value === "") return;
  socket.emit("send-message", input.value);
  displayMessage(input.value, true);
  input.value = "";
});

function displayMessage(message, isLocal = false) {
  const m = document.createElement("div");
  m.classList.add("message");
  isLocal ? m.classList.add("sent") : m.classList.add("received");
  m.innerText = message;
  messageContainer.appendChild(m);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}
