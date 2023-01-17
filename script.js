const messageContainer = document.getElementById("chat");
const chatBox = document.getElementById("input");
const input = document.getElementById("message");
const salas = document.getElementById("salas-list");
const users = document.getElementById("users");
const currentRoom = document.getElementById("room-name");
let url = null;
const DEBUG = true;


if (DEBUG) {
  url = "http://localhost:3000";
} else {
  url = "https://chat-server-b7qg.onrender.com";
}

const socket = io(url);

let nombre = "";
let history = [];
let userRoom = "lobby";

infoMessage("Aguarda unos segundos mientras te conectas a la sala...");

const user = localStorage.getItem("user");
if(user) {
  nombre = user
} else {
  cambiarNombre();
}

socket.on("connect", () => {
  infoMessage("Te uniste al chat");
  socket.emit("new-user");
  crearNuevaSala("lobby", "Lobby");
  loadData();
  socket.emit("join-room", userRoom, nombre);
  
});

function loadData() {
  const previousMessages = JSON.parse(window.localStorage.getItem("history"));
  if(previousMessages) history = previousMessages;
  loadCurrentRoom();
}

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
  if(socketID === socket.id) {
    if(history.findIndex(room => room.id === roomName) === -1) {
      history.push({id: roomName, messages: []})
    } else {
      messageContainer.innerHTML = "";
      loadMessages(roomName);
    }
  }
  infoMessage(`${message} a la sala ${roomName}`);
});

socket.on("user-leaves-room", userName => {
  infoMessage(`${userName} deja la sala`);
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
 addToHistory(socket, message);
});

function addToHistory(socket, message) {
  const copy = {...message};
  if(copy.id === socket.id) {
    copy.sender = "Yo"
  }
  history.filter(room => String(room.id) === currentRoom.innerText)[0].messages.push(copy);
  window.localStorage.setItem("history", JSON.stringify(history));
}

function loadMessages(roomID) {
  history.filter(room => room.id === roomID)[0].messages.forEach(message => displayMessage(message));
}

socket.on("room-full", () => {
  infoMessage("La sala está llena");
})

socket.on("room-not-found", () => {
  infoMessage("No se encontró la sala");
})

chatBox.addEventListener("submit", e => {
  e.preventDefault();
  if(input.value === "") return;
  socket.emit("send-message", {id: socket.id, sender: nombre, message: input.value});
  input.value = "";
});

function infoMessage(message) {
  messageContainer.innerHTML += `<p>${message}</p>`;
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function crearNuevaSala(id, roomName) {
  let sala = document.createElement("div");
  sala.classList.add("sala");
  sala.id = id;
  sala.innerText = roomName;
  sala.onclick = () => {
    setCurrentRoom(id);
    socket.emit("join-room", id, nombre)
  };
  salas.appendChild(sala);
}

function loadCurrentRoom() {
  const room = localStorage.getItem("currentRoom");
  if(room) {
    userRoom = room;
  }
}

function setCurrentRoom(id) {
  userRoom = id;
  localStorage.setItem("currentRoom", userRoom);
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

function displayMessage(message, socket = null) {
  const m = document.createElement("div");

  const senderInfo = document.createElement("div");
  let sender;
  if(socket && socket.id === message.id) {
    sender = "Yo";
  } else {
    sender = message.sender;
  }
  senderInfo.classList.add("msg-sender");
  senderInfo.innerText = sender + ":";

  const content = document.createElement("div");
  content.classList.add("msg-content");
  content.innerText = message.message;

  const time = document.createElement("div");
  time.classList.add("msg-time");
  time.innerText = message.time;

  m.classList.add("message");
  sender === "Yo" ? m.classList.add("sent") : m.classList.add("received");

  m.appendChild(senderInfo);
  m.appendChild(content);
  m.appendChild(time);

  messageContainer.appendChild(m);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}
