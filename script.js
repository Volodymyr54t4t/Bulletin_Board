class AnnouncementBoard {
  constructor() {
    this.userId = this.getUserId();
    this.announcements = this.loadAnnouncements();
    this.initEventListeners();
    this.renderAnnouncements();
  }

  getUserId() {
    let userId = localStorage.getItem("userId");
    if (!userId) {
      userId =
        "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("userId", userId);
    }
    return userId;
  }

  initEventListeners() {
    // Форма додавання оголошення
    document
      .getElementById("announcementForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.addAnnouncement();
      });

    // Пошук та фільтрація
    document.getElementById("searchInput").addEventListener("input", () => {
      this.filterAnnouncements();
    });

    document.getElementById("categoryFilter").addEventListener("change", () => {
      this.filterAnnouncements();
    });

    document.getElementById("priceFilter").addEventListener("input", () => {
      this.filterAnnouncements();
    });

    document.getElementById("locationFilter").addEventListener("input", () => {
      this.filterAnnouncements();
    });

    // Сортування
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".sort-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.currentSort = e.target.dataset.sort;
        this.filterAnnouncements();
      });
    });

    document.getElementById("imageUpload").addEventListener("change", (e) => {
      this.handleImageUpload(e);
    });

    document.getElementById("detailModal").addEventListener("click", (e) => {
      if (e.target.id === "detailModal") {
        this.closeModal();
      }
    });
  }

  handleImageUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      this.showNotification("Максимум 3 зображення!", "warning");
      return;
    }

    const imageContainer = document.querySelector(".image-upload p");
    if (files.length > 0) {
      imageContainer.innerHTML = `📷 Вибрано ${files.length} зображень`;
    } else {
      imageContainer.innerHTML =
        "📷 Перетягніть зображення або клікніть для вибору";
    }
  }

  async addAnnouncement() {
    const form = document.getElementById("announcementForm");
    const formData = new FormData(form);
    const loading = document.getElementById("submitLoading");

    // Show loading
    loading.style.display = "inline-block";

    const imageFiles = document.getElementById("imageUpload").files;
    const images = [];

    for (let file of imageFiles) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        this.showNotification(
          "Зображення занадто велике! Максимум 5MB",
          "error"
        );
        loading.style.display = "none";
        return;
      }

      const base64 = await this.fileToBase64(file);
      images.push(base64);
    }

    const announcement = {
      id: Date.now(),
      title: formData.get("title"),
      category: formData.get("category"),
      contact: formData.get("contact"),
      description: formData.get("description"),
      price: formData.get("price") || null,
      location: formData.get("location") || "",
      images: images,
      date: new Date().toLocaleDateString("uk-UA"),
      time: new Date().toLocaleTimeString("uk-UA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timestamp: Date.now(),
      rating: 0,
      ratingCount: 0,
      views: 0,
      createdBy: this.userId,
    };

    this.announcements.unshift(announcement);
    this.saveAnnouncements();
    this.renderAnnouncements();
    this.updateStats();
    form.reset();

    // Reset image upload display
    document.querySelector(".image-upload p").innerHTML =
      "📷 Перетягніть зображення або клікніть для вибору";

    loading.style.display = "none";
    this.showNotification("🎉 Оголошення успішно додано!", "success");

    // Scroll to new announcement
    setTimeout(() => {
      document.querySelector(".announcement-card").scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 500);
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  deleteAnnouncement(id) {
    const announcement = this.announcements.find((ann) => ann.id === id);
    if (!announcement) return;

    if (announcement.createdBy !== this.userId) {
      this.showNotification(
        "Ви можете видаляти тільки свої оголошення!",
        "error"
      );
      return;
    }

    if (confirm("🗑️ Ви впевнені, що хочете видалити це оголошення?")) {
      this.announcements = this.announcements.filter((ann) => ann.id !== id);
      this.saveAnnouncements();
      this.renderAnnouncements();
      this.updateStats();
      this.showNotification("🗑️ Оголошення видалено!", "info");
    }
  }

  filterAnnouncements() {
    const searchTerm = document
      .getElementById("searchInput")
      .value.toLowerCase();
    const categoryFilter = document.getElementById("categoryFilter").value;
    const priceFilter =
      parseFloat(document.getElementById("priceFilter").value) || Infinity;
    const locationFilter = document
      .getElementById("locationFilter")
      .value.toLowerCase();

    let filtered = this.announcements.filter((ann) => {
      const matchesSearch =
        !searchTerm ||
        ann.title.toLowerCase().includes(searchTerm) ||
        ann.description.toLowerCase().includes(searchTerm) ||
        ann.location.toLowerCase().includes(searchTerm);

      const matchesCategory =
        !categoryFilter || ann.category === categoryFilter;
      const matchesPrice = !ann.price || ann.price <= priceFilter;
      const matchesLocation =
        !locationFilter || ann.location.toLowerCase().includes(locationFilter);

      return (
        matchesSearch && matchesCategory && matchesPrice && matchesLocation
      );
    });

    filtered.sort((a, b) => {
      switch (this.currentSort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "price":
          return (a.price || 0) - (b.price || 0);
        case "views":
          return (b.views || 0) - (a.views || 0);
        case "date":
        default:
          return b.timestamp - a.timestamp;
      }
    });

    this.renderAnnouncements(filtered);
  }

  renderAnnouncements(announcementsToRender = this.announcements) {
    const container = document.getElementById("announcementsContainer");
    const noAnnouncementsMsg = document.getElementById("noAnnouncements");

    if (announcementsToRender.length === 0) {
      container.innerHTML = "";
      noAnnouncementsMsg.style.display = "block";
      return;
    }

    noAnnouncementsMsg.style.display = "none";

    container.innerHTML = announcementsToRender
      .map(
        (announcement, index) => `
                    <div class="announcement-card" style="animation-delay: ${
                      index * 0.1
                    }s">
                        <div class="announcement-header">
                            <div>
                                <h3 class="announcement-title">${this.escapeHtml(
                                  announcement.title
                                )}</h3>
                                <span class="announcement-category">${
                                  announcement.category
                                }</span>
                                ${
                                  announcement.price
                                    ? `<div style="margin-top: 5px; font-weight: bold; color: #2ed573;">💰 ${announcement.price} грн</div>`
                                    : ""
                                }
                            </div>
                            ${
                              /* Show delete button only for announcements created by current user */ ""
                            }
                            ${
                              announcement.createdBy === this.userId
                                ? `<button class="delete-btn" onclick="board.deleteAnnouncement(${announcement.id})" title="Видалити моє оголошення">✕</button>`
                                : `<span class="owner-indicator" title="Чуже оголошення">👤</span>`
                            }
                        </div>
                        
                        ${
                          announcement.images && announcement.images.length > 0
                            ? `
                            <img src="${announcement.images[0]}" alt="Зображення оголошення" class="announcement-image" onclick="board.openImageModal('${announcement.images[0]}')">
                        `
                            : ""
                        }
                        
                        <div class="announcement-rating">
                            ${this.renderStars(
                              announcement.rating || 0,
                              announcement.id
                            )}
                            <span style="margin-left: 10px; font-size: 0.9rem; color: #666;">
                                (${announcement.ratingCount || 0}) • 👀 ${
          announcement.views || 0
        }
                            </span>
                        </div>
                        
                        <p class="announcement-description">${this.escapeHtml(
                          announcement.description
                        )}</p>
                        
                        ${
                          announcement.location
                            ? `<p style="color: #666; font-size: 0.9rem; margin-bottom: 10px;">📍 ${this.escapeHtml(
                                announcement.location
                              )}</p>`
                            : ""
                        }
                        
                        <div class="card-actions">
                            <button class="action-btn" onclick="board.toggleFavorite(${
                              announcement.id
                            })" title="Додати в обране">
                                <span class="favorite-btn ${
                                  this.favorites.includes(announcement.id)
                                    ? "active"
                                    : ""
                                }">
                                    ${
                                      this.favorites.includes(announcement.id)
                                        ? "❤️"
                                        : "🤍"
                                    }
                                </span>
                                Обране
                            </button>
                            <button class="action-btn" onclick="board.viewDetails(${
                              announcement.id
                            })" title="Детальніше">
                                👁️ Детальніше
                            </button>
                            <button class="action-btn" onclick="board.shareAnnouncement(${
                              announcement.id
                            })" title="Поділитися">
                                📤 Поділитися
                            </button>
                            <button class="action-btn" onclick="board.contactSeller('${this.escapeHtml(
                              announcement.contact
                            )}')" title="Зв'язатися">
                                📞 Контакт
                            </button>
                        </div>
                        
                        <div class="announcement-meta">
                            <span class="announcement-contact">📞 ${this.escapeHtml(
                              announcement.contact
                            )}</span>
                            <span>${announcement.date} о ${
          announcement.time
        }</span>
                        </div>
                    </div>
                `
      )
      .join("");
  }

  renderStars(rating, announcementId) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(`
                        <span class="star ${i <= rating ? "filled" : ""}" 
                              onclick="board.rateAnnouncement(${announcementId}, ${i})"
                              title="${i} зірок">
                            ${i <= rating ? "⭐" : "☆"}
                        </span>
                    `);
    }
    return stars.join("");
  }

  rateAnnouncement(id, rating) {
    const announcement = this.announcements.find((ann) => ann.id === id);
    if (announcement) {
      const currentRating = announcement.rating || 0;
      const currentCount = announcement.ratingCount || 0;

      announcement.rating =
        (currentRating * currentCount + rating) / (currentCount + 1);
      announcement.ratingCount = currentCount + 1;

      this.saveAnnouncements();
      this.renderAnnouncements();
      this.showNotification(`⭐ Дякуємо за оцінку ${rating} зірок!`, "success");
    }
  }

  toggleFavorite(id) {
    const index = this.favorites.indexOf(id);
    if (index > -1) {
      this.favorites.splice(index, 1);
      this.showNotification("💔 Видалено з обраного", "info");
    } else {
      this.favorites.push(id);
      this.showNotification("❤️ Додано в обране!", "success");
    }
    this.saveFavorites();
    this.renderAnnouncements();
    this.updateStats();
  }

  viewDetails(id) {
    const announcement = this.announcements.find((ann) => ann.id === id);
    if (announcement) {
      // Increment view count
      announcement.views = (announcement.views || 0) + 1;
      this.viewCount++;
      this.saveAnnouncements();
      this.saveViewCount();
      this.updateStats();

      const modal = document.getElementById("detailModal");
      const content = document.getElementById("modalContent");

      content.innerHTML = `
                        <h2>${this.escapeHtml(announcement.title)}</h2>
                        <div style="margin: 15px 0;">
                            <span class="announcement-category">${
                              announcement.category
                            }</span>
                            ${
                              announcement.price
                                ? `<span style="margin-left: 10px; background: #2ed573; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">💰 ${announcement.price} грн</span>`
                                : ""
                            }
                        </div>
                        
                        ${
                          announcement.images && announcement.images.length > 0
                            ? `
                            <div style="margin: 20px 0;">
                                ${announcement.images
                                  .map(
                                    (img) => `
                                    <img src="${img}" alt="Зображення" style="width: 100%; max-width: 300px; height: 200px; object-fit: cover; border-radius: 8px; margin: 5px; cursor: pointer;" onclick="board.openImageModal('${img}')">
                                `
                                  )
                                  .join("")}
                            </div>
                        `
                            : ""
                        }
                        
                        <div style="margin: 15px 0;">
                            ${this.renderStars(
                              announcement.rating || 0,
                              announcement.id
                            )}
                            <span style="margin-left: 10px;">
                                (${
                                  announcement.ratingCount || 0
                                } оцінок) • 👀 ${
        announcement.views || 0
      } переглядів
                            </span>
                        </div>
                        
                        <p style="line-height: 1.6; margin: 20px 0;">${this.escapeHtml(
                          announcement.description
                        )}</p>
                        
                        ${
                          announcement.location
                            ? `<p><strong>📍 Місцезнаходження:</strong> ${this.escapeHtml(
                                announcement.location
                              )}</p>`
                            : ""
                        }
                        
                        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <p><strong>📞 Контакт:</strong> ${this.escapeHtml(
                              announcement.contact
                            )}</p>
                            <p><strong>📅 Опубліковано:</strong> ${
                              announcement.date
                            } о ${announcement.time}</p>
                        </div>
                        
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px;">
                            <button class="btn" onclick="board.contactSeller('${this.escapeHtml(
                              announcement.contact
                            )}')">
                                📞 Зв'язатися
                            </button>
                            <button class="btn" onclick="board.shareAnnouncement(${
                              announcement.id
                            })">
                                📤 Поділитися
                            </button>
                            <button class="btn" onclick="board.toggleFavorite(${
                              announcement.id
                            }); board.viewDetails(${announcement.id})">
                                ${
                                  this.favorites.includes(announcement.id)
                                    ? "❤️ В обраному"
                                    : "🤍 В обране"
                                }
                            </button>
                        </div>
                    `;

      modal.style.display = "block";
      this.renderAnnouncements(); // Update view count in main view
    }
  }

  openImageModal(imageSrc) {
    const modal = document.getElementById("detailModal");
    const content = document.getElementById("modalContent");

    content.innerHTML = `
                    <img src="${imageSrc}" alt="Зображення" style="width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px;">
                `;

    modal.style.display = "block";
  }

  closeModal() {
    document.getElementById("detailModal").style.display = "none";
  }

  shareAnnouncement(id) {
    const announcement = this.announcements.find((ann) => ann.id === id);
    if (announcement) {
      const shareText = `🏢 ${announcement.title}\n\n${announcement.description}\n\n📞 ${announcement.contact}`;

      if (navigator.share) {
        navigator.share({
          title: announcement.title,
          text: shareText,
          url: window.location.href,
        });
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          this.showNotification("📋 Скопійовано в буфер обміну!", "success");
        });
      }
    }
  }

  contactSeller(contact) {
    if (contact.includes("@")) {
      window.location.href = `mailto:${contact}`;
    } else {
      window.location.href = `tel:${contact}`;
    }
  }

  updateStats() {
    document.getElementById("totalCount").textContent =
      this.announcements.length;
    document.getElementById("favoriteCount").textContent =
      this.favorites.length;
    document.getElementById("viewCount").textContent = this.viewCount;
  }

  initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeButton(savedTheme);
  }

  updateThemeButton(theme) {
    const button = document.querySelector(".theme-toggle");
    button.textContent = theme === "dark" ? "☀️ Світла тема" : "🌙 Темна тема";
  }

  // Storage methods
  loadAnnouncements() {
    const saved = localStorage.getItem("announcements");
    return saved ? JSON.parse(saved) : [];
  }

  saveAnnouncements() {
    localStorage.setItem("announcements", JSON.stringify(this.announcements));
  }

  loadFavorites() {
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  }

  saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify(this.favorites));
  }

  loadViewCount() {
    return parseInt(localStorage.getItem("viewCount")) || 0;
  }

  saveViewCount() {
    localStorage.setItem("viewCount", this.viewCount.toString());
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, type = "info") {
    // Створюємо елемент повідомлення
    const notification = document.createElement("div");
    notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: ${
                      type === "success"
                        ? "#2ed573"
                        : type === "error"
                        ? "#ff4757"
                        : "#3742fa"
                    };
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    z-index: 1000;
                    font-weight: 600;
                    animation: slideIn 0.3s ease;
                `;
    notification.textContent = message;

    // Додаємо повідомлення до body
    document.body.appendChild(notification);

    // Видаляємо повідомлення через 3 секунди
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  board.updateThemeButton(newTheme);

  board.showNotification(
    `🎨 Перемкнено на ${newTheme === "dark" ? "темну" : "світлу"} тему`,
    "info"
  );
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function closeModal() {
  board.closeModal();
}

// Ініціалізуємо дошку оголошень
const board = new AnnouncementBoard();

// Додаємо тестові дані при першому завантаженні
if (board.announcements.length === 0) {
  const testAnnouncements = [
    {
      id: 1,
      title: "Продам велосипед",
      category: "Продаж",
      contact: "+380123456789",
      description:
        "Продам гірський велосипед у відмінному стані. Використовувався рідко, зберігався в гаражі.",
      date: new Date().toLocaleDateString("uk-UA"),
      time: "14:30",
      createdBy: board.userId,
    },
    {
      id: 2,
      title: "Шукаю репетитора з математики",
      category: "Послуги",
      contact: "math.help@email.com",
      description:
        "Потрібен досвідчений репетитор з математики для підготовки до ЗНО. Бажано з досвідом роботи.",
      date: new Date().toLocaleDateString("uk-UA"),
      time: "10:15",
      createdBy: "other_user_123",
    },
  ];

  board.announcements = testAnnouncements;
  board.saveAnnouncements();
  board.renderAnnouncements();
  board.updateStats();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    board.closeModal();
  }
  if (e.ctrlKey && e.key === "f") {
    e.preventDefault();
    document.getElementById("searchInput").focus();
  }
});

const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.animation = "slideInUp 0.6s ease forwards";
    }
  });
}, observerOptions);

// Observe announcement cards when they're added
const observeCards = () => {
  document.querySelectorAll(".announcement-card").forEach((card) => {
    observer.observe(card);
  });
};

// Call after initial render
setTimeout(observeCards, 100);
