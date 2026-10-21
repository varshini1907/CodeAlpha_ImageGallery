"use strict";


const originalImages = [
  ["Into the Wild", "Nature", "photo-1441974231531-c6227db76b6e"],
  ["Ocean Dreams", "Ocean", "photo-1507525428034-b723cf961d3e"],
  ["Quiet Architecture", "Architecture", "photo-1487958449943-2429e8be8625"],
  ["Blooming Poetry", "Flowers", "photo-1490750967868-88aa4486c946"],
  ["Mountain Silence", "Nature", "photo-1464822759023-fed622ff2c3b"],
  ["Blue Horizon", "Ocean", "photo-1518837695005-2083093ee35b"],
  ["Modern Lines", "Architecture", "photo-1511818966892-d7d671e672a2"],
  ["Spring Whisper", "Flowers", "photo-1457089328109-e5d9bd499191"],
  ["Golden Wilderness", "Nature", "photo-1470770841072-f978cf4d019e"],
  ["Endless Waves", "Ocean", "photo-1475924156734-496f6cac6ec1"],
  ["City Geometry", "Architecture", "photo-1518005020951-eccb494ad742"],
  ["Petal Stories", "Flowers", "photo-1468327768560-75b778cbb551"]
];

const images = originalImages.map((item, index) => ({
  id: `original-${index}`,
  title: item[0],
  category: item[1],
  url: `https://images.unsplash.com/${item[2]}?auto=format&fit=crop&w=800&q=85`,
  original: `https://images.unsplash.com/${item[2]}?auto=format&w=2000&q=90`,
  uploaded: false,
  added: index
}));

// ==========================================
// STATE
// ==========================================

let visibleImages = [];
let activeCategory = "All";
let searchTerm = "";
let currentIndex = 0;
let currentLayout = "masonry";

let page = 1;
let loading = false;
let hasMore = true;

const PAGE_SIZE = 30;

let saved = new Set();

try {
  saved = new Set(
    JSON.parse(sessionStorage.getItem("lumiereSaved") || "[]")
  );
} catch {
  saved = new Set();
}

const gallery = document.getElementById("gallery");
const lightbox = document.getElementById("lightbox");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const status = document.getElementById("uploadStatus");

const heights = [470, 340, 410, 520, 370, 450, 390];

// ==========================================
// INFINITE PHOTOGRAPH API
// ==========================================

const loader = document.createElement("div");

loader.id = "infiniteLoader";
loader.style.cssText = `
  text-align:center;
  padding:35px 15px;
  color:var(--muted);
  font-size:13px;
  letter-spacing:1px;
`;

gallery.after(loader);

function updateLoader(message) {
  loader.textContent = message;
}

async function loadMorePhotos() {

  if (loading || !hasMore) return;

  loading = true;
  updateLoader("✦ Discovering more moments...");

  try {

    const response = await fetch(
      `https://picsum.photos/v2/list?page=${page}&limit=${PAGE_SIZE}`
    );

    if (!response.ok) {
      throw new Error("Unable to load photographs");
    }

    const data = await response.json();

    if (!data.length) {
      hasMore = false;
      updateLoader("✦ You've reached the end of the collection.");
      return;
    }

    const existingIds = new Set(images.map(img => img.id));

    const newPhotos = data
      .filter(photo => !existingIds.has(`picsum-${photo.id}`))
      .map((photo, index) => ({

        id: `picsum-${photo.id}`,

        title: `Frame ${photo.id}`,

        category: "Discover",

        author: photo.author,

        url: `https://picsum.photos/id/${photo.id}/800/1000`,

        original: photo.url,

        uploaded: false,

        added: images.length + index

      }));

    images.push(...newPhotos);

    page++;

    if (data.length < PAGE_SIZE) {
      hasMore = false;
    }

    applyFilters();

    updateLoader(
      hasMore
        ? "✦ Scroll to discover more"
        : "✦ End of the collection"
    );

  } catch (error) {

    console.error(error);

    updateLoader("");

    const retry = document.createElement("button");

    retry.textContent = "Couldn't load photos — Retry ↻";
    retry.className = "primary-btn";

    retry.addEventListener("click", loadMorePhotos);

    loader.appendChild(retry);

  } finally {

    loading = false;

  }
}

// ==========================================
// INFINITE SCROLL OBSERVER
// ==========================================

const observer = new IntersectionObserver(
  entries => {

    if (
      entries[0].isIntersecting &&
      activeCategory === "All" &&
      !searchTerm &&
      !loading &&
      hasMore &&
      !loader.querySelector("button")
    ) {
      loadMorePhotos();
    }

  },
  {
    rootMargin: "900px 0px",
    threshold: 0
  }
);

observer.observe(loader);

// ==========================================
// FILTERING + SORTING
// ==========================================

function applyFilters() {

  let result = [...images];

  if (activeCategory === "Saved") {

    result = result.filter(img => saved.has(img.id));

  } else if (activeCategory !== "All") {

    result = result.filter(
      img => img.category === activeCategory
    );

  }

  if (searchTerm) {

    result = result.filter(img =>
      img.title.toLowerCase().includes(searchTerm) ||
      img.category.toLowerCase().includes(searchTerm) ||
      (img.author || "").toLowerCase().includes(searchTerm)
    );

  }

  switch (sortSelect.value) {

    case "az":
      result.sort((a, b) =>
        a.title.localeCompare(b.title)
      );
      break;

    case "za":
      result.sort((a, b) =>
        b.title.localeCompare(a.title)
      );
      break;

    case "category":
      result.sort((a, b) =>
        a.category.localeCompare(b.category)
      );
      break;

    case "newest":
      result.sort((a, b) => b.added - a.added);
      break;

  }

  visibleImages = result;

  renderGallery();

  loader.hidden =
    activeCategory !== "All" || Boolean(searchTerm);

}

// ==========================================
// RENDER GALLERY
// ==========================================

function renderGallery() {

  gallery.innerHTML = "";

  const fragment = document.createDocumentFragment();

  visibleImages.forEach((photo, index) => {

    const card = document.createElement("article");

    card.className = "photo-card";

    const imageButton = document.createElement("button");

    imageButton.className = "photo-image";
    imageButton.type = "button";

    imageButton.setAttribute(
      "aria-label",
      `View ${photo.title}`
    );

    imageButton.style.height =
      `${heights[index % heights.length]}px`;

    const img = document.createElement("img");

    img.src = photo.url;
    img.alt = photo.title;
    img.loading = "lazy";
    img.decoding = "async";

    img.addEventListener("load", () => {
      img.classList.add("loaded");
    });

    if (img.complete && img.naturalWidth) {
      img.classList.add("loaded");
    }

    imageButton.appendChild(img);

    imageButton.addEventListener("click", () => {
      openLightbox(index);
    });

    // PHOTO INFORMATION

    const overlay = document.createElement("div");

    overlay.className = "photo-overlay";

    const title = document.createElement("h3");
    title.textContent = photo.title;

    const category = document.createElement("p");

    category.textContent = photo.author
      ? `PHOTOGRAPHY BY ${photo.author.toUpperCase()}`
      : photo.category.toUpperCase();

    overlay.append(title, category);

    // FAVOURITES

    const favorite = document.createElement("button");

    favorite.className = saved.has(photo.id)
      ? "favorite saved"
      : "favorite";

    favorite.textContent = saved.has(photo.id) ? "♥" : "♡";

    favorite.type = "button";

    favorite.setAttribute(
      "aria-label",
      saved.has(photo.id)
        ? `Remove ${photo.title} from saved`
        : `Save ${photo.title}`
    );

    favorite.setAttribute(
      "aria-pressed",
      String(saved.has(photo.id))
    );

    favorite.addEventListener("click", () => {
      toggleFavorite(photo.id);
    });

    card.append(imageButton, overlay, favorite);

    fragment.appendChild(card);

  });

  gallery.appendChild(fragment);

  document.getElementById("resultCount").textContent =
    `${visibleImages.length} PHOTOGRAPHS`;

  document.getElementById("totalCount").textContent =
    images.length;

  document.getElementById("savedCount").textContent =
    saved.size;

  document.getElementById("emptyState").hidden =
    visibleImages.length > 0 ||
    (activeCategory === "All" && loading);

}

// ==========================================
// CATEGORY BUTTONS
// ==========================================

document.querySelectorAll(".filter").forEach(button => {

  button.addEventListener("click", () => {

    document.querySelectorAll(".filter").forEach(btn => {

      btn.classList.remove("active");

      btn.setAttribute("aria-pressed", "false");

    });

    button.classList.add("active");

    button.setAttribute("aria-pressed", "true");

    activeCategory = button.dataset.category;

    applyFilters();

  });

});

// ==========================================
// SEARCH
// ==========================================

searchInput.addEventListener("input", e => {

  searchTerm = e.target.value.trim().toLowerCase();

  applyFilters();

});

// ==========================================
// SORT
// ==========================================

sortSelect.addEventListener("change", applyFilters);

// ==========================================
// MASONRY / GRID SWITCH
// ==========================================

const masonryBtn = document.getElementById("masonryBtn");
const gridBtn = document.getElementById("gridBtn");

function changeLayout(layout) {

  currentLayout = layout;

  gallery.classList.toggle(
    "grid-view",
    layout === "grid"
  );

  masonryBtn.classList.toggle(
    "active",
    layout === "masonry"
  );

  gridBtn.classList.toggle(
    "active",
    layout === "grid"
  );

  masonryBtn.setAttribute(
    "aria-pressed",
    String(layout === "masonry")
  );

  gridBtn.setAttribute(
    "aria-pressed",
    String(layout === "grid")
  );

}

masonryBtn.addEventListener("click", () => {
  changeLayout("masonry");
});

gridBtn.addEventListener("click", () => {
  changeLayout("grid");
});

// ==========================================
// FAVOURITES
// ==========================================

function toggleFavorite(id) {

  if (saved.has(id)) {
    saved.delete(id);
  } else {
    saved.add(id);
  }

  try {

    sessionStorage.setItem(
      "lumiereSaved",
      JSON.stringify([...saved])
    );

  } catch (error) {
    console.warn("Unable to save favourites", error);
  }

  applyFilters();

}

// ==========================================
// UPLOAD PERSONAL PHOTOGRAPHS
// ==========================================

const fileInput = document.getElementById("fileInput");

document.getElementById("uploadBtn")
  .addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", e => {

  const files = [...e.target.files];

  let uploaded = 0;
  let rejected = 0;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  files.forEach(file => {

    if (
      !allowedTypes.includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      rejected++;
      return;
    }

    const url = URL.createObjectURL(file);

    images.unshift({

      id: `upload-${Date.now()}-${Math.random()}`,

      title: file.name.replace(/\.[^.]+$/, ""),

      category: "Personal",

      url: url,

      original: url,

      uploaded: true,

      added: Date.now()

    });

    uploaded++;

  });

  status.textContent =
    `${uploaded} photo(s) added successfully.` +
    (rejected ? ` ${rejected} file(s) rejected.` : "");

  fileInput.value = "";

  applyFilters();

});

// ==========================================
// LIGHTBOX
// ==========================================

const lightboxImage = document.getElementById("lightboxImage");

let previousFocus = null;

function openLightbox(index) {

  currentIndex = index;

  previousFocus = document.activeElement;

  lightbox.hidden = false;

  document.body.style.overflow = "hidden";

  updateLightbox();

  document.getElementById("closeBtn").focus();

}

function updateLightbox() {

  const photo = visibleImages[currentIndex];

  if (!photo) return;

  lightboxImage.src = photo.uploaded
    ? photo.url
    : photo.url.replace("/800/1000", "/1400/1600");

  lightboxImage.alt = photo.title;

  document.getElementById("lightboxTitle").textContent =
    photo.title;

  document.getElementById("lightboxCategory").textContent =
    photo.author
      ? `Photography by ${photo.author}`
      : photo.category;

  document.getElementById("lightboxCounter").textContent =
    `${currentIndex + 1} / ${visibleImages.length}`;

  document.getElementById("originalBtn").href =
    photo.original;

}

function navigate(direction) {

  if (!visibleImages.length) return;

  currentIndex =
    (currentIndex + direction + visibleImages.length)
    % visibleImages.length;

  updateLightbox();

}

function closeLightbox() {

  lightbox.hidden = true;

  document.body.style.overflow = "";

  lightboxImage.removeAttribute("src");

  if (previousFocus && previousFocus.isConnected) {
    previousFocus.focus();
  }

}

document.getElementById("closeBtn")
  .addEventListener("click", closeLightbox);

document.getElementById("prevBtn")
  .addEventListener("click", () => navigate(-1));

document.getElementById("nextBtn")
  .addEventListener("click", () => navigate(1));

document.addEventListener("keydown", e => {

  if (lightbox.hidden) return;

  if (e.key === "Escape") closeLightbox();

  if (e.key === "ArrowRight") navigate(1);

  if (e.key === "ArrowLeft") navigate(-1);

  if (e.key === "Tab") {

    const controls = [
      ...lightbox.querySelectorAll(
        "button, a[href]"
      )
    ];

    const first = controls[0];
    const last = controls[controls.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }

  }

});

lightbox.addEventListener("click", e => {

  if (e.target === lightbox) {
    closeLightbox();
  }

});

// ==========================================
// DARK / LIGHT THEME
// ==========================================

const themeBtn = document.getElementById("themeBtn");

themeBtn.addEventListener("click", () => {

  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");

  themeBtn.textContent = isLight ? "☾" : "☀";

  themeBtn.setAttribute(
    "aria-label",
    isLight ? "Switch to dark theme" : "Switch to light theme"
  );

});

// ==========================================
// RESET FILTERS
// ==========================================

document.getElementById("resetBtn")
  .addEventListener("click", () => {

    searchInput.value = "";

    searchTerm = "";

    sortSelect.value = "default";

    document.querySelector(
      '[data-category="All"]'
    ).click();

  });

// ==========================================
// BACK TO TOP
// ==========================================

const backToTop = document.getElementById("backToTop");

window.addEventListener("scroll", () => {

  backToTop.classList.toggle(
    "visible",
    window.scrollY > 500
  );

}, { passive: true });

backToTop.addEventListener("click", () => {

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

});

// ==========================================
// INITIALISE LUMIÈRE
// ==========================================

applyFilters();

loadMorePhotos();