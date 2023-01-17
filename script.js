const messageContainer = document.getElementById("chat");
const chatBox = document.getElementById("input");
const input = document.getElementById("message");
const salas = document.getElementById("salas-list");
const users = document.getElementById("users");
const currentRoom = document.getElementById("room-name");
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
  cambiarNombre();
}

socket.on("connect", () => {
  messageContainer.innerHTML = "Te uniste al chat";
  socket.emit("new-user");
  crearNuevaSala("lobby", "Lobby");
  socket.emit("join-room", "lobby", nombre);
});

socket.on("room-list", lista => {
  const lobby = [...salas.childNodes].find(node => node.id === "lobby");
  salas.innerHTML = "";
  salas.appendChild(lobby);
  lista.forEach(sala => crearNuevaSala(sala.id, "Sala " + sala.number));
})

socket.on("user-join-room", (socketID, roomName, playerName) => {
  let message = "";
  if(socketID === socket.id) {
    message = "Te uniste";
    currentRoom.innerText = roomName;
  } else {
    message = `${playerName} se une`;
  }
  messageContainer.innerHTML += `<p>${message} a la sala ${roomName}</p>`;
});

socket.on("user-leaves-room", userName => {
  messageContainer.innerHTML += `<p>${userName} deja la sala</p>`;
})

socket.on("room-users", (userList) => {
  users.innerHTML = "";
  userList.forEach(user => {
    const name = user.id === socket.id ? user.name + " (yo)" : user.name;
    return crearNuevoUsuario(name, user.id === socket.id);
  });
})

socket.on("receive-message", message => {
  // Llega mensaje con id, sender, message y time
 displayMessage(message, socket);
})

socket.on("room-full", () => {
  messageContainer.innerHTML += `<p>La sala está llena</p>`;
})

chatBox.addEventListener("submit", e => {
  e.preventDefault();
  if(input.value === "") return;
  socket.emit("send-message", {id: socket.id, sender: nombre, message: input.value});
  input.value = "";
});

function crearNuevaSala(id, roomName) {
  let sala = document.createElement("div");
  sala.classList.add("sala");
  sala.id = id;
  console.log(roomName);
  sala.innerText = roomName;
  sala.onclick = () => socket.emit("join-room", id, nombre);
  salas.appendChild(sala);
}

function crearNuevoUsuario(nombre, isCurrentUser = false) {
  let usuario = document.createElement("div");
  usuario.classList.add("usuario");
  usuario.innerText = nombre;
  if(isCurrentUser) {
    let btn = document.createElement("button");
    btn.innerHTML = "&#9998";
    btn.classList.add("cambiar-nombre");
    btn.onclick = cambiarNombre;
    usuario.appendChild(btn);
  }
  users.appendChild(usuario);
}

function cambiarNombre() {
  nombre = prompt("Tu nombre:");
  if(!nombre) nombre = "anonimo";
  localStorage.setItem("user", nombre);
  const room = currentRoom.innerText;
  socket.emit("user-change-name", room, nombre);
}

function displayMessage(message, socket) {
  const m = document.createElement("div");
  m.classList.add("message");
  socket.id === message.id ? m.classList.add("sent") : m.classList.add("received");

  const sender = document.createElement("div");
  sender.classList.add("msg-sender");
  sender.innerText = socket.id === message.id ? "Yo:" : message.sender + ":";

  const content = document.createElement("div");
  content.classList.add("msg-content");
  content.innerText = message.message;

  const time = document.createElement("div");
  time.classList.add("msg-time");
  time.innerText = message.time;

  m.appendChild(sender);
  m.appendChild(content);
  m.appendChild(time);

  messageContainer.appendChild(m);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}
