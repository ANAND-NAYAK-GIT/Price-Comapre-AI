// =======================
// Global variables
// =======================
let productsData = [];
let currentSearchTerm = "";
let currentCategory = "all";


// =======================
// Load products data
// =======================
async function loadProductsData() {
  try {
    const response = await fetch("./data.json");
    const data = await response.json();
    productsData = data.products;
    console.log("Products loaded:", productsData.length);

    // Handle search params on comparison page
    if (window.location.pathname.includes("comparison.html")) {
      const urlParams = new URLSearchParams(window.location.search);
      const searchTerm = urlParams.get("search");
      const category = urlParams.get("category");

      if (searchTerm) {
        document.getElementById("searchInput").value = searchTerm;
        performSearch(searchTerm);
      } else if (category) {
        filterByCategory(category);
      }
    }
  } catch (error) {
    console.error("Error loading products:", error);
  }
}


// =======================
// Levenshtein Distance
// =======================
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}


// =======================
// Smart Search Engine
// =======================
function smartSearch(query) {
  if (!query || query.trim() === "") return [];

  const searchTerms = query.toLowerCase().trim().split(" ");
  const results = [];

  productsData.forEach((product) => {
    const productName = product.name.toLowerCase();
    const productCategory = product.category.toLowerCase();
    let score = 0;

    searchTerms.forEach((term) => {
      if (productName.includes(term) || productCategory.includes(term)) {
        score += 10;
      }

      const words = productName.split(" ");
      words.forEach((word) => {
        if (word.startsWith(term) || term.startsWith(word)) score += 5;

        const distance = levenshteinDistance(term, word);
        if (distance <= 2 && term.length > 3) score += 3;
      });
    });

    const cleanMatch = searchTerms.some(
      (term) => productName.includes(term) || productCategory.includes(term)
    );

    if (score > 0 && cleanMatch) {
      results.push({ ...product, score });
    }
  });

  results.sort((a, b) => b.score - a.score);

  return results;
}


// =======================
// Group products
// =======================
function groupProductsByName(products) {
  const grouped = {};

  products.forEach((product) => {
    if (!grouped[product.name]) {
      grouped[product.name] = {
        name: product.name,
        category: product.category,
        image: product.image,
        vendors: [],
      };
    }

    grouped[product.name].vendors.push({
      vendor: product.vendor,
      price: product.price,
      rating: product.rating ?? 0,
      id: product.id,
    });
  });

  Object.values(grouped).forEach((p) =>
    p.vendors.sort((a, b) => a.price - b.price)
  );

  return Object.values(grouped);
}


// =======================
// AI Recommendations
// =======================
function getAIRecommendations(products, limit = 6) {
  if (products.length === 0) return [];

  const categories = [...new Set(products.map((p) => p.category))];
  const recommendations = [];

  const currentNames = new Set(products.map((p) => p.name));

  categories.forEach((category) => {
    const similar = productsData.filter(
      (p) => p.category === category && !currentNames.has(p.name)
    );

    const grouped = groupProductsByName(similar);
    recommendations.push(...grouped);
  });

  return recommendations
    .filter((rec, idx, arr) => idx === arr.findIndex((r) => r.name === rec.name))
    .slice(0, limit);
}


// =======================
// Price formatter
// =======================
function formatPrice(price) {
  return "₹" + price.toLocaleString("en-IN");
}


// =======================
// Product Card
// =======================
function createProductCard(product) {
  const lowestPrice = Math.min(...product.vendors.map((v) => v.price));
  const avgRating = (
    product.vendors.reduce((sum, v) => sum + (v.rating ?? 0), 0) /
    product.vendors.length
  ).toFixed(1);

  let vendorCardsHTML = "";

  product.vendors.forEach((vendor) => {
    const isBest = vendor.price === lowestPrice;
    const badge = isBest
      ? '<span class="best-price-badge"><i class="fas fa-trophy me-1"></i>Best Price</span>'
      : "";

    vendorCardsHTML += `
      <div class="vendor-card ${isBest ? "best-price" : ""}">
          ${badge}
          <div class="vendor-name">
              <i class="fas fa-store me-2"></i>${vendor.vendor}
          </div>
          <div class="vendor-price">${formatPrice(vendor.price)}</div>
          <div class="vendor-rating">
              <i class="fas fa-star"></i> ${(vendor.rating ?? 0).toFixed(1)}
          </div>
          <a href="#" class="vendor-link" onclick="event.preventDefault();">
              <i class="fas fa-shopping-cart me-2"></i>View Deal
          </a>
      </div>
    `;
  });

  return `
    <div class="col-12">
      <div class="product-group">
        <div class="product-header">
          <h5>${product.name}</h5>
          <div class="product-meta">
            <span><i class="fas fa-tag me-1"></i>${product.category}</span>
            <span><i class="fas fa-star me-1"></i>${avgRating} avg rating</span>
            <span><i class="fas fa-store me-1"></i>${product.vendors.length} vendors</span>
          </div>
        </div>

        <!-- FIXED IMAGE (No Crashes) -->
        <img 
          src="https://via.placeholder.com/200x200?text=No+Image" 
          alt="${product.name}" 
          class="product-image"
        >

        <div class="vendor-cards">${vendorCardsHTML}</div>
      </div>
    </div>
  `;
}


// =======================
// Recommendation Card
// =======================
function createRecommendationCard(product) {
  const lowestPrice = Math.min(...product.vendors.map((v) => v.price));

  return `
    <div class="col-md-4 col-sm-6">
      <div class="recommendation-card">
        <!-- FIXED IMAGE -->
        <img 
          src="https://via.placeholder.com/200x200?text=No+Image"
          alt="${product.name}"
        >
        <h6>${product.name}</h6>
        <div class="price">${formatPrice(lowestPrice)}</div>
        <small class="text-muted">${product.category}</small>
        <br>
        <a href="comparison.html?search=${encodeURIComponent(product.name)}"
           class="btn btn-sm btn-outline-primary mt-2">
            Compare Prices
        </a>
      </div>
    </div>
  `;
}


// =======================
// DISPLAY RESULTS
// =======================
function displayResults(products) {
  const resultsContainer = document.getElementById("resultsContainer");
  const searchInfo = document.getElementById("searchInfo");
  const noResults = document.getElementById("noResults");
  const recSection = document.getElementById("recommendationsSection");

  if (!resultsContainer) return;

  if (products.length === 0) {
    resultsContainer.innerHTML = "";
    noResults.style.display = "block";
    searchInfo.style.display = "none";
    recSection.style.display = "none";
    return;
  }

  const grouped = groupProductsByName(products);

  resultsContainer.innerHTML = grouped
    .map((p) => createProductCard(p))
    .join("");

  document.getElementById("searchTerm").textContent = currentSearchTerm;
  document.getElementById("resultCount").textContent = grouped.length;

  searchInfo.style.display = "block";
  noResults.style.display = "none";

  const recommendations = getAIRecommendations(products);

  if (recommendations.length > 0) {
    document.getElementById("recommendationsContainer").innerHTML =
      recommendations.map((r) => createRecommendationCard(r)).join("");
    recSection.style.display = "block";
  } else {
    recSection.style.display = "none";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}


// =======================
// Perform Search
// =======================
function performSearch(query) {
  currentSearchTerm = query;
  const results = smartSearch(query);
  displayResults(results);
}


// =======================
// Category Mapping
// =======================
const CATEGORY_MAP = {
  Smartphones: ["Smartphones", "Mobiles", "Phones"],
  Laptops: ["Laptops", "Computers", "Electronics"],
  Audio: ["Audio", "Headphones", "Earbuds", "Speakers"],
  Cameras: ["Cameras", "Camera"],
  Gaming: ["Gaming", "Consoles"],
  Wearables: ["Wearables", "Smartwatches", "Fitness Bands", "Watches"],
  all: "all",
};


// =======================
// Filter by Category
// =======================
function filterByCategory(category) {
  currentCategory = category;

  if (category === "all") {
    displayResults(productsData);
    return;
  }

  const mapped = CATEGORY_MAP[category];
  if (!mapped) {
    displayResults([]);
    return;
  }

  const filtered = productsData.filter((p) => mapped.includes(p.category));

  currentSearchTerm = category;
  displayResults(filtered);
}


// =======================
// Event Listeners
// =======================
function initializeEventListeners() {
  const searchBtn = document.getElementById("searchBtn");

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const query = document.getElementById("searchInput").value.trim();

      if (query) {
        if (window.location.pathname.includes("comparison.html")) {
          performSearch(query);
        } else {
          window.location.href = `comparison.html?search=${encodeURIComponent(
            query
          )}`;
        }
      }
    });
  }

  const searchInput = document.getElementById("searchInput");

  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const query = searchInput.value.trim();

        if (query) {
          if (window.location.pathname.includes("comparison.html")) {
            performSearch(query);
          } else {
            window.location.href = `comparison.html?search=${encodeURIComponent(
              query
            )}`;
          }
        }
      }
    });
  }

  const categoryBtns = document.querySelectorAll(".category-btn");

  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.getAttribute("data-category");

      if (window.location.pathname.includes("comparison.html")) {
        filterByCategory(category);

        categoryBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      } else {
        window.location.href = `comparison.html?category=${encodeURIComponent(
          category
        )}`;
      }
    });
  });
}


// =======================
// Initialize
// =======================
document.addEventListener("DOMContentLoaded", () => {
  loadProductsData();
  initializeEventListeners();
});
