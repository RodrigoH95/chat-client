const messageContainer = document.getElementById("chat");
const chatBox = document.getElementById("input");
const input = document.getElementById("message");
const salas = document.getElementById("salas-list")
let url = null;
const DEBUG = true;


if (DEBUG) {
  url = "http://localhost:3000";
} else {
  url = "https://chat-server-b7qg.onrender.com";
}
const socket = io(url);

let nombre = "";

messageContainer.innerHTML = "Aguarda unos segundos mientras te conectas a la sala...";

socket.on("connect", () => {
  messageContainer.innerHTML = "Te uniste al chat";
  nombre = prompt("Tu nombre:");
  socket.emit("new-user", {name: nombre});
});

socket.on("room-list", lista => {
  salas.innerHTML = "";
  lista.forEach(sala => {
    let salaId = sala.split(":")[1];
    let nombre = sala.split(":")[2];
    return crearNuevaSala(salaId, nombre);
  })
})

socket.on("user-join-room", (nombreDelCliente, nombreDelHost) => {
  let message = "";
  if(nombre === nombreDelHost && nombreDelCliente === nombreDelHost) {
    message = "<p>Te uniste a tu sala</p>";
  } else if (nombreDelCliente === nombreDelHost) {
    message = `<p>${nombreDelHost} se une a la sala</p>`
  } else if (nombre === nombreDelHost) {
    message = `<p>${nombreDelCliente} se une a tu sala</p>`
  }
  else {
    message= `<p>${nombreDelCliente} se une a la sala de ${nombreDelHost}</p>`;
  }
  messageContainer.innerHTML += message
})

socket.on("receive-message", message => {
 displayMessage(message, socket);
})

socket.on("nueva-sala", (id) => {
  console.log("calling new room");
  if(id !== socket.id) {
    crearNuevaSala(id)
  }
})

chatBox.addEventListener("submit", e => {
  e.preventDefault();
  if(input.value === "") return;
  socket.emit("send-message", input.value);
  input.value = "";
});

function crearNuevaSala(id, nombre) {
  console.log("Creando sala para:", id)
  let sala = document.createElement("div");
  sala.classList.add("sala");
  sala.id = id;
  sala.innerText = nombre;
  sala.onclick = () => socket.emit("join-room", id);
  salas.appendChild(sala);
}

function displayMessage(message, socket) {
  const m = document.createElement("div");
  m.classList.add("message");
  socket.id === message.id ? m.classList.add("sent") : m.classList.add("received");
  m.innerText = message.message;
  messageContainer.appendChild(m);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}
