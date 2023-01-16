const messageContainer = document.getElementById("chat");
const chatBox = document.getElementById("input");
const input = document.getElementById("message");
const salas = document.getElementById("salas-list");
const users = document.getElementById("users");
let url = null;
const DEBUG = false;


if (DEBUG) {
  url = "http://localhost:3000";
} else {
  url = "https://chat-server-b7qg.onrender.com";
}

const socket = io(url);

let nombre = "";

messageContainer.innerHTML = "Aguarda unos segundos mientras te conectas a la sala...";

const user = localStorage.getItem("user");
if(user) {
  nombre = user
} else {
  nombre = prompt("Tu nombre:");
  localStorage.setItem("user", nombre);
}
socket.on("connect", () => {
  messageContainer.innerHTML = "Te uniste al chat";
  socket.emit("new-user");
});

socket.on("room-list", lista => {
  salas.innerHTML = "";
  lista.forEach(sala => {
    console.log(sala);
    return crearNuevaSala(sala.id, sala.number);
  })
})

socket.on("user-join-room", (socketID, roomName, playerName) => {
  let message = "";
  if(socketID === socket.id) {
    message = `Te uniste`;
  } else {
    message = `${playerName} se une`;
  }
  messageContainer.innerHTML += `<p>${message} a la sala ${roomName}</p>`;
});

socket.on("room-users", userList => {
  users.innerHTML = "";
  userList.forEach(user => crearNuevoUsuario(user));
})

socket.on("receive-message", message => {
 displayMessage(message, socket);
})

socket.on("room-full", () => {
  messageContainer.innerHTML += `<p>La sala está llena</p>`;
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

function crearNuevaSala(id, roomName) {
  let sala = document.createElement("div");
  sala.classList.add("sala");
  sala.id = id;
  sala.innerText = "Sala " + roomName;
  sala.onclick = () => socket.emit("join-room", id, nombre);
  salas.appendChild(sala);
}

function crearNuevoUsuario(nombre) {
  let usuario = document.createElement("div");
  usuario.classList.add("usuario");
  usuario.innerText = nombre;
  users.appendChild(usuario);
}

function displayMessage(message, socket) {
  const m = document.createElement("div");
  m.classList.add("message");
  socket.id === message.id ? m.classList.add("sent") : m.classList.add("received");
  m.innerText = message.message;
  messageContainer.appendChild(m);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}
