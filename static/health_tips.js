/**
 * Health Tips Page JavaScript
 * Provides functionality for the health tips section
 */

document.addEventListener('DOMContentLoaded', function() {
  // Image error handling
  handleImageLoading();
  
  // Initialize functionality
  setupCategoryFilters();
  setupLikeButtons();
  setupBookmarkButtons();
  setupSearchFunctionality();
  setupTipRotation();
  setupNewsletterForm();
  setupPagination();
  setupSharingButtons();
  
  // Create icons for categories that don't have images yet
  createIconPlaceholders();
  
  // Apply styles to match the design
  styleToMatchDesign();
});

// Handle image loading and errors
function handleImageLoading() {
  const images = document.querySelectorAll('.tip-image');
  
  images.forEach(img => {
    // Handle image loading errors
    img.onerror = function() {
      console.log('Image failed to load:', img.src);
      
      // Add error class
      this.classList.add('broken');
      this.style.display = 'none';
      
      // Fallback already exists in HTML, make sure it's visible
      const fallback = this.parentNode.querySelector('.img-fallback');
      if (fallback) {
        fallback.style.display = 'flex';
      }
    };
    
    // Improve image loading
    if (img.complete) {
      // Image already loaded (might be cached)
      if (img.naturalHeight === 0) {
        img.onerror();
      } else {
        // Image loaded successfully, hide the fallback
        const fallback = img.parentNode.querySelector('.img-fallback');
        if (fallback) {
          fallback.style.display = 'none';
        }
      }
    } else {
      // Set load event to hide fallback if image loads successfully
      img.onload = function() {
        const fallback = this.parentNode.querySelector('.img-fallback');
        if (fallback) {
          fallback.style.display = 'none';
        }
      };
    }
  });
  
  // Handle author avatars
  const authorAvatars = document.querySelectorAll('.author-avatar');
  authorAvatars.forEach(img => {
    img.onerror = function() {
      this.classList.add('broken');
      this.style.display = 'none';
      
      // Make sure the fallback is visible
      const fallback = this.parentNode.querySelector('.author-fallback');
      if (fallback) {
        fallback.style.display = 'inline-flex';
      }
    };
    
    // Improve image loading
    if (img.complete) {
      if (img.naturalHeight === 0) {
        img.onerror();
      } else {
        // Image loaded successfully, hide the fallback
        const fallback = img.parentNode.querySelector('.author-fallback');
        if (fallback) {
          fallback.style.display = 'none';
        }
      }
    } else {
      // Set load event to hide fallback if image loads successfully
      img.onload = function() {
        const fallback = this.parentNode.querySelector('.author-fallback');
        if (fallback) {
          fallback.style.display = 'none';
        }
      };
    }
  });
}

// Create icon placeholders for categories without images
function createIconPlaceholders() {
  // Initially hide all fallbacks
  document.querySelectorAll('.img-fallback').forEach(fallback => {
    if (!fallback.classList.contains('author-fallback')) {
      fallback.style.display = 'none';
    }
  });
  
  document.querySelectorAll('.author-fallback').forEach(fallback => {
    fallback.style.display = 'none';
  });

  // Show fallbacks for broken images
  document.querySelectorAll('.tip-header').forEach(header => {
    const img = header.querySelector('.tip-image');
    if (!img || img.classList.contains('broken') || img.naturalHeight === 0 || !img.complete) {
      const fallback = header.querySelector('.img-fallback');
      if (fallback) {
        fallback.style.display = 'flex';
        if (img) img.style.display = 'none';
      }
    }
  });
  
  // Show fallbacks for broken author avatars
  document.querySelectorAll('.tip-author').forEach(authorDiv => {
    const img = authorDiv.querySelector('.author-avatar');
    if (!img || img.classList.contains('broken') || img.naturalHeight === 0 || !img.complete) {
      const fallback = authorDiv.querySelector('.author-fallback');
      if (fallback) {
        fallback.style.display = 'inline-flex';
        if (img) img.style.display = 'none';
      }
    }
  });
}

// Set up category filtering
function setupCategoryFilters() {
  const categoryButtons = document.querySelectorAll('.category-btn');
  const tipCards = document.querySelectorAll('.tip-card');
  
  if (!categoryButtons.length || !tipCards.length) return;
  
  categoryButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');
      
      const category = this.getAttribute('data-category');
      
      // Show/hide cards based on category
      tipCards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-category') === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
      
      // Reset pagination to page 1 when filtering
      const pageButtons = document.querySelectorAll('.page-btn');
      if (pageButtons.length) {
        pageButtons.forEach(btn => btn.classList.remove('active'));
        pageButtons[0].classList.add('active');
      }
    });
  });
}

// Set up like buttons
function setupLikeButtons() {
  const likeButtons = document.querySelectorAll('.like-btn');
  
  likeButtons.forEach(button => {
    button.addEventListener('click', function() {
      this.classList.toggle('active');
      const icon = this.querySelector('i');
      
      if (this.classList.contains('active')) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        // Get current like count
        let count = parseInt(this.textContent.trim()) || 0;
        this.innerHTML = `<i class="fas fa-heart"></i> ${count + 1}`;
      } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        // Get current like count
        let count = parseInt(this.textContent.trim()) || 0;
        this.innerHTML = `<i class="far fa-heart"></i> ${count - 1}`;
      }
    });
  });
}

// Set up bookmark buttons
function setupBookmarkButtons() {
  const bookmarkButtons = document.querySelectorAll('.bookmark-btn');
  
  bookmarkButtons.forEach(button => {
    button.addEventListener('click', function() {
      this.classList.toggle('active');
      const icon = this.querySelector('i');
      
      if (this.classList.contains('active')) {
        icon.classList.remove('far');
        icon.classList.add('fas');
      } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
      }
    });
  });
}

// Set up search functionality
function setupSearchFunctionality() {
  const searchInput = document.getElementById('searchTips');
  const tipCards = document.querySelectorAll('.tip-card');
  
  if (!searchInput || !tipCards.length) return;
  
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    
    tipCards.forEach(card => {
      const title = card.querySelector('.tip-title')?.textContent.toLowerCase() || '';
      const description = card.querySelector('.tip-description')?.textContent.toLowerCase() || '';
      
      if (title.includes(searchTerm) || description.includes(searchTerm)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
    
    // Reset pagination when searching
    const pageButtons = document.querySelectorAll('.page-btn');
    if (pageButtons.length && searchTerm.length > 0) {
      pageButtons.forEach(btn => btn.classList.remove('active'));
      pageButtons[0].classList.add('active');
    }
  });
}

// Set up tip of the day rotation
function setupTipRotation() {
  const tips = [
    "Stay hydrated by drinking at least 8 glasses of water daily. Proper hydration improves energy levels, brain function, and helps maintain overall health.",
    "Practice the 5-5-5 breathing technique when feeling stressed: inhale for 5 seconds, hold for 5 seconds, and exhale for 5 seconds.",
    "Incorporate at least 30 minutes of moderate physical activity into your daily routine to boost mood and energy levels.",
    "Aim to eat 5 servings of different colored fruits and vegetables each day to get a wide range of nutrients.",
    "Set a consistent sleep schedule by going to bed and waking up at the same time every day, even on weekends.",
    "Take short breaks every hour when working at a computer to rest your eyes and stretch your muscles.",
    "Practice gratitude by writing down three things you're thankful for each day to improve mental well-being."
  ];
  
  const tipOfDay = document.getElementById('tipOfDay');
  const newTipBtn = document.getElementById('newTipBtn');
  
  if (!tipOfDay || !newTipBtn) return;
  
  // Set initial tip if not already set
  if (!tipOfDay.textContent.trim()) {
    tipOfDay.textContent = tips[0];
  }
  
  newTipBtn.addEventListener('click', function() {
    // Get a random tip different from the current one
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * tips.length);
    } while (tips[randomIndex] === tipOfDay.textContent && tips.length > 1);
    
    // Update tip with animation
    tipOfDay.style.opacity = 0;
    
    setTimeout(() => {
      tipOfDay.textContent = tips[randomIndex];
      tipOfDay.style.opacity = 1;
    }, 300);
  });
}

// Set up newsletter form
function setupNewsletterForm() {
  const newsletterForm = document.querySelector('.newsletter-form');
  
  if (!newsletterForm) return;
  
  newsletterForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const emailInput = this.querySelector('.newsletter-input');
    
    if (!emailInput || !emailInput.value) {
      alert("Please enter a valid email address.");
      return;
    }
    
    const email = emailInput.value;
    
    // Simulated submission
    alert(`Thank you! Your email "${email}" has been added to our weekly health tips newsletter.`);
    this.reset();
  });
}

// Set up pagination
function setupPagination() {
  const pageButtons = document.querySelectorAll('.page-btn');
  const tipsContainer = document.getElementById('tipsContainer');
  const itemsPerPage = 6; // Show 6 cards per page
  
  if (!pageButtons.length || !tipsContainer) return;
  
  // Initially hide cards beyond the first page
  const allCards = tipsContainer.querySelectorAll('.tip-card');
  const totalPages = Math.ceil(allCards.length / itemsPerPage);
  
  // Initialize pagination numbers
  for (let i = 0; i < pageButtons.length; i++) {
    if (!pageButtons[i].querySelector('i')) { // Skip the ellipsis button
      if (i < 3 || i === pageButtons.length - 1) {
        if (i < totalPages) {
          pageButtons[i].textContent = i + 1;
        } else {
          pageButtons[i].style.display = 'none';
        }
      }
    }
  }
  
  // Make sure last button shows correct page number
  if (pageButtons[pageButtons.length - 1]) {
    if (totalPages > 3) {
      pageButtons[pageButtons.length - 1].textContent = totalPages;
    } else {
      pageButtons[pageButtons.length - 1].style.display = 'none';
      if (pageButtons[pageButtons.length - 2] && pageButtons[pageButtons.length - 2].querySelector('i')) {
        pageButtons[pageButtons.length - 2].style.display = 'none';
      }
    }
  }
  
  // Function to show cards for current page
  function showPage(pageNumber) {
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    allCards.forEach((card, index) => {
      const cardCategory = card.getAttribute('data-category');
      const activeCategory = document.querySelector('.category-btn.active').getAttribute('data-category');
      
      if (activeCategory === 'all' || cardCategory === activeCategory) {
        if (index >= startIndex && index < endIndex) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      } else {
        card.style.display = 'none';
      }
    });
  }
  
  // Show page 1 initially
  showPage(1);
  
  // Setup click handlers
  pageButtons.forEach(button => {
    button.addEventListener('click', function() {
      if (this.querySelector('i')) return; // Skip if it's the ellipsis button
      
      pageButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      const pageNumber = parseInt(this.textContent);
      showPage(pageNumber);
      
      // Scroll to the top of the tips container
      tipsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// Set up sharing buttons
function setupSharingButtons() {
  const shareTipBtn = document.getElementById('shareTipBtn');
  const saveTipBtn = document.getElementById('saveTipBtn');
  
  if (shareTipBtn) {
    shareTipBtn.addEventListener('click', function() {
      // In a real app, this would open native sharing options
      alert("Sharing functionality would open native share dialog in a real app!");
    });
  }
  
  if (saveTipBtn) {
    saveTipBtn.addEventListener('click', function() {
      const savedIcon = this.querySelector('i');
      
      if (savedIcon.classList.contains('far')) {
        savedIcon.classList.remove('far');
        savedIcon.classList.add('fas');
        alert("Tip saved to your favorites!");
      } else {
        savedIcon.classList.remove('fas');
        savedIcon.classList.add('far');
        alert("Tip removed from your favorites.");
      }
    });
  }
}

// Style cards to match design
function styleToMatchDesign() {
  // Set uniform height for cards
  const cards = document.querySelectorAll('.tip-card');
  cards.forEach(card => {
    card.style.height = 'auto';
  });
  
  // Style pagination to match design
  const pagination = document.querySelector('.tips-pagination');
  if (pagination) {
    const buttons = pagination.querySelectorAll('.page-btn');
    buttons.forEach((button, index) => {
      if (index === 0) {
        button.style.backgroundColor = '#2a9d8f';
        button.style.color = 'white';
      } else {
        button.style.backgroundColor = 'white';
        button.style.color = '#666';
        if (button.querySelector('i')) {
          button.style.fontSize = '12px';
        }
      }
    });
  }
  
  // Ensure card categories are properly styled
  const categories = document.querySelectorAll('.tip-category');
  categories.forEach(category => {
    const text = category.textContent.trim().toLowerCase();
    let color = '#2a9d8f'; // default
    
    if (text === 'nutrition') {
      color = '#2a9d8f';
    } else if (text === 'fitness') {
      color = '#2a9d8f';
    } else if (text === 'mental health') {
      color = '#2a9d8f';
    } else if (text === 'sleep') {
      color = '#2a9d8f';
    }
    
    category.style.backgroundColor = color;
  });
} 