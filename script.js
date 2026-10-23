import { playMySillyBoy } from "./music.js";

// Change this to whatever secret code you want Samreen to use
const SECRET_CODE = "helmanbaba";

const QUOTES = [
  {
    text: "In all the world, there is no heart for me like yours. In all the world, there is no love for you like mine.",
    author: "Maya Angelou",
  },
  {
    text: "I love you not only for what you are, but for what I am when I am with you.",
    author: "Elizabeth Barrett Browning",
  },
  {
    text: "You are my today and all of my tomorrows.",
    author: "Leo Christopher",
  },
  {
    text: "I saw that you were perfect, and so I loved you. Then I saw that you were not perfect and I loved you even more.",
    author: "Angelita Lim",
  },
  {
    text: "Whatever our souls are made of, his and mine are the same.",
    author: "Emily Brontë",
  },
  {
    text: "I would rather share one lifetime with you than face all the ages of this world alone.",
    author: "J.R.R. Tolkien",
  },
  {
    text: "You don't love someone because they're perfect. You love them in spite of the fact that they're not.",
    author: "Jodi Picoult",
  },
  {
    text: "Every love story is beautiful, but ours is my favorite.",
    author: "Unknown",
  },
];

const gate = document.getElementById("gate");
const gateForm = document.getElementById("gateForm");
const secretInput = document.getElementById("secretCode");
const gateError = document.getElementById("gateError");
const app = document.getElementById("app");

const openHeart = document.getElementById("openHeart");
const quotesSection = document.getElementById("quotes");
const letterSection = document.getElementById("letter");
const kidsSection = document.getElementById("kids");
const quoteEl = document.getElementById("quoteText");
const quoteP = quoteEl.querySelector("p");
const quoteCite = quoteEl.querySelector("cite");
const dotsEl = document.getElementById("dots");
const prevBtn = document.getElementById("prevQuote");
const nextBtn = document.getElementById("nextQuote");
const wishOverlay = document.getElementById("wishOverlay");

let index = 0;
let autoTimer = null;
let opened = false;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function normalizeCode(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function unlockApp() {
  gate.classList.add("is-leaving");
  document.body.classList.remove("is-locked");
  app.hidden = false;

  window.setTimeout(() => {
    gate.hidden = true;
    secretInput.blur();
  }, reduceMotion ? 0 : 700);

  // Restart title reveal animations after unlock
  document.querySelectorAll(".reveal").forEach((el) => {
    el.style.animation = "none";
    // force reflow
    void el.offsetWidth;
    el.style.animation = "";
  });
}

function handleGateSubmit(event) {
  event.preventDefault();

  const entered = normalizeCode(secretInput.value);
  const expected = normalizeCode(SECRET_CODE);

  if (entered === expected) {
    gateError.hidden = true;
    secretInput.classList.remove("is-wrong");
    unlockApp();
    return;
  }

  gateError.hidden = false;
  secretInput.classList.add("is-wrong");
  secretInput.select();

  window.setTimeout(() => {
    secretInput.classList.remove("is-wrong");
  }, 450);
}

function renderDots() {
  dotsEl.innerHTML = QUOTES.map(
    (_, i) => `<span class="dot${i === index ? " is-active" : ""}"></span>`
  ).join("");
}

function showQuote(nextIndex) {
  quoteEl.classList.add("is-fading");

  window.setTimeout(() => {
    index = (nextIndex + QUOTES.length) % QUOTES.length;
    const q = QUOTES[index];
    quoteP.textContent = `“${q.text}”`;
    quoteCite.textContent = `— ${q.author}`;
    renderDots();
    quoteEl.classList.remove("is-fading");
  }, 280);
}

function startAutoRotate() {
  stopAutoRotate();
  if (reduceMotion) return;
  autoTimer = window.setInterval(() => showQuote(index + 1), 5500);
}

function stopAutoRotate() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

function showWish() {
  wishOverlay.hidden = false;
  requestAnimationFrame(() => {
    wishOverlay.classList.add("is-visible");
  });

  window.setTimeout(() => {
    wishOverlay.classList.remove("is-visible");
    window.setTimeout(() => {
      wishOverlay.hidden = true;
    }, 700);
  }, 4200);
}

function revealContent() {
  if (opened) return;
  opened = true;

  playMySillyBoy();
  if (typeof window.blastRosePetals === "function") {
    window.blastRosePetals({ x: 0, y: -0.5, z: 0.8 });
    window.setTimeout(() => window.blastRosePetals({ x: 0, y: -0.2, z: 0.4 }), 280);
  }

  showWish();

  quotesSection.hidden = false;
  letterSection.hidden = false;
  kidsSection.hidden = false;

  requestAnimationFrame(() => {
    quotesSection.classList.add("is-visible");
    letterSection.classList.add("is-visible");
    kidsSection.classList.add("is-visible");
  });

  showQuote(0);
  startAutoRotate();

  window.setTimeout(() => {
    quotesSection.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, 1800);

  openHeart.setAttribute("aria-expanded", "true");
  openHeart.textContent = "Happy Birthday, Samreen";
  openHeart.disabled = true;
}

gateForm.addEventListener("submit", handleGateSubmit);

secretInput.addEventListener("input", () => {
  if (!gateError.hidden) gateError.hidden = true;
});

openHeart.addEventListener("click", revealContent);

prevBtn.addEventListener("click", () => {
  showQuote(index - 1);
  startAutoRotate();
});

nextBtn.addEventListener("click", () => {
  showQuote(index + 1);
  startAutoRotate();
});

// Always ask for the secret code on open so the birthday wish can play again
sessionStorage.removeItem("birthdayUnlocked");
window.setTimeout(() => secretInput.focus(), 100);
