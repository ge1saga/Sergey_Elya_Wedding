const splash = document.getElementById("splash");
const site = document.getElementById("site");
const splashSlider = document.getElementById("splashSlider");
const splashThumb = document.getElementById("splashThumb");
const curtains = document.getElementById("curtains");
const navBurger = document.getElementById("navBurger");
const navLinks = document.getElementById("navLinks");
const rsvpForm = document.getElementById("rsvpForm");
const successMsg = document.getElementById("successMsg");
const errorMsg = document.getElementById("errorMsg");
const submitBtn = document.getElementById("submitBtn");
const rsvpSubmitted = document.getElementById("rsvpSubmitted");
const rsvpResubmitBtn = document.getElementById("rsvpResubmitBtn");
const wishPrev = document.getElementById("wishPrev");
const wishNext = document.getElementById("wishNext");
const wishText = document.getElementById("wishText");

const RSVP_WORKER_URL = "https://wedding-rsvp.ge1saga.workers.dev";

const dayEl = document.getElementById("days");
const hourEl = document.getElementById("hours");
const minuteEl = document.getElementById("minutes");
const secondEl = document.getElementById("seconds");

const guestNameInput = document.getElementById("guestName");
const allergiesInput = document.getElementById("allergies");
const guestNameErr = document.getElementById("guestNameErr");
const attendanceErr = document.getElementById("attendanceErr");
const allergiesErr = document.getElementById("allergiesErr");
const drinksErr = document.getElementById("drinksErr");

const weddingDate = new Date("2026-09-13T15:30:00");
let isUnlocking = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function updateCountdown() {
  const now = new Date();
  const diff = weddingDate.getTime() - now.getTime();
  if (diff <= 0) {
    dayEl.textContent = "00";
    hourEl.textContent = "00";
    minuteEl.textContent = "00";
    secondEl.textContent = "00";
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  dayEl.textContent = pad(days);
  hourEl.textContent = pad(hours);
  minuteEl.textContent = pad(minutes);
  secondEl.textContent = pad(seconds);
}

async function openInvitation() {
  if (isUnlocking) return;
  isUnlocking = true;
  window.scrollTo(0, 0);
  curtains?.classList.add("is-active");
  curtains?.classList.remove("is-opening");
  curtains?.classList.add("is-closing");
  await wait(820);
  splash.classList.add("hidden");
  site.classList.add("is-ready");
  requestAnimationFrame(() => {
    const nav = document.querySelector(".nav");
    if (nav) site.style.setProperty("--nav-h", `${nav.offsetHeight}px`);
  });
  window.scrollTo(0, 0);
  curtains?.classList.remove("is-closing");
  curtains?.classList.add("is-opening");
  await wait(960);
  curtains?.classList.remove("is-opening");
  curtains?.classList.remove("is-active");
  document.body.style.overflowY = "auto";
  requestAnimationFrame(() => window.scrollTo(0, 0));
}

function setupSplash() {
  document.body.style.overflowY = "hidden";

  if (!splashSlider || !splashThumb) return;

  const track = splashSlider.querySelector(".splash-slider-track");
  let dragging = false;
  let startX = 0;
  let startLeft = 0;

  const getMaxLeft = () => track.clientWidth - splashThumb.clientWidth - 6;

  const onPointerMove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const next = Math.min(Math.max(3, startLeft + dx), getMaxLeft());
    splashThumb.style.left = `${next}px`;
  };

  const cleanupPointerEvents = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    const left = parseFloat(splashThumb.style.left || "3");
    const max = getMaxLeft();
    cleanupPointerEvents();
    const unlockThreshold = max * 0.5;
    if (left >= unlockThreshold) {
      splashThumb.style.transition = "left 0.4s ease-out";
      splashThumb.style.left = `${max}px`;
      window.setTimeout(() => {
        splashThumb.style.transition = "";
        openInvitation();
      }, 160);
      return;
    }
    splashThumb.style.transition = "left 0.4s ease-out";
    splashThumb.style.left = "3px";
    splashThumb.classList.add("animated");
    window.setTimeout(() => {
      splashThumb.style.transition = "";
    }, 230);
  };

  splashThumb.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX;
    startLeft = parseFloat(splashThumb.style.left || "3");
    splashThumb.classList.remove("animated");
    splashThumb.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });
}

function setupBurger() {
  navBurger?.addEventListener("click", () => {
    navLinks.classList.toggle("is-open");
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("is-open"));
  });

  const closeOnOutside = (e) => {
    if (!e.target.closest(".nav")) {
      navLinks.classList.remove("is-open");
    }
  };

  document.addEventListener("click", closeOnOutside);
  document.addEventListener("touchstart", closeOnOutside, { passive: true });
}

function setupNavScroll() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      const isMobile = window.matchMedia("(max-width: 600px)").matches;
      const navHeight = document.querySelector(".nav")?.offsetHeight || 0;
      let extra = 0;

      if (isMobile) {
        extra = -30;
      } else {
        const id = href.slice(1);
        if (id === "location" || id === "rsvp") {
          extra = -90;
        }
      }

      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - extra;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
}

function applyFollowupQuestionsVisible(isAttending) {
  document.querySelectorAll("[data-rsvp-followup]").forEach((el) => {
    if (isAttending) {
      el.hidden = false;
      if (allergiesInput) allergiesInput.required = true;
    } else {
      el.hidden = true;
      if (allergiesInput) allergiesInput.required = false;
    }
  });

  if (!isAttending) {
    if (allergiesErr) allergiesErr.textContent = "";
    if (drinksErr) drinksErr.textContent = "";
    if (allergiesInput) allergiesInput.value = "";
    rsvpForm?.querySelectorAll('input[name="drinks"]').forEach((chk) => {
      chk.checked = false;
      chk.disabled = false;
    });
    const extra = document.getElementById("extraInfo");
    if (extra) extra.value = "";
    syncDrinkNoneExclusive();
  }
}

function getAttendanceValue() {
  const checked = rsvpForm?.querySelector('input[name="attendance"]:checked');
  return checked?.value ?? null;
}

function setupRsvpFollowup() {
  document.querySelectorAll('input[name="attendance"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      applyFollowupQuestionsVisible(radio.value === "yes");
    });
  });

  const initial = getAttendanceValue();
  applyFollowupQuestionsVisible(initial === "yes" || initial === null);
}

function syncDrinkNoneExclusive() {
  const noneInput = document.getElementById("drinkNone");
  if (!rsvpForm || !noneInput) return;

  const drinkInputs = rsvpForm.querySelectorAll('input[name="drinks"]');

  if (noneInput.checked) {
    drinkInputs.forEach((input) => {
      const isNone = input === noneInput || input.value === "none";
      if (!isNone) {
        input.checked = false;
        input.disabled = true;
      } else {
        input.disabled = false;
      }
    });
    return;
  }

  drinkInputs.forEach((input) => {
    input.disabled = false;
  });

  updateWineSubtypeState();
}

function updateWineSubtypeState() {
  const whiteWine = document.querySelector('input[name="drinks"][value="white-wine"]');
  const redWine = document.querySelector('input[name="drinks"][value="red-wine"]');
  const noneInput = document.getElementById("drinkNone");

  document.querySelectorAll('.wine-sub input[name="drinks"]').forEach((input) => {
    const val = input.value;
    const isWhiteSub = val === "dry-white" || val === "semi-white";
    const parent = isWhiteSub ? whiteWine : redWine;

    if (noneInput?.checked) {
      input.disabled = true;
      input.checked = false;
    } else if (parent?.checked) {
      input.disabled = false;
    } else {
      input.disabled = true;
      input.checked = false;
    }
  });
}

function setupDrinkNoneAlert() {
  const grid = document.querySelector(".rsvp-drinks-grid");
  if (!grid) return;

  grid.addEventListener("click", (e) => {
    const noneInput = document.getElementById("drinkNone");
    if (!noneInput?.checked) return;

    const label = e.target.closest(".rsvp-check-option");
    if (!label) return;

    const input = label.querySelector('input[name="drinks"]');
    if (!input || !input.disabled) return;
    if (input === noneInput) return;

    const noneLabel = noneInput.closest(".rsvp-check-option");
    if (!noneLabel) return;

    noneLabel.classList.remove("none-alert");
    void noneLabel.offsetWidth;
    noneLabel.classList.add("none-alert");
    setTimeout(() => noneLabel.classList.remove("none-alert"), 500);
  });
}

function setupWineSubtypes() {
  const whiteWine = document.querySelector('input[name="drinks"][value="white-wine"]');
  const redWine = document.querySelector('input[name="drinks"][value="red-wine"]');

  document.querySelectorAll(".wine-sub").forEach((label) => {
    label.addEventListener("click", (e) => {
      const input = label.querySelector('input[name="drinks"]');
      if (!input || !input.disabled) return;

      const noneInput = document.getElementById("drinkNone");
      if (noneInput?.checked) return;

      e.preventDefault();

      const val = input.value;
      const isWhiteSub = val === "dry-white" || val === "semi-white";
      const parent = isWhiteSub ? whiteWine : redWine;

      if (parent) {
        parent.checked = true;
        updateWineSubtypeState();
        input.disabled = false;
        input.checked = true;
      }
    });
  });

  [whiteWine, redWine].forEach((parent) => {
    if (!parent) return;
    parent.addEventListener("change", updateWineSubtypeState);
  });

  updateWineSubtypeState();
}

function setupDrinkNoneExclusive() {
  const noneInput = document.getElementById("drinkNone");
  if (!rsvpForm || !noneInput) return;

  rsvpForm.querySelectorAll('input[name="drinks"]').forEach((input) => {
    input.addEventListener("change", syncDrinkNoneExclusive);
  });

  syncDrinkNoneExclusive();
}

function validateForm() {
  let isValid = true;
  if (guestNameErr) guestNameErr.textContent = "";
  if (attendanceErr) attendanceErr.textContent = "";
  if (allergiesErr) allergiesErr.textContent = "";
  if (drinksErr) drinksErr.textContent = "";

  if (!guestNameInput?.value.trim()) {
    if (guestNameErr) guestNameErr.textContent = "Укажите имя и фамилию";
    isValid = false;
  }

  const attendance = rsvpForm.querySelector('input[name="attendance"]:checked');
  if (!attendance) {
    if (attendanceErr) attendanceErr.textContent = "Выберите вариант";
    isValid = false;
  }

  if (attendance?.value === "yes") {
    if (!allergiesInput?.value.trim()) {
      if (allergiesErr) allergiesErr.textContent = "Пожалуйста, напишите ответ";
      isValid = false;
    }

    const checkedDrinks = rsvpForm.querySelectorAll('input[name="drinks"]:checked');
    if (checkedDrinks.length === 0) {
      if (drinksErr) drinksErr.textContent = "Выберите хотя бы один вариант";
      isValid = false;
    }
  }

  return isValid;
}

function getFormData() {
  const fd = new FormData(rsvpForm);
  const entries = Object.fromEntries(fd.entries());
  entries.drinks = fd.getAll("drinks");
  entries.submitted_at = new Date().toISOString();
  return entries;
}

function setupForm() {
  let noticeTimer = null;
  const showNotice = (el) => {
    if (!el) return;
    if (noticeTimer) window.clearTimeout(noticeTimer);
    successMsg?.classList.remove("is-visible");
    errorMsg?.classList.remove("is-visible");
    el.classList.add("is-visible");
    noticeTimer = window.setTimeout(() => {
      el.classList.remove("is-visible");
    }, 3000);
  };

  rsvpForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      showNotice(errorMsg);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Отправляем...";

    const payload = getFormData();

    try {
      const res = await fetch(RSVP_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("RSVP send error:", text);
        showNotice(errorMsg);
        submitBtn.disabled = false;
        submitBtn.textContent = "ОТПРАВИТЬ";
        return;
      }
    } catch (err) {
      console.error("RSVP network error:", err);
      showNotice(errorMsg);
      submitBtn.disabled = false;
      submitBtn.textContent = "ОТПРАВИТЬ";
      return;
    }

    rsvpForm.reset();
    syncDrinkNoneExclusive();
    applyFollowupQuestionsVisible(true);
    submitBtn.disabled = false;
    submitBtn.textContent = "ОТПРАВИТЬ";
    showNotice(successMsg);
    rsvpForm.hidden = true;
    rsvpSubmitted.hidden = false;
  });

  rsvpResubmitBtn?.addEventListener("click", () => {
    rsvpSubmitted.hidden = true;
    rsvpForm.hidden = false;
    rsvpForm.reset();
    syncDrinkNoneExclusive();
    applyFollowupQuestionsVisible(true);
  });
}

function setupReveal() {
  const targets = document.querySelectorAll(".reveal-up, .reveal-left, .reveal-right");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = entry.target.dataset.delay || "0";
        entry.target.style.transitionDelay = `${delay}ms`;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
}

function setupScrollState() {
  const mobileConfirm = document.querySelector(".mobile-confirm");
  if (!mobileConfirm) return;

  const rsvpSection = document.getElementById("rsvp");
  if (!rsvpSection) return;

  function updateVisibility() {
    const scrollY = window.scrollY;
    const rsvpTop = rsvpSection.offsetTop;
    const vh = window.innerHeight;

    mobileConfirm.classList.toggle("is-visible", scrollY + vh * 0.3 < rsvpTop);
  }

  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updateVisibility);
  updateVisibility();
}

function setupWishes() {
  if (!wishPrev || !wishNext || !wishText) return;

  const wishes = [
    "Ваши улыбки и смех подарят нам незабываемое счастье в этот день, а пожелания в конвертах помогут осуществить наши мечты!",
    "Воздержитесь от различных хлопушек, конфети, открытого огня на территории ресторана и парковой зоны - это требование площадки.",
    "Не дарите нам цветы! Мы не успеем насладиться их красотой и ароматом.",
    "Пожалуйста, не выкрикивайте «Горько», ведь настоящий поцелуй рождается только от собственных чувств.",
  ];

  let currentIndex = 0;
  let isAnimating = false;

  const showWish = (nextIndex) => {
    if (isAnimating) return;
    isAnimating = true;
    wishText.classList.add("is-changing");

    window.setTimeout(() => {
      currentIndex = (nextIndex + wishes.length) % wishes.length;
      wishText.textContent = wishes[currentIndex];
      wishText.classList.remove("is-changing");
      window.setTimeout(() => {
        isAnimating = false;
      }, 220);
    }, 220);
  };

  wishPrev.addEventListener("click", () => showWish(currentIndex - 1));
  wishNext.addEventListener("click", () => showWish(currentIndex + 1));

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  const onTouchStart = (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwiping = true;
  };

  const onTouchEnd = (event) => {
    if (!isSwiping) return;
    isSwiping = false;
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) < 38 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX < 0) {
      showWish(currentIndex + 1);
    } else {
      showWish(currentIndex - 1);
    }
  };

  wishText.addEventListener("touchstart", onTouchStart, { passive: true });
  wishText.addEventListener("touchend", onTouchEnd, { passive: true });
}

function setupProgramMobileCaptions() {
  const mobileImg = document.querySelector(".program-mobile");
  const captions = document.querySelector(".program-captions");
  if (!mobileImg || !captions) return;

  const apply = () => {
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    if (!isMobile) {
      captions.style.height = "";
      return;
    }

    const width = mobileImg.clientWidth;
    const nw = mobileImg.naturalWidth;
    const nh = mobileImg.naturalHeight;

    // Prefer natural size ratio (stable even during transforms)
    let height = 0;
    if (width > 0 && nw > 0 && nh > 0) {
      height = Math.round((width * nh) / nw);
    } else {
      const rect = mobileImg.getBoundingClientRect();
      height = Math.round(rect.height);
    }

    // if (height < 80) return;
    // captions.style.height = `${height}px`;
  };

  const applySoon = () => requestAnimationFrame(() => requestAnimationFrame(apply));

  if (mobileImg.complete) applySoon();
  mobileImg.addEventListener("load", applySoon);
  window.addEventListener("resize", applySoon);
  applySoon();
}

function setupNavHeight() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  function update() {
    site.style.setProperty("--nav-h", `${nav.offsetHeight}px`);
  }
  update();
  window.addEventListener("resize", update);
}

setupNavHeight();
setupSplash();
setupBurger();
setupNavScroll();
setupForm();
setupRsvpFollowup();
setupDrinkNoneExclusive();
setupDrinkNoneAlert();
setupWineSubtypes();
setupReveal();
setupScrollState();
setupProgramMobileCaptions();
setupWishes();
updateCountdown();
setInterval(updateCountdown, 1000);
