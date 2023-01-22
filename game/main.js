const resto = document.getElementById("resto");
const descarte = document.getElementById("descarte");
const jugadorElem = document.getElementById("jugador");
const oponente = document.getElementById("oponente");
const local = document.getElementById("local");
const turnoActual = document.getElementById("turno");
const adversario = document.getElementById("adversario");
const botonCortar = document.getElementById("btn-cortar");
const puntaje1 = document.getElementById("puntaje1");
const puntaje2 = document.getElementById("puntaje2");
const mensajes = document.getElementById("mensajes");
const DEBUG = false;

if(DEBUG) {
  url = "http://localhost:3000";
} else {
  url = "https://chat-server-b7qg.onrender.com";
}
const socket = io(url);

class Jugador {
  constructor(sala, gameID, nombre, isPlayerOne) {
    this.mazo = [];
    this.turno = null;
    this.tomoCarta = null;
    this.descartoCarta = null;
    this.corta = false;
    this.nombre = nombre;
    this.sala = sala;
    this.isPlayerOne = isPlayerOne;
    this.gameID = gameID;
    this.ultimaCartaRecibida = null;
    this.ultimaCartaDescartada = null;
  }
}

let nombreJugador2 = null;
let nombreJugador1 = localStorage.getItem("user");
const userRoom = localStorage.getItem("currentRoom");
let gameID = sessionStorage.getItem("gameID");
let isPlayerOne = JSON.parse(sessionStorage.getItem("isPlayerOne"));

const jugador = new Jugador(userRoom, gameID, nombreJugador1, isPlayerOne);

socket.on("connect", () => {
  //Cargar datos de localStorage nombreJugador1
  console.log("user", jugador.nombre, "room", jugador.sala);
  socket.emit("join-room", jugador.sala, jugador.nombre);
  if(jugador.gameID && jugador.isPlayerOne !== null) {
    //usuario se reconecta
    //comprobar si la id del juego es la misma
    console.log("Usuario reconecta con", jugador.gameID, socket.id, jugador.isPlayerOne);
    return socket.emit("user-reconnect", jugador.gameID, socket.id, jugador.isPlayerOne);
    //enviar isPlayerOne para identificar al jugador
    //enviar socket.id para reemplazar al jugador
    //recibir el estado de la partida
  }
  socket.emit("player-ready");
});

socket.on("load-match", data => {
  // Si llega a esta parte es porque cargó correctamente GameID, isPlayerOne y además hay una partida comenzada
  const matchData = JSON.parse(sessionStorage.getItem("matchData"));
  const playerTwo = matchData.playersData.find(player => player.isPlayerOne !== jugador.isPlayerOne);
  limpiarTablero();
  puntaje1.innerText = data.playerScore;
  puntaje2.innerText = data.opponentScore;
  local.innerText = formatName(jugador.nombre);
  nombreJugador2 = playerTwo.name;
  adversario.innerText = formatName(nombreJugador2);
  for(let card of data.mazo) {
    const c = generateCard(card.valor, card.palo, false);
    jugador.mazo.push({ valor: card.valor, palo: card.palo, id: c.id });
    jugadorElem.appendChild(c);
  }
  for(let card of data.mazoOponente) {
    const c = generateCard(card.valor, card.palo, true);
    oponente.appendChild(c);
  }
  for(let card of data.descarte) {
    const c = generateCard(card.valor, card.palo, false);
    descarte.appendChild(c);
  }

  if(!data.turno && jugador.isPlayerOne || data.turno && !jugador.isPlayerOne) {
    userTurn();
  } else {
    opponentTurn();
  }
});

socket.on("failed-load", () => {
  console.log("No se detectó partida guardada");
  sessionStorage.clear();
  socket.emit("player-ready");
}) 

socket.on("nueva-partida", data => {
  console.log("data", data);
  jugador.gameID = data.gameID;
  const myData = data.playersData.find(player => player.id === socket.id);
  const otherData = data.playersData.find(player => player.id !== socket.id);
  console.log("Datos recibidos", myData);
  local.innerText = formatName(myData.name);
  nombreJugador2 = otherData.name;
  adversario.innerText = formatName(nombreJugador2);
  jugador.isPlayerOne = myData.isPlayerOne;
  console.log(jugador.isPlayerOne ? "Soy jugador 1" : "Soy jugador 2");
  limpiarTablero();
  puntaje1.innerText = 0;
  puntaje2.innerText = 0;
  sessionStorage.setItem("matchData", JSON.stringify(data));
  sessionStorage.setItem("isPlayerOne", jugador.isPlayerOne);
  sessionStorage.setItem("gameID", data.gameID);
});

socket.on("round-start", () => {
  limpiarTablero();
  updateCurrentTurnData(false);
  jugador.corta = setCortar(false);
  jugador.turno = null;
});

socket.on("round-end", (cartaFinal, data) => {
  jugador.turno = false;
  displayTurnoActual("---");
  console.log("Finaliza ronda", cartaFinal, data);
  const carta = generateCard(cartaFinal.valor, cartaFinal.palo, true);
  carta.classList.add("corte");
  descarte.appendChild(carta);
  data.forEach(player => {
    if(player.isPlayerOne === jugador.isPlayerOne) {
      puntaje1.innerText = player.score;
    } else {
      puntaje2.innerText = player.score;
      oponente.innerHTML = "";
      for(const card of player.cards) {
        oponente.appendChild(generateCard(card.valor, card.palo));
      }
    }
  })
})

socket.on("nuevo-turno", bool => {
  setCortar(false);
  if((!bool && jugador.isPlayerOne) || (bool && !jugador.isPlayerOne)) {
    userTurn()
  } else {
    opponentTurn();
  }
})

function userTurn() {
  jugador.turno = true;
  jugador.tomoCarta = JSON.parse(sessionStorage.getItem("tomoCarta")) || false;
  console.log("tomoCarta es", jugador.tomoCarta);
  botonCortar.disabled = true;
  jugador.descartoCarta = false;
  displayTurnoActual(jugador.nombre);
}

function opponentTurn() {
  jugador.turno = false;
  displayTurnoActual(nombreJugador2);
}

function displayTurnoActual(nombre) {
  const color = nombre === jugador.nombre ? "blue" : "red";
  turnoActual.innerText = nombre;
  turnoActual.style.color = color;
}

socket.on("recibe-carta", ({receptor, card}) => {
  const isUserCard = (!receptor && jugador.isPlayerOne) || (receptor && !jugador.isPlayerOne)
  const carta = generateCard(card.valor, card.palo, !isUserCard);
  if(isUserCard) {
    jugador.mazo.push({ valor: card.valor, palo: card.palo, id: carta.id});
    jugadorElem.appendChild(carta);
    setUltimaCartaRecibida(card);
  } else {
    oponente.appendChild(carta);
  }
});

// Oponente descarta una carta
socket.on("descarte", ({ valor, palo }, playerOne) =>  {
  const carta = generateCard(valor, palo, false);
  carta.removeAttribute("draggable");
  descarte.appendChild(carta);
  if(playerOne === null) return;
  if(playerOne === !jugador.isPlayerOne) {
    oponente.removeChild(oponente.firstChild);
  } else {
    jugador.descartoCarta = true;
  } 
});

socket.on("eliminar-descarte", () => {
  descarte.removeChild(descarte.lastChild);
});

socket.on("no-cards", () => {
  console.log("Servidor avisa que no hay cartas");
  const bg = resto.style.backgroundImage;
  resto.style.backgroundImage = "none";
  resto.classList.remove("carta");
  descarte.innerHTML = "";
  setTimeout(() => {
    resto.classList.add("carta");
    resto.style.backgroundImage = bg;
  }, 1000);
});

function createCardId() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    let pick = Math.floor(Math.random() * 2)
      ? letters[Math.floor(Math.random() * letters.length)]
      : numbers[Math.floor(Math.random() * numbers.length)];
    result += pick;
  }
  return result;
}

function limpiarTablero() {
  jugadorElem.innerHTML = "";
  oponente.innerHTML = "";
  jugador.mazo = [];
  descarte.innerHTML = "";
}

function formatName(name) {
  return name.substring(0, 3).toUpperCase()
}

function generateCard(valor, palo, hidden = false) {
  const card = document.createElement("div");
  card.classList.add("carta");
  card.draggable = "true";
  card.id = createCardId();
  if (hidden) {
    card.classList.add("oponente");
    return card;
  }
  const simbolo = document.createElement("div");
  simbolo.classList.add("simbolo");
  simbolo.innerHTML = valor;
  const imgCont = document.createElement("div");
  imgCont.classList.add("palo");
  const img = document.createElement("img");
  img.src = `./assets/img/${palo}.png`;
  img.classList.add("valor");
  imgCont.appendChild(img);
  simbolo.appendChild(imgCont);
  if (palo === "comodin") {
    card.appendChild(simbolo);
  } else {
    const topLeft = document.createElement("div");
    topLeft.classList.add("top-left");
    const bottomRight = document.createElement("div");
    bottomRight.classList.add("bottom-right");

    topLeft.appendChild(simbolo);
    bottomRight.appendChild(simbolo.cloneNode(true));

    card.appendChild(topLeft);
    card.appendChild(bottomRight);
  }

  card.addEventListener("dragstart", () => card.classList.add("dragging"));
  card.addEventListener("touchstart", () => card.classList.add("dragging"));

  card.addEventListener("dragend", () => {
    recalculateDeck();
    card.classList.remove("dragging")
  });
  card.addEventListener("touchend", () => {
    recalculateDeck();
    card.classList.remove("dragging")
  });

  return card;
}

jugadorElem.addEventListener("dragover", dragOver);
jugadorElem.addEventListener("touchmove", dragOver);

// Recalcula la baraja del jugador cuando se mueven las cartas de lugar
function recalculateDeck() {
  let newDeck = [];
  Array.from(jugadorElem.children).forEach(child => {
    const id = child.id;
    const index = getElementIndex(child);
    const card = jugador.mazo.find(card => card.id === id);
    newDeck[index] = card;
  })
  if(JSON.stringify(jugador.mazo) === JSON.stringify(newDeck)) {
    console.log("El mazo no cambió");
    return;
  }
  jugador.mazo = newDeck;
  socket.timeout(2000).emit("user-rearrange-deck", jugador.gameID, jugador.isPlayerOne, newDeck.map(card => ({valor: card.valor, palo: card.palo})));
}

function dragOver(e) {
  e.preventDefault();
  let posX = null;
  if (e.type === "touchmove") {
    posX = e.touches[0].clientX;
  } else {
    posX = e.clientX;
  }
  const afterElement = getDragAfterElement(posX);
  const draggable = document.querySelector(".dragging");

  if (afterElement === null) {
    jugadorElem.appendChild(draggable);
  } else {
    jugadorElem.insertBefore(draggable, afterElement);
  }
}

function getDragAfterElement(x) {
  const elements = [...jugadorElem.querySelectorAll(".carta:not(.dragging)")];
  return elements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

function getCardFromElementId(id) {
  return jugador.mazo.find(card => card.id === id);
}

async function descartar(elem) {
  const carta = getCardFromElementId(elem.id);
  setUltimoDescarte(carta);
  await socket.timeout(5000).emit("descarta", jugador.isPlayerOne, {valor: carta.valor, palo: carta.palo});
  removerCartaDelMazo(carta);
  jugadorElem.removeChild(elem);
}

function usuarioCorta(elem) {
  const carta = getCardFromElementId(elem.id);
  console.log("Usuario intenta cortar con", carta.valor, "de", carta.palo);
  if(carta.valor > 7) {
    return // displayMessage("No se puede cortar con una carta mayor a 7");
  }
  removerCartaDelMazo(carta);
  setUltimoDescarte(carta);
  socket.timeout(5000).emit("usuario-corta", jugador.isPlayerOne, {valor: carta.valor, palo: carta.palo});
  jugadorElem.removeChild(elem);
}

function setUltimoDescarte(carta) {
  jugador.ultimaCartaDescartada = { valor: carta.valor, palo: carta.palo };
  console.log("Ultimo descarte", jugador.ultimaCartaDescartada);
}

function setUltimaCartaRecibida(carta) {
  jugador.ultimaCartaRecibida = carta;
  console.log("Ultima carta recibida:", jugador.ultimaCartaRecibida);
}

function removerCartaDelMazo(carta) {
  const index = jugador.mazo.indexOf(carta);
  jugador.mazo.splice(index, 1);
}

function puedeDescartar() {
  return jugador.mazo.length >= 7 && jugador.turno && jugador.tomoCarta;
}

function puedeTomarCarta() {
  return !jugador.tomoCarta && jugador.turno;
}

function finalizaTurno() {
  return jugador.tomoCarta && jugador.descartoCarta;
}

function getElementIndex(element) {
  return Array.from(jugadorElem.children).indexOf(element);
}

botonCortar.addEventListener("click", e => {
  setCortar(!jugador.corta);
});

function setCortar(bool) {
  if(puedeDescartar()) {
    jugador.corta = bool; 
  } else {
    // displayMessage("No se puede cortar sin antes tomar una carta");
  }
  console.log("Se llama a setCortar");
  jugador.corta ? displayMessage("Cortar activado") : displayMessage("");
}

function displayMessage(message) {
  mensajes.innerText = message;
}

jugadorElem.addEventListener("click", (e) => {
  if (e.target.classList.contains("carta") && puedeDescartar()) {
    if(jugador.corta) {
      return usuarioCorta(e.target);
    };
    descartar(e.target);
    jugador.turno = false;
    botonCortar.disabled = true;
    updateCurrentTurnData(false);
    socket.timeout(2000).emit("finaliza-turno");
  }
});

resto.addEventListener("click", (e) => {
  if (puedeTomarCarta()) {
    socket.timeout(2000).emit("toma-carta", jugador.isPlayerOne);
    updateCurrentTurnData(true);
  } else {
    console.log("No puede tomar carta");
  }
});

descarte.addEventListener("click", (e) => {
  if (puedeTomarCarta()) {
    socket.timeout(2000).emit("toma-descarte", jugador.isPlayerOne);
    updateCurrentTurnData(true);
  }
});

function updateCurrentTurnData(bool) {
  jugador.tomoCarta = bool;
  sessionStorage.setItem("tomoCarta", jugador.tomoCarta);
  bool ? botonCortar.disabled = false : botonCortar.disabled = true;
}

// Errores de servidor
socket.on("toma-descarte-fail", () => {
  console.log("Reintentando tomar descarte...")
  socket.emit("toma-descarte", jugador.isPlayerOne);
});

socket.on("toma-carta-fail", () => {
  console.log("Reintentando tomar carta...")
  socket.emit("toma-carta", jugador.isPlayerOne);
});

socket.on("finaliza-turno-fail", () => {
  console.log("Fin de turno falló");
  console.log("Ultimo descarte:", jugador.ultimaCartaDescartada);
  console.log("Mazo:", jugador.mazo);
  const cartaSigueEnMazo = jugador.mazo.find(carta => JSON.stringify({valor: carta.valor, palo: carta.palo }) === JSON.stringify(jugador.ultimaCartaDescartada));
  if(cartaSigueEnMazo) {
    console.log(`Descarte ${jugador.ultimaCartaDescartada.valor} de ${jugador.ultimaCartaDescartada.palo} sigue en el mazo`);
    const carta = jugadorElem.getElementById(cartaSigueEnMazo.id);
    console.log("Volviendo a descartar...");
    descartar(carta);
  }
  console.log("Reintentando finalizar turno...")
  socket.emit("finaliza-turno");
});

socket.on("usuario-corta-fail", () => {
  console.log("Reintentando cortar...")
  socket.emit("usuario-corta", jugador.isPlayerOne, jugador.ultimaCartaDescartada);
});

socket.on("usuario-descarta-fail", () => {
  console.log("Reintentando descartar...")
  socket.emit("descarta", jugador.isPlayerOne, jugador.ultimaCartaDescartada);
});