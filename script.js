const messageContainer = document.getElementById("chat");
const chatBox = document.getElementById("input");
const chatInput = document.getElementById("message");
const salas = document.getElementById("salas-list");
const users = document.getElementById("users");
const currentRoom = document.getElementById("room-name");
const usersWritingBox = document.getElementById("users-writing");
const socket = io("https://chat-server-b7qg.onrender.com");
//"https://chat-server-b7qg.onrender.com"
//"http://localhost:3000"

let nombre = "";
let history = [];
let userRoom = "Lobby";
let estaEscribiendo = false;

infoMessage("Aguarda unos segundos mientras te conectas a la sala...");

const user = localStorage.getItem("user");
if (user) {
  nombre = user;
} else {
  cambiarNombre();
}

// Eventos socket.io
// Usuario se conecta
socket.on("connect", () => {
  socket.emit("new-user");
  loadData();
  socket.emit("join-room", userRoom, nombre);
});

// Usuario recibe la lista de salas
socket.on("room-list", (lista) => {
  salas.innerHTML = "";
  lista.forEach((sala) =>
    crearNuevaSala(
      sala.id,
      `Sala ${sala.number}`,
      sala.currentUsers,
      sala.capacity
    )
  );
});

// Una sala actualiza la cantidad de usuarios online
socket.on("room-updated", (roomID, data) => {
  updateRoom(roomID, data);
});

// Alguien se une a la sala del usuario
socket.on("user-join-room", (socketID, roomName, playerName) => {
  if (socketID === socket.id) {
    currentRoom.innerText = roomName;
    if (history.findIndex((room) => room.id === roomName) === -1) {
      history.push({ id: roomName, messages: [] });
    } else {
      messageContainer.innerHTML = "";
      loadMessages(roomName);
    }
    infoMessage(`Te uniste a la sala ${roomName}`);
  } else {
    infoMessage(`${playerName} se une a la sala`);
  }
  setCurrentRoom(roomName);
});

// Usuario intenta unirse a la sala en la que ya está
socket.on("user-already-in-room", () => {
  infoMessage("Ya estás en la sala " + userRoom);
});

// Alguien deja la sala del usuario
socket.on("user-leaves-room", (userName) => {
  infoMessage(`${userName} deja la sala`);
});

// Lista de usuarios en la sala actual
socket.on("room-users", (userList) => {
  users.innerHTML = "";
  userList.forEach((user) => {
    const name = user.id === socket.id ? user.name + " (yo)" : user.name;
    return crearNuevoUsuario(name, user.id === socket.id);
  });
});

// Alguien está escribiendo en la sala del usuario
socket.on("user-writing", (usersWriting) => {
  const str = usersWriting
    .filter((user) => user.id !== socket.id)
    .map((user) => user.name)
    .join(", ");
  showUserWriting(str);
});

// La sala recibe un mensaje (puede ser del propio usuario o de otra persona)
socket.on("receive-message", (message) => {
  // Llega mensaje con id, sender, message y time
  displayMessage(message, socket);
  addToHistory(socket, message);
});

// Sala recibe peticion de partida
socket.on("game-request", (socketID, playersData) => {
  const playerName = playersData.find(player => player.id !== socket.id).name;
  if(socketID === socket.id) {
    showGameRequest({name: playerName, isSender: true});
  } else {
    showGameRequest({name: playerName, isSender: false});
  }
});

function showGameRequest({ name, isSender }) {
  if(document.getElementById("game-request")) {
    console.log("Ya hay una petición en espera");
    return;
  }
  const box = document.createElement("div");
  box.classList.add("info-message");
  box.id = "game-request";
  const message = document.createElement("div");
  message.classList.add("game-request-message");
  // Falta texto del mensaje
  const content = document.createElement("div");
  content.classList.add("game-request-content");
  content.id = "game-request-content";
  if(isSender) {
    message.innerText = `Invitaste a ${name} a jugar una partida de chinchon`;
    content.innerHTML = `<span>Esperando respuesta</span><span class="dots"></span>`;
  } else {
    message.innerText = `${name} te invita a jugar una partida de chinchon`;
    const botonAceptar = generateButton("Aceptar");
    botonAceptar.onclick = () => socket.emit("game-accepted");
    const botonRechazar = generateButton("Rechazar");
    botonRechazar.onclick = () => socket.emit("game-rejected");
    content.appendChild(botonAceptar);
    content.appendChild(botonRechazar);
      //Si la partida no se acepta en 8 segundos vence la petición
    setTimeout(() => {
      socket.emit("game-request-expired");
    }, 15000);
  }
  box.appendChild(message);
  box.appendChild(content);

  messageContainer.appendChild(box);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function generateButton(mensaje) {
  const button = document.createElement("button");
  button.classList.add("btn");
  button.innerText = mensaje;
  return button;
}

socket.on("game-accepted", gameAccepted => {
  const box = document.getElementById("game-request");
  const elem = document.getElementById("game-request-content");
  elem.innerText = gameAccepted ? "Partida aceptada! Aguarda unos segundos..." : "Partida rechazada...";
  if(!gameAccepted) {
    setTimeout(() => {
      messageContainer.removeChild(box);
    }, 2500);
  }
})

socket.on("inicia-partida", () => {
  location.href = "./game/index.html";
})

// La sala a la que intenta unirse el usuario está llena
socket.on("room-full", () => infoMessage("La sala está llena"));

// La sala a la que intenta unirse el usuario no se encontró
socket.on("room-not-found", () => infoMessage("No se encontró la sala"));

// FUNCIONES
// Muestra quienes están escribiendo
function showUserWriting(str) {
  if (str === "") return (usersWritingBox.innerHTML = "");
  usersWritingBox.innerHTML = "";
  const users = document.createElement("span");
  const dots = document.createElement("span");
  dots.classList.add("dots");
  users.innerText = `${str} escribiendo`;
  usersWritingBox.appendChild(users);
  usersWritingBox.appendChild(dots);
}

// Guarda el historial de mensajes
function addToHistory(socket, message) {
  const copy = { ...message };
  if (copy.id === socket.id) {
    copy.sender = "Yo";
  }
  const h = history.filter((room) => String(room.id) === currentRoom.innerText)[0];
  if (h) {
    h.messages.push(copy);
    window.localStorage.setItem("history", JSON.stringify(history));
  }
}

// Carga el historial y la sala previa del usuario
function loadData() {
  const previousMessages = JSON.parse(window.localStorage.getItem("history"));
  if (previousMessages) history = previousMessages;
  loadCurrentRoom();
}

// Muestra los mensajes guardados en el historial en la ventana de chat
function loadMessages(roomID) {
  history
    .filter((room) => room.id === roomID)[0]
    .messages.forEach((message) => displayMessage(message));
}

// Muestra mensajes informativos en la ventana de chat
function infoMessage(message) {
  const elem = document.createElement("p");
  elem.classList.add("info-message");
  elem.innerText = message;
  messageContainer.appendChild(elem);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

// Crea una nueva sala
function crearNuevaSala(id, roomName, currentUsers, capacity) {
  const sala = document.createElement("div");
  sala.classList.add("sala");
  sala.id = id;
  sala.innerText = roomName;
  sala.onclick = () => {
    const name = roomName.split(" ")[1];
    socket.emit("join-room", name, nombre);
    chatInput.value = "";
    estaEscribiendo = false;
  };
  const connected = document.createElement("span");
  connected.classList.add("connected");
  connected.innerText = `(${currentUsers}/${capacity})`;
  sala.appendChild(connected);
  salas.appendChild(sala);
}

// Recupera la ultima sala visitada por el usuario
function loadCurrentRoom() {
  const room = localStorage.getItem("currentRoom");
  if (room) {
    userRoom = room;
  }
}

// Guarda la sala actual del usuario
function setCurrentRoom(roomName) {
  userRoom = roomName;
  localStorage.setItem("currentRoom", userRoom);
}

// Actualiza el numero de usuarios conectados en una sala
function updateRoom(roomID, data) {
  const room = document.getElementById(roomID);
  if(!room) return;
  const connected = room.querySelector(".connected");
  connected.innerText = `(${data.currentUsers}/${data.capacity})`;
}

// Crea un nuevo usuario y lo agrega al menu lateral
function crearNuevoUsuario(nombre, isCurrentUser = false) {
  let usuario = document.createElement("div");
  usuario.classList.add("usuario");
  usuario.innerText = nombre;
  if (isCurrentUser) {
    let btn = document.createElement("button");
    btn.innerHTML = "&#9998";
    btn.classList.add("cambiar-nombre");
    btn.onclick = cambiarNombre;
    usuario.appendChild(btn);
  }
  users.appendChild(usuario);
}

// Gestiona el cambio de nombre del usuario
function cambiarNombre() {
  const nuevoNombre = prompt("Tu nombre:");
  if (nuevoNombre) nombre = nuevoNombre;
  if (!nombre) nombre = "anonimo";
  localStorage.setItem("user", nombre);
  const room = userRoom;
  socket.emit("user-change-name", room, nombre);
}

// Crea los mensajes de los usuarios
function displayMessage(message, socket = null) {
  const m = document.createElement("div");
  const senderInfo = document.createElement("div");
  let sender;
  if (socket && socket.id === message.id) {
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

// EVENTOS
// Envio de mensaje
chatBox.addEventListener("submit", (e) => {
  e.preventDefault();
  if (chatInput.value === "") return;
  if (chatInput.value.match(/^!\w*/)) {
    const comando = chatInput.value.split(" ")[0].substring(1).toLowerCase();
    evaluarComando(comando);
  } else {
    socket.emit("send-message", {
      id: socket.id,
      sender: nombre,
      message: chatInput.value,
    });
  }
  chatInput.value = "";
  estaEscribiendo = false;
  socket.emit("user-is-writing", estaEscribiendo);
});

function evaluarComando(comando) {
  switch (comando) {
    case "jugar":
      socket.emit("user-send-game-request", nombre);
      break;
    default:
      infoMessage(`'${comando}' no es un comando válido...`);
  }
}

// Controla si el usuario está escribiendo o no
chatInput.addEventListener("input", (e) => {
  if (chatInput.value !== "" && !estaEscribiendo) {
    estaEscribiendo = true;
  }
  if (chatInput.value === "") {
    estaEscribiendo = false;
  }
  socket.emit("user-is-writing", estaEscribiendo);
});
