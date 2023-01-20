const resto = document.getElementById("resto");
const descarte = document.getElementById("descarte");
const jugador = document.getElementById("jugador");
const oponente = document.getElementById("oponente");
const local = document.getElementById("local");
const turnoActual = document.getElementById("turno");
const adversario = document.getElementById("adversario");
const botonCortar = document.getElementById("btn-cortar");
const puntaje1 = document.getElementById("puntaje1");
const puntaje2 = document.getElementById("puntaje2");

const DEBUG = true;

if(DEBUG) {
  url = "http://localhost:3000";
} else {
  url = "https://chinchon-server.onrender.com";
}
const socket = io(url);

let mazo = [];
let turno = null;
let tomoCarta = null;
let descartoCarta = null;
let nombreJugador2 = null;
let corta = false;
let nombreJugador1 = localStorage.getItem("user");
const userRoom = localStorage.getItem("currentRoom");
let isPlayerOne = JSON.parse(sessionStorage.getItem("isPlayerOne"));
let gameID = sessionStorage.getItem("gameID");


socket.on("connect", () => {
  //Cargar datos de localStorage nombreJugador1
  console.log("user", nombreJugador1, "room", userRoom);
  socket.emit("join-room", userRoom, nombreJugador1);
  if(gameID && isPlayerOne !== null) {
    //usuario se reconecta
    //comprobar si la id del juego es la misma
    return socket.emit("user-reconnect", gameID, socket.id, isPlayerOne);
    //enviar isPlayerOne para identificar al jugador
    //enviar socket.id para reemplazar al jugador
    //recibir el estado de la partida
  }
  socket.emit("player-ready");
});

socket.on("load-match", data => {
  // Si llega a esta parte es porque cargó correctamente GameID, isPlayerOne y además hay una partida comenzada
  const matchData = JSON.parse(sessionStorage.getItem("matchData"));
  const playerTwo = matchData.playersData.find(player => player.isPlayerOne !== isPlayerOne);
  limpiarTablero();

  local.innerText = nombreJugador1;
  nombreJugador2 = playerTwo.name;
  adversario.innerText = nombreJugador2;
  for(let card of data.mazo) {
    const c = generateCard(card.valor, card.palo, false);
    mazo.push({ valor: card.valor, palo: card.palo, id: c.id });
    jugador.appendChild(c);
  }
  for(let card of data.mazoOponente) {
    const c = generateCard(card.valor, card.palo, true);
    oponente.appendChild(c);
  }
  for(let card of data.descarte) {
    const c = generateCard(card.valor, card.palo, false);
    descarte.appendChild(c);
  }

  if(!data.turno && isPlayerOne || data.turno && !isPlayerOne) {
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
  const myData = data.playersData.find(player => player.id === socket.id);
  const otherData = data.playersData.find(player => player.id !== socket.id);
  console.log("Datos recibidos", myData);
  local.innerText = myData.name;
  nombreJugador2 = otherData.name;
  adversario.innerText = nombreJugador2;
  isPlayerOne = myData.isPlayerOne;
  console.log(isPlayerOne ? "Soy jugador 1" : "Soy jugador 2");
  limpiarTablero();
  puntaje1.innerText = 0;
  puntaje2.innerText = 0;
  sessionStorage.setItem("matchData", JSON.stringify(data));
  sessionStorage.setItem("isPlayerOne", isPlayerOne);
  sessionStorage.setItem("gameID", data.gameID);
});

socket.on("round-start", () => {
  limpiarTablero();
  corta = false;
  turno = null;
})

socket.on("nuevo-turno", bool => {
  if((!bool && isPlayerOne) || (bool && !isPlayerOne)) {
    userTurn()
  } else {
    opponentTurn();
  }
})

function userTurn() {
  turno = true;
  tomoCarta = JSON.parse(sessionStorage.getItem("tomoCarta")) || false;
  console.log("tomoCarta es", tomoCarta);
  descartoCarta = false;
  displayTurnoActual(nombreJugador1);
}

function opponentTurn() {
  turno = false;
  displayTurnoActual(nombreJugador2);
}

function displayTurnoActual(nombre) {
  const color = nombre === nombreJugador1 ? "blue" : "red";
  turnoActual.innerText = nombre;
  turnoActual.style.color = color;
}

socket.on("recibe-carta", ({receptor, card}) => {
  const isUserCard = (!receptor && isPlayerOne) || (receptor && !isPlayerOne)
  const carta = generateCard(card.valor, card.palo, !isUserCard);
  if(isUserCard) {
    mazo.push({ valor: card.valor, palo: card.palo, id: carta.id});
    jugador.appendChild(carta);
  } else {
    oponente.appendChild(carta);
  }
});

// socket.on("oponente-recibe", ({ valor, palo }) => {
//   oponente.appendChild(generateCard(valor, palo, true));
// });

// socket.on("descarta", ({ valor, palo }, index = -1, jugadorCorta) => {
//   corta = jugadorCorta;
//   const carta = generateCard(valor, palo, corta);
//   carta.removeAttribute("draggable");
//   descarte.appendChild(carta);
//   if (index >= 0) {
//     oponente.removeChild(oponente.childNodes[index]);
//   }
// });


// Oponente descarta una carta
socket.on("descarte", ({ valor, palo }) =>  {
  const carta = generateCard(valor, palo, false);
  carta.removeAttribute("draggable");
  descarte.appendChild(carta);
  oponente.removeChild(oponente.firstChild);
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

socket.on("finaliza-ronda", (puntajes) => {
  console.log("Finaliza la ronda");
  puntajes.forEach(puntaje => {
    if(puntaje.id === socket.id) {
      puntaje1.innerText = Number(puntaje1.innerText) + puntaje.puntaje;
    } else {
      puntaje2.innerText = Number(puntaje2.innerText) + puntaje.puntaje;
    }
  })
  turno = false;
})

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
  jugador.innerHTML = "";
  oponente.innerHTML = "";
  mazo = [];
  descarte.innerHTML = "";
}

function generateCard(valor, palo, hidden = false) {
  const card = document.createElement("div");
  card.classList.add("carta");
  card.draggable = "true";
  card.id = createCardId();
  if (hidden) {
    card.classList.add("oponente");
    if(corta) card.classList.add("corte");
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

jugador.addEventListener("dragover", dragOver);
jugador.addEventListener("touchmove", dragOver);

// Recalcula la baraja del jugador cuando se mueven las cartas de lugar
function recalculateDeck() {
  let newDeck = [];
  Array.from(jugador.children).forEach(children => {
    const id = children.id;
    const index = getElementIndex(children);
    const card = mazo.find(card => card.id === id);
    newDeck[index] = card;
  })
  mazo = newDeck;
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
    jugador.appendChild(draggable);
  } else {
    jugador.insertBefore(draggable, afterElement);
  }
}

function getDragAfterElement(x) {
  const elements = [...jugador.querySelectorAll(".carta:not(.dragging)")];
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
  return mazo.find(card => card.id === id);
}

function descartar(carta) {
  let c = getCardFromElementId(carta.id);
  let i = mazo.indexOf(c);
  console.log("elemento carta", c);
  mazo.splice(i, 1);
  descarte.appendChild(carta);
  socket.emit("descarta", isPlayerOne, {valor: c.valor, palo: c.palo});
}

function puedeDescartar() {
  return mazo.length >= 7 && turno && tomoCarta;
}

function puedeTomarCarta() {
  return !tomoCarta && turno;
}

function finalizaTurno() {
  return tomoCarta && descartoCarta;
}

function getElementIndex(element) {
  return Array.from(jugador.children).indexOf(element);
}

botonCortar.addEventListener("click", e => {
  corta = true;
})

jugador.addEventListener("click", (e) => {
  if (e.target.classList.contains("carta") && puedeDescartar()) {
    descartar(e.target);
    descartoCarta = true;
    if (finalizaTurno() && !corta) {
      turno = false;
      updateCurrentTurnData(false);
      socket.emit("finaliza-turno");
    }
  }
});

resto.addEventListener("click", (e) => {
  if (puedeTomarCarta()) {
    socket.emit("toma-carta", isPlayerOne);
    updateCurrentTurnData(true);
  } else {
    console.log("No puede tomar carta");
  }
});

descarte.addEventListener("click", (e) => {
  if (puedeTomarCarta()) {
    socket.emit("toma-descarte", isPlayerOne);
    updateCurrentTurnData(true);
  }
});

function updateCurrentTurnData(bool) {
  tomoCarta = bool;
  sessionStorage.setItem("tomoCarta", tomoCarta);
  if(bool) console.log("Jugador tomo carta");
}
